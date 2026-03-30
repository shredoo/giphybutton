/**
 * @name GiphyButton
 * @author shredoo
 * @description vibe coded trash with gemini to add a custom giphy button and search UI to discord via betterdiscord
 * @version 3.0.0
 */

module.exports = class GiphyButton {
    constructor() {
        this.UI = BdApi.UI;
        this.DOM = BdApi.DOM;
        this.observer = null;
        
        // PASTE YOUR GIPHY API KEY HERE
        this.GIPHY_API_KEY = "INSERT_KEY_HERE"; 
        
        this.popupId = "giphy-search-popup";
        this.styleId = "giphy-plugin-styles";
    }

    start() {
        this.injectStyles();
        
        this.observer = new MutationObserver(() => {
            this.injectButton();
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
        
        this.injectButton();
        this.buildPopupUI();
        console.log("Giphy Plugin v3 started.");
    }

    injectStyles() {
        // We use BetterDiscord's DOM API to inject custom CSS for our popup
        const css = `
            #${this.popupId} {
                display: none;
                position: absolute;
                bottom: 60px; /* Sits right above the chat bar */
                right: 20px;
                width: 320px;
                height: 400px;
                background-color: var(--background-secondary);
                border-radius: 8px;
                box-shadow: var(--elevation-stroke), var(--elevation-high);
                z-index: 9999;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid var(--background-tertiary);
            }
            #${this.popupId}.show {
                display: flex;
            }
            .giphy-header {
                padding: 12px;
                background-color: var(--background-tertiary);
                display: flex;
                gap: 8px;
            }
            .giphy-search-input {
                flex-grow: 1;
                /* Use Discord's specific input variable, with a dark-grey fallback */
                background-color: var(--input-background, #1e1f22); 
                color: var(--text-normal, #dbdee1);
                /* Add a subtle border so it's always visible */
                border: 1px solid var(--background-modifier-accent, #4e5058); 
                border-radius: 4px;
                padding: 8px;
                outline: none;
                transition: border-color 0.2s ease;
            }
            /* Add a nice blue glow when you click into the box */
            .giphy-search-input:focus {
                border-color: var(--text-link, #00a8fc); 
            }
            .giphy-results {
                flex-grow: 1;
                overflow-y: auto;
                padding: 8px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .giphy-gif {
                width: 100%;
                border-radius: 4px;
                cursor: pointer;
                transition: transform 0.1s;
            }
            .giphy-gif:hover {
                transform: scale(1.05);
                box-shadow: 0 0 5px rgba(0,0,0,0.5);
            }
            .giphy-watermark {
                text-align: center;
                font-size: 10px;
                color: var(--text-muted);
                padding: 4px;
                background-color: var(--background-secondary-alt);
            }
        `;
        this.DOM.addStyle(this.styleId, css);
    }

    injectButton() {
        const buttonContainer = document.querySelector('div[class*="channelTextArea"] div[class*="buttons_"]');
        if (!buttonContainer || document.getElementById("giphy-dom-btn")) return;

        const giphyBtn = document.createElement("div");
        giphyBtn.id = "giphy-dom-btn";
        giphyBtn.innerText = "GIF+";
        
        giphyBtn.style.cursor = "pointer";
        giphyBtn.style.padding = "0 8px";
        giphyBtn.style.display = "flex";
        giphyBtn.style.alignItems = "center";
        giphyBtn.style.fontWeight = "800";
        giphyBtn.style.fontSize = "13px";
        giphyBtn.style.color = "var(--interactive-normal)";
        giphyBtn.style.transition = "color 0.2s ease";

        giphyBtn.onmouseenter = () => giphyBtn.style.color = "var(--interactive-hover)";
        giphyBtn.onmouseleave = () => giphyBtn.style.color = "var(--interactive-normal)";
        
        // Toggle the popup visibility when clicked
        giphyBtn.onclick = () => {
            const popup = document.getElementById(this.popupId);
            if (popup) {
                popup.classList.toggle("show");
                if (popup.classList.contains("show")) {
                    document.getElementById("giphy-search-box").focus();
                    this.fetchGifs(""); // Load trending GIFs by default
                }
            }
        };

        buttonContainer.insertBefore(giphyBtn, buttonContainer.firstChild);
    }

    buildPopupUI() {
        // Create the popup container if it doesn't exist
        if (document.getElementById(this.popupId)) return;

        const popup = document.createElement("div");
        popup.id = this.popupId;

        // Header with search box
        const header = document.createElement("div");
        header.className = "giphy-header";
        
        const searchInput = document.createElement("input");
        searchInput.id = "giphy-search-box";
        searchInput.className = "giphy-search-input";
        searchInput.placeholder = "Search Giphy...";
        
        // Listen for typing in the search box
        let typingTimer;
        searchInput.addEventListener("keyup", () => {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                this.fetchGifs(searchInput.value);
            }, 500); // Wait 500ms after they stop typing before fetching
        });

        header.appendChild(searchInput);

        // Results area
        const results = document.createElement("div");
        results.id = "giphy-results-container";
        results.className = "giphy-results";

        // Footer/Watermark (Giphy requires this for API use)
        const watermark = document.createElement("div");
        watermark.className = "giphy-watermark";
        watermark.innerText = "Powered by GIPHY";

        popup.appendChild(header);
        popup.appendChild(results);
        popup.appendChild(watermark);

        // Append to the app mount so it sits over everything
        document.querySelector("#app-mount").appendChild(popup);
    }

    async fetchGifs(query) {
        if (this.GIPHY_API_KEY === "YOUR_API_KEY_HERE") {
            this.UI.showToast("Please add your Giphy API key to the plugin file!", { type: "error" });
            return;
        }

        const resultsContainer = document.getElementById("giphy-results-container");
        resultsContainer.innerHTML = "<p style='color: white; text-align: center; width: 100%; grid-column: span 2;'>Loading...</p>";

        try {
            // If query is empty, fetch trending, otherwise search
            const endpoint = query.trim() === "" 
                ? `https://api.giphy.com/v1/gifs/trending?api_key=${this.GIPHY_API_KEY}&limit=20`
                : `https://api.giphy.com/v1/gifs/search?api_key=${this.GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`;

            const response = await fetch(endpoint);
            const data = await response.json();

            resultsContainer.innerHTML = ""; // Clear loading text

            if (data.data.length === 0) {
                resultsContainer.innerHTML = "<p style='color: white; text-align: center; width: 100%; grid-column: span 2;'>No GIFs found.</p>";
                return;
            }

            // Populate the grid with images
            data.data.forEach(gif => {
                const img = document.createElement("img");
                // Use a smaller version for the grid to save bandwidth
                img.src = gif.images.fixed_width_small.url; 
                img.className = "giphy-gif";
                
                // When clicked, copy the original full-size URL to clipboard
                img.onclick = () => {
                    const fullUrl = gif.images.original.url;
                    DiscordNative.clipboard.copy(fullUrl);
                    this.UI.showToast("GIF URL copied! Paste it in chat.", { type: "success" });
                    document.getElementById(this.popupId).classList.remove("show"); // Close menu
                };
                
                resultsContainer.appendChild(img);
            });

        } catch (error) {
            console.error("Giphy Plugin Fetch Error:", error);
            resultsContainer.innerHTML = "<p style='color: red; text-align: center; width: 100%; grid-column: span 2;'>Failed to load GIFs.</p>";
        }
    }

    stop() {
        if (this.observer) this.observer.disconnect();
        this.DOM.removeStyle(this.styleId);
        
        const existingBtn = document.getElementById("giphy-dom-btn");
        if (existingBtn) existingBtn.remove();

        const popup = document.getElementById(this.popupId);
        if (popup) popup.remove();
        
        console.log("Giphy Plugin stopped and cleaned up.");
    }
};
