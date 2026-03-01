console.log("[SEMD] Background service worker started");

const API_ENDPOINT = "http://localhost:8000/api/v1/predict/predict";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CHECK_URL") {
        checkUrlWithAPI(message.url)
            .then(result => sendResponse(result))
            .catch(error => {
                console.error("[SEMD] API error:", error);
                sendResponse({ isMalicious: false, error: error.message });
            });
        return true;
    }
});

async function checkUrlWithAPI(url) {
    console.log(`[SEMD] Checking with API: ${url}`);
    
    try {
        const config = await getConfig();
        
        const response = await fetch(config.apiEndpoint || API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.apiKey || ""
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        const result = {
            url: url,
            isMalicious: data.result?.is_malicious ?? false,
            accuracy: data.result?.accurate ?? 0,
            suggested: data.result?.suggested ?? "unknown",
            timestamp: new Date().toISOString()
        };

        console.log("[SEMD] API result:", result);
        
        await saveToHistory(result);
        
        return result;
    } catch (error) {
        console.error("[SEMD] Failed to check URL:", error);
        return {
            url: url,
            isMalicious: false,
            accuracy: 0,
            error: error.message
        };
    }
}

async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["apiEndpoint", "apiKey"], (result) => {
            resolve({
                apiEndpoint: result.apiEndpoint || API_ENDPOINT,
                apiKey: result.apiKey || ""
            });
        });
    });
}

async function saveToHistory(result) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["scanHistory"], (data) => {
            const history = data.scanHistory || [];
            history.unshift(result);
            
            const trimmedHistory = history.slice(0, 100);
            
            chrome.storage.local.set({ scanHistory: trimmedHistory }, resolve);
        });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    console.log("[SEMD] Extension installed");
    chrome.storage.local.set({
        apiEndpoint: API_ENDPOINT,
        apiKey: "",
        scanHistory: []
    });
});