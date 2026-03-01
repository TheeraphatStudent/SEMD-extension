(function() {
    'use strict';

    console.log("[SEMD] Content script loaded");

    class Blocker {
        constructor() {
            this.currentUrl = "";
            this.observer = null;
            this.init();
        }

        init() {
            this.currentUrl = this.getCurrentUrl();
            this.checkUrl(this.currentUrl);
            this.startUrlMonitor();
        }

        getCurrentUrl() {
            return window.location.href;
        }

        async checkUrl(url) {
            console.log(`[SEMD] Checking URL: ${url}`);
            
            chrome.runtime.sendMessage({
                type: "CHECK_URL",
                url: url
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[SEMD] Message error:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.isMalicious) {
                    this.showWarning(url, response);
                }
            });
        }

        startUrlMonitor() {
            window.addEventListener("popstate", () => this.onUrlChange());
            window.addEventListener("hashchange", () => this.onUrlChange());

            const originalPushState = history.pushState.bind(history);
            const originalReplaceState = history.replaceState.bind(history);

            history.pushState = (...args) => {
                originalPushState(...args);
                this.onUrlChange();
            };

            history.replaceState = (...args) => {
                originalReplaceState(...args);
                this.onUrlChange();
            };

            this.observer = new MutationObserver(() => {
                if (this.currentUrl !== window.location.href) {
                    this.onUrlChange();
                }
            });

            if (document.body) {
                this.observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        }

        onUrlChange() {
            const newUrl = this.getCurrentUrl();
            if (newUrl !== this.currentUrl) {
                console.log(`[SEMD] URL changed: ${this.currentUrl} -> ${newUrl}`);
                this.currentUrl = newUrl;
                this.checkUrl(newUrl);
            }
        }

        showWarning(url, data) {
            const overlay = document.createElement("div");
            overlay.id = "semd-warning-overlay";
            overlay.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.9);
                    z-index: 2147483647;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">
                    <div style="
                        background: #1a1a2e;
                        border: 2px solid #e74c3c;
                        border-radius: 16px;
                        padding: 40px;
                        max-width: 500px;
                        text-align: center;
                        color: white;
                    ">
                        <div style="font-size: 64px; margin-bottom: 20px;">&#9888;</div>
                        <h1 style="color: #e74c3c; margin: 0 0 16px 0; font-size: 28px;">Malicious URL Detected</h1>
                        <p style="color: #ccc; margin: 0 0 20px 0; font-size: 14px; word-break: break-all;">${url}</p>
                        <p style="color: #fff; margin: 0 0 24px 0;">
                            Accuracy: <strong style="color: #e74c3c;">${((data.accuracy || 0) * 100).toFixed(1)}%</strong>
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button id="semd-go-back" style="
                                background: #27ae60;
                                color: white;
                                border: none;
                                padding: 12px 24px;
                                border-radius: 8px;
                                font-size: 16px;
                                cursor: pointer;
                            ">Go Back to Safety</button>
                            <button id="semd-proceed" style="
                                background: transparent;
                                color: #999;
                                border: 1px solid #666;
                                padding: 12px 24px;
                                border-radius: 8px;
                                font-size: 16px;
                                cursor: pointer;
                            ">Proceed Anyway</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            document.getElementById("semd-go-back").addEventListener("click", () => {
                history.back();
                overlay.remove();
            });

            document.getElementById("semd-proceed").addEventListener("click", () => {
                overlay.remove();
            });
        }

        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => new Blocker());
    } else {
        new Blocker();
    }
})();