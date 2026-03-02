var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  const DEFAULT_API_ENDPOINT = "http://localhost:8000/api/v1/predict/predict";
  const MAX_HISTORY_SIZE = 100;
  const ACCESS_CODE_LENGTH = 6;
  async function checkUrlWithAPI(url, config) {
    const endpoint = config.apiEndpoint || DEFAULT_API_ENDPOINT;
    console.log(`[SEMD] Checking with API: ${url}`);
    try {
      const requestBody = { url };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey || ""
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      const data = await response.json();
      const result2 = {
        url,
        isMalicious: data.result?.is_malicious ?? false,
        accuracy: data.result?.accurate ?? 0,
        suggested: data.result?.suggested ?? "unknown",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log("[SEMD] API result:", result2);
      return result2;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[SEMD] Failed to check URL:", errorMessage);
      return {
        url,
        isMalicious: false,
        accuracy: 0,
        suggested: "error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: errorMessage
      };
    }
  }
  const MessageType = {
    CHECK_URL: "CHECK_URL",
    GET_AUTH_STATUS: "GET_AUTH_STATUS",
    VALIDATE_ACCESS_CODE: "VALIDATE_ACCESS_CODE",
    LOGOUT: "LOGOUT"
  };
  const DEFAULT_STORAGE = {
    accessCode: null,
    apiEndpoint: "http://localhost:8000/api/v1/predict/predict",
    apiKey: "",
    scanHistory: [],
    isAuthenticated: false
  };
  const storage = {
    get: async (keys) => {
      const result2 = await browser.storage.local.get(keys);
      const keyArray = Array.isArray(keys) ? keys : [keys];
      const merged = {};
      for (const key of keyArray) {
        merged[key] = result2[key] ?? DEFAULT_STORAGE[key];
      }
      return merged;
    },
    set: async (items) => {
      await browser.storage.local.set(items);
    },
    remove: async (keys) => {
      await browser.storage.local.remove(keys);
    },
    clear: async () => {
      await browser.storage.local.clear();
    },
    getAll: async () => {
      const result2 = await browser.storage.local.get(null);
      return {
        ...DEFAULT_STORAGE,
        ...result2
      };
    },
    initialize: async () => {
      const current = await storage.getAll();
      const updates = {};
      for (const key of Object.keys(DEFAULT_STORAGE)) {
        if (current[key] === void 0) {
          updates[key] = DEFAULT_STORAGE[key];
        }
      }
      if (Object.keys(updates).length > 0) {
        await storage.set(updates);
      }
    }
  };
  async function saveToHistory(result2) {
    const { scanHistory } = await storage.get("scanHistory");
    const history = scanHistory || [];
    history.unshift(result2);
    const trimmedHistory = history.slice(0, MAX_HISTORY_SIZE);
    await storage.set({ scanHistory: trimmedHistory });
    console.log("[SEMD] Saved to history, total entries:", trimmedHistory.length);
  }
  async function getConfig() {
    const { apiEndpoint, apiKey } = await storage.get(["apiEndpoint", "apiKey"]);
    return {
      apiEndpoint: apiEndpoint || DEFAULT_API_ENDPOINT,
      apiKey: apiKey || ""
    };
  }
  async function getAuthStatus() {
    const { accessCode, isAuthenticated } = await storage.get(["accessCode", "isAuthenticated"]);
    return {
      isAuthenticated: isAuthenticated && !!accessCode,
      accessCode: accessCode || null
    };
  }
  async function validateAccessCode(code) {
    console.log("[SEMD] Validating access code");
    if (!code || code.length !== ACCESS_CODE_LENGTH) {
      console.log("[SEMD] Invalid access code format");
      return false;
    }
    const isValid = /^[A-Za-z0-9]{6}$/.test(code);
    if (isValid) {
      await storage.set({
        accessCode: code,
        isAuthenticated: true
      });
      console.log("[SEMD] Access code validated and stored");
      return true;
    }
    console.log("[SEMD] Access code validation failed");
    return false;
  }
  async function logout() {
    await storage.set({
      accessCode: null,
      isAuthenticated: false
    });
    console.log("[SEMD] User logged out");
  }
  async function requireAuth() {
    const { isAuthenticated } = await getAuthStatus();
    return isAuthenticated;
  }
  const definition = defineBackground(() => {
    console.log("[SEMD] Background service worker started");
    let popupWindowId = null;
    browser.action.onClicked.addListener(async () => {
      if (popupWindowId !== null) {
        try {
          const existingWindow = await browser.windows.get(popupWindowId);
          await browser.windows.update(existingWindow.id, { focused: true });
          return;
        } catch {
          popupWindowId = null;
        }
      }
      const window = await browser.windows.create({
        url: browser.runtime.getURL("popup.html"),
        type: "popup",
        width: 360,
        height: 520,
        focused: true
      });
      popupWindowId = window.id;
    });
    browser.windows.onRemoved.addListener((windowId) => {
      if (windowId === popupWindowId) {
        popupWindowId = null;
      }
    });
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const msg = message;
      handleMessage(msg).then((response) => sendResponse(response)).catch((error) => {
        console.error("[SEMD] Message handler error:", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    });
    browser.runtime.onInstalled.addListener(async () => {
      console.log("[SEMD] Extension installed");
      await storage.initialize();
    });
  });
  async function handleMessage(message, _sender) {
    switch (message.type) {
      case MessageType.CHECK_URL: {
        const isAuthed = await requireAuth();
        if (!isAuthed) {
          return { success: false, error: "Not authenticated" };
        }
        const config = await getConfig();
        const result2 = await checkUrlWithAPI(message.url, config);
        await saveToHistory(result2);
        return {
          success: true,
          data: { result: result2 }
        };
      }
      case MessageType.GET_AUTH_STATUS: {
        const authStatus = await getAuthStatus();
        return {
          success: true,
          data: authStatus
        };
      }
      case MessageType.VALIDATE_ACCESS_CODE: {
        const isValid = await validateAccessCode(message.code);
        return {
          success: isValid,
          error: isValid ? void 0 : "Invalid access code"
        };
      }
      case MessageType.LOGOUT: {
        await logout();
        return { success: true };
      }
      default:
        return { success: false, error: "Unknown message type" };
    }
  }
  function initPlugins() {
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
    else method("[wxt]", ...args);
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "ws://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({
        type: "custom",
        event,
        payload
      }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") ws?.dispatchEvent(new CustomEvent(message.event, { detail: message.data }));
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    if (browser.runtime.getManifest().manifest_version == 2) reloadContentScriptMv2();
    else reloadContentScriptMv3(payload);
  }
  async function reloadContentScriptMv3({ registration, contentScript }) {
    if (registration === "runtime") await reloadRuntimeContentScriptMv3(contentScript);
    else await reloadManifestContentScriptMv3(contentScript);
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{
        ...contentScript,
        id,
        css: contentScript.css ?? []
      }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{
        ...contentScript,
        id,
        css: contentScript.css ?? []
      }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
      const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log("Content script is not registered yet, nothing to reload", contentScript);
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map((match) => new MatchPattern(match));
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(matchingTabs.map(async (tab) => {
      try {
        await browser.tabs.reload(tab.id);
      } catch (err) {
        logger.warn("Failed to reload tab:", err);
      }
    }));
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener("open", () => ws2.sendCustom("wxt:background-initialized"));
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") browser.runtime.reload();
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) console.warn("The background's main() function return a promise, but it must be synchronous");
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  var background_entrypoint_default = result;
  return background_entrypoint_default;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9zcmMvdXRpbHMvY29uc3RhbnRzLnRzIiwiLi4vLi4vc3JjL3V0aWxzL2FwaS5zZXJ2aWNlLnRzIiwiLi4vLi4vc3JjL3V0aWxzL3R5cGVzLnRzIiwiLi4vLi4vc3JjL3V0aWxzL3N0b3JhZ2UudHMiLCIuLi8uLi9zcmMvdXRpbHMvaGlzdG9yeS5zZXJ2aWNlLnRzIiwiLi4vLi4vc3JjL3V0aWxzL2NvbmZpZy5zZXJ2aWNlLnRzIiwiLi4vLi4vc3JjL3V0aWxzL2F1dGguc2VydmljZS50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgYnJvd3NlciQxIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcblxuLy8jcmVnaW9uIHNyYy9icm93c2VyLnRzXG4vKipcbiogQ29udGFpbnMgdGhlIGBicm93c2VyYCBleHBvcnQgd2hpY2ggeW91IHNob3VsZCB1c2UgdG8gYWNjZXNzIHRoZSBleHRlbnNpb24gQVBJcyBpbiB5b3VyIHByb2plY3Q6XG4qIGBgYHRzXG4qIGltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG4qXG4qIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4qICAgLy8gLi4uXG4qIH0pXG4qIGBgYFxuKiBAbW9kdWxlIHd4dC9icm93c2VyXG4qL1xuY29uc3QgYnJvd3NlciA9IGJyb3dzZXIkMTtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBicm93c2VyIH07IiwiZXhwb3J0IGNvbnN0IERFRkFVTFRfQVBJX0VORFBPSU5UID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdjEvcHJlZGljdC9wcmVkaWN0JztcbmV4cG9ydCBjb25zdCBFWFRFTlNJT05fTkFNRSA9ICdTRU1EJztcbmV4cG9ydCBjb25zdCBNQVhfSElTVE9SWV9TSVpFID0gMTAwO1xuZXhwb3J0IGNvbnN0IEFDQ0VTU19DT0RFX0xFTkdUSCA9IDY7XG5leHBvcnQgY29uc3QgT1ZFUkxBWV9JRCA9ICdzZW1kLXdhcm5pbmctb3ZlcmxheSc7XG5cbmV4cG9ydCBjb25zdCBUSEFJX0xBQkVMUyA9IHtcbiAgTE9HSU5fVElUTEU6ICdMb2dpbicsXG4gIExPR0lOX1BST01QVDogJ+C4geC4o+C4reC4gSBBY2Nlc3MgY29kZSDguIjguLLguIHguYDguKfguYfguJrguYTguIvguJXguYw6JyxcbiAgTE9HSU5fQlVUVE9OOiAn4LmA4LiC4LmJ4Liy4LmD4LiK4LmJ4LiH4Liy4LiZJyxcbiAgU0FGRTogJ+C4m+C4peC4reC4lOC4oOC4seC4oicsXG4gIERBTkdFUjogJ+C4reC4seC4meC4leC4o+C4suC4oicsXG4gIE9WRVJMQVlfUVVFU1RJT046ICfguITguLjguJPguJXguYnguK3guIfguIHguLLguKPguYDguILguYnguLLguYDguKfguYfguJrguYTguIvguJXguYwnLFxuICBPVkVSTEFZX1BST0NFRUQ6ICfguYPguIrguYgsIOC4lOC4s+C5gOC4meC4tOC4meC4geC4suC4o+C4leC5iOC4rScsXG4gIE9WRVJMQVlfQ0xPU0U6ICfguYTguKHguYgsIOC4m+C4tOC4lOC5gOC4p+C5h+C4muC5hOC4i+C4leC5jOC4meC4teC5iScsXG4gIFNFVFRJTkdTX1RJVExFOiAn4LiV4Lix4LmJ4LiH4LiE4LmI4LiyJyxcbiAgREFTSEJPQVJEX1RJVExFOiAn4Lib4Lij4Liw4Lin4Lix4LiV4Li04LiB4Liy4Lij4Liq4LmB4LiB4LiZJyxcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBDT0xPUlMgPSB7XG4gIENSRUFNX0JHOiAnI0ZGRjlFNicsXG4gIEdPTERfQUNDRU5UOiAnI0Y1RDc2RScsXG4gIEdPTERfQk9SREVSOiAnI0M0QTg0QicsXG4gIFNBRkVfR1JFRU46ICcjNENBRjUwJyxcbiAgU0FGRV9HUkVFTl9EQVJLOiAnIzM4OEUzQycsXG4gIERBTkdFUl9SRUQ6ICcjRjQ0MzM2JyxcbiAgREFOR0VSX1JFRF9EQVJLOiAnI0QzMkYyRicsXG4gIERBTkdFUl9QSU5LX0JHOiAnI0ZGRUJFRScsXG4gIFNBRkVfR1JFRU5fQkc6ICcjRThGNUU5Jyxcbn0gYXMgY29uc3Q7XG4iLCJpbXBvcnQgdHlwZSB7IFByZWRpY3RSZXF1ZXN0LCBQcmVkaWN0UmVzcG9uc2UsIFNjYW5SZXN1bHQsIEFwaUNvbmZpZyB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgREVGQVVMVF9BUElfRU5EUE9JTlQgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1VybFdpdGhBUEkodXJsOiBzdHJpbmcsIGNvbmZpZzogQXBpQ29uZmlnKTogUHJvbWlzZTxTY2FuUmVzdWx0PiB7XG4gIGNvbnN0IGVuZHBvaW50ID0gY29uZmlnLmFwaUVuZHBvaW50IHx8IERFRkFVTFRfQVBJX0VORFBPSU5UO1xuXG4gIGNvbnNvbGUubG9nKGBbU0VNRF0gQ2hlY2tpbmcgd2l0aCBBUEk6ICR7dXJsfWApO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVxdWVzdEJvZHk6IFByZWRpY3RSZXF1ZXN0ID0geyB1cmwgfTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goZW5kcG9pbnQsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAneC1hcGkta2V5JzogY29uZmlnLmFwaUtleSB8fCAnJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXF1ZXN0Qm9keSksXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFQSSByZXNwb25kZWQgd2l0aCBzdGF0dXM6ICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGE6IFByZWRpY3RSZXNwb25zZSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcblxuICAgIGNvbnN0IHJlc3VsdDogU2NhblJlc3VsdCA9IHtcbiAgICAgIHVybCxcbiAgICAgIGlzTWFsaWNpb3VzOiBkYXRhLnJlc3VsdD8uaXNfbWFsaWNpb3VzID8/IGZhbHNlLFxuICAgICAgYWNjdXJhY3k6IGRhdGEucmVzdWx0Py5hY2N1cmF0ZSA/PyAwLFxuICAgICAgc3VnZ2VzdGVkOiBkYXRhLnJlc3VsdD8uc3VnZ2VzdGVkID8/ICd1bmtub3duJyxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG5cbiAgICBjb25zb2xlLmxvZygnW1NFTURdIEFQSSByZXN1bHQ6JywgcmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tTRU1EXSBGYWlsZWQgdG8gY2hlY2sgVVJMOicsIGVycm9yTWVzc2FnZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdXJsLFxuICAgICAgaXNNYWxpY2lvdXM6IGZhbHNlLFxuICAgICAgYWNjdXJhY3k6IDAsXG4gICAgICBzdWdnZXN0ZWQ6ICdlcnJvcicsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGVycm9yOiBlcnJvck1lc3NhZ2UsXG4gICAgfTtcbiAgfVxufVxuIiwiZXhwb3J0IGNvbnN0IE1lc3NhZ2VUeXBlID0ge1xuICBDSEVDS19VUkw6ICdDSEVDS19VUkwnLFxuICBVUkxfUkVTVUxUOiAnVVJMX1JFU1VMVCcsXG4gIFNIT1dfT1ZFUkxBWTogJ1NIT1dfT1ZFUkxBWScsXG4gIERJU01JU1NfT1ZFUkxBWTogJ0RJU01JU1NfT1ZFUkxBWScsXG4gIEdFVF9BVVRIX1NUQVRVUzogJ0dFVF9BVVRIX1NUQVRVUycsXG4gIFZBTElEQVRFX0FDQ0VTU19DT0RFOiAnVkFMSURBVEVfQUNDRVNTX0NPREUnLFxuICBMT0dPVVQ6ICdMT0dPVVQnLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgTWVzc2FnZVR5cGVLZXkgPSBrZXlvZiB0eXBlb2YgTWVzc2FnZVR5cGU7XG5leHBvcnQgdHlwZSBNZXNzYWdlVHlwZVZhbHVlID0gKHR5cGVvZiBNZXNzYWdlVHlwZSlbTWVzc2FnZVR5cGVLZXldO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNjYW5SZXN1bHQge1xuICB1cmw6IHN0cmluZztcbiAgaXNNYWxpY2lvdXM6IGJvb2xlYW47XG4gIGFjY3VyYWN5OiBudW1iZXI7XG4gIHN1Z2dlc3RlZDogc3RyaW5nO1xuICB0aW1lc3RhbXA6IHN0cmluZztcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hlY2tVcmxNZXNzYWdlIHtcbiAgdHlwZTogdHlwZW9mIE1lc3NhZ2VUeXBlLkNIRUNLX1VSTDtcbiAgdXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXJsUmVzdWx0TWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5VUkxfUkVTVUxUO1xuICByZXN1bHQ6IFNjYW5SZXN1bHQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2hvd092ZXJsYXlNZXNzYWdlIHtcbiAgdHlwZTogdHlwZW9mIE1lc3NhZ2VUeXBlLlNIT1dfT1ZFUkxBWTtcbiAgdXJsOiBzdHJpbmc7XG4gIGFjY3VyYWN5OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlzbWlzc092ZXJsYXlNZXNzYWdlIHtcbiAgdHlwZTogdHlwZW9mIE1lc3NhZ2VUeXBlLkRJU01JU1NfT1ZFUkxBWTtcbiAgYWN0aW9uOiAncHJvY2VlZCcgfCAnY2xvc2UnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdldEF1dGhTdGF0dXNNZXNzYWdlIHtcbiAgdHlwZTogdHlwZW9mIE1lc3NhZ2VUeXBlLkdFVF9BVVRIX1NUQVRVUztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWYWxpZGF0ZUFjY2Vzc0NvZGVNZXNzYWdlIHtcbiAgdHlwZTogdHlwZW9mIE1lc3NhZ2VUeXBlLlZBTElEQVRFX0FDQ0VTU19DT0RFO1xuICBjb2RlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9nb3V0TWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5MT0dPVVQ7XG59XG5cbmV4cG9ydCB0eXBlIEV4dGVuc2lvbk1lc3NhZ2UgPVxuICB8IENoZWNrVXJsTWVzc2FnZVxuICB8IFVybFJlc3VsdE1lc3NhZ2VcbiAgfCBTaG93T3ZlcmxheU1lc3NhZ2VcbiAgfCBEaXNtaXNzT3ZlcmxheU1lc3NhZ2VcbiAgfCBHZXRBdXRoU3RhdHVzTWVzc2FnZVxuICB8IFZhbGlkYXRlQWNjZXNzQ29kZU1lc3NhZ2VcbiAgfCBMb2dvdXRNZXNzYWdlO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1lc3NhZ2VSZXNwb25zZTxUID0gdW5rbm93bj4ge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBkYXRhPzogVDtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aFN0YXR1c1Jlc3BvbnNlIHtcbiAgaXNBdXRoZW50aWNhdGVkOiBib29sZWFuO1xuICBhY2Nlc3NDb2RlPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENoZWNrVXJsUmVzcG9uc2Uge1xuICByZXN1bHQ6IFNjYW5SZXN1bHQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJlZGljdFJlcXVlc3Qge1xuICB1cmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcmVkaWN0QXBpUmVzdWx0IHtcbiAgaXNfbWFsaWNpb3VzOiBib29sZWFuO1xuICBhY2N1cmF0ZTogbnVtYmVyO1xuICBzdWdnZXN0ZWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcmVkaWN0UmVzcG9uc2Uge1xuICByZXN1bHQ6IFByZWRpY3RBcGlSZXN1bHQ7XG4gIG1lc3NhZ2U/OiBzdHJpbmc7XG4gIHN0YXR1cz86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBcGlDb25maWcge1xuICBhcGlFbmRwb2ludDogc3RyaW5nO1xuICBhcGlLZXk6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdG9yYWdlU2NoZW1hIHtcbiAgYWNjZXNzQ29kZTogc3RyaW5nIHwgbnVsbDtcbiAgYXBpRW5kcG9pbnQ6IHN0cmluZztcbiAgYXBpS2V5OiBzdHJpbmc7XG4gIHNjYW5IaXN0b3J5OiBTY2FuUmVzdWx0W107XG4gIGlzQXV0aGVudGljYXRlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgU3RvcmFnZUtleSA9IGtleW9mIFN0b3JhZ2VTY2hlbWE7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NUT1JBR0U6IFN0b3JhZ2VTY2hlbWEgPSB7XG4gIGFjY2Vzc0NvZGU6IG51bGwsXG4gIGFwaUVuZHBvaW50OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwL2FwaS92MS9wcmVkaWN0L3ByZWRpY3QnLFxuICBhcGlLZXk6ICcnLFxuICBzY2FuSGlzdG9yeTogW10sXG4gIGlzQXV0aGVudGljYXRlZDogZmFsc2UsXG59O1xuIiwiaW1wb3J0IHR5cGUgeyBTdG9yYWdlU2NoZW1hLCBTdG9yYWdlS2V5IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBERUZBVUxUX1NUT1JBR0UgfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IHN0b3JhZ2UgPSB7XG4gIGdldDogYXN5bmMgPEsgZXh0ZW5kcyBTdG9yYWdlS2V5PihrZXlzOiBLIHwgS1tdKTogUHJvbWlzZTxQaWNrPFN0b3JhZ2VTY2hlbWEsIEs+PiA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnJvd3Nlci5zdG9yYWdlLmxvY2FsLmdldChrZXlzIGFzIHN0cmluZyB8IHN0cmluZ1tdKTtcbiAgICBjb25zdCBrZXlBcnJheSA9IEFycmF5LmlzQXJyYXkoa2V5cykgPyBrZXlzIDogW2tleXNdO1xuICAgIGNvbnN0IG1lcmdlZDogUGFydGlhbDxTdG9yYWdlU2NoZW1hPiA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2Yga2V5QXJyYXkpIHtcbiAgICAgIG1lcmdlZFtrZXldID0gcmVzdWx0W2tleV0gPz8gREVGQVVMVF9TVE9SQUdFW2tleV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG1lcmdlZCBhcyBQaWNrPFN0b3JhZ2VTY2hlbWEsIEs+O1xuICB9LFxuXG4gIHNldDogYXN5bmMgPEsgZXh0ZW5kcyBTdG9yYWdlS2V5PihpdGVtczogUGFydGlhbDxQaWNrPFN0b3JhZ2VTY2hlbWEsIEs+Pik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5zZXQoaXRlbXMpO1xuICB9LFxuXG4gIHJlbW92ZTogYXN5bmMgKGtleXM6IFN0b3JhZ2VLZXkgfCBTdG9yYWdlS2V5W10pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBhd2FpdCBicm93c2VyLnN0b3JhZ2UubG9jYWwucmVtb3ZlKGtleXMgYXMgc3RyaW5nIHwgc3RyaW5nW10pO1xuICB9LFxuXG4gIGNsZWFyOiBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgYnJvd3Nlci5zdG9yYWdlLmxvY2FsLmNsZWFyKCk7XG4gIH0sXG5cbiAgZ2V0QWxsOiBhc3luYyAoKTogUHJvbWlzZTxTdG9yYWdlU2NoZW1hPiA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnJvd3Nlci5zdG9yYWdlLmxvY2FsLmdldChudWxsKTtcbiAgICByZXR1cm4ge1xuICAgICAgLi4uREVGQVVMVF9TVE9SQUdFLFxuICAgICAgLi4ucmVzdWx0LFxuICAgIH0gYXMgU3RvcmFnZVNjaGVtYTtcbiAgfSxcblxuICBpbml0aWFsaXplOiBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IGF3YWl0IHN0b3JhZ2UuZ2V0QWxsKCk7XG4gICAgY29uc3QgdXBkYXRlczogUGFydGlhbDxTdG9yYWdlU2NoZW1hPiA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoREVGQVVMVF9TVE9SQUdFKSBhcyBTdG9yYWdlS2V5W10pIHtcbiAgICAgIGlmIChjdXJyZW50W2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cGRhdGVzW2tleV0gPSBERUZBVUxUX1NUT1JBR0Vba2V5XSBhcyBuZXZlcjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgYXdhaXQgc3RvcmFnZS5zZXQodXBkYXRlcyk7XG4gICAgfVxuICB9LFxufTtcbiIsImltcG9ydCB7IHN0b3JhZ2UgfSBmcm9tICcuL3N0b3JhZ2UnO1xuaW1wb3J0IHR5cGUgeyBTY2FuUmVzdWx0IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBNQVhfSElTVE9SWV9TSVpFIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVRvSGlzdG9yeShyZXN1bHQ6IFNjYW5SZXN1bHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyBzY2FuSGlzdG9yeSB9ID0gYXdhaXQgc3RvcmFnZS5nZXQoJ3NjYW5IaXN0b3J5Jyk7XG4gIGNvbnN0IGhpc3RvcnkgPSBzY2FuSGlzdG9yeSB8fCBbXTtcblxuICBoaXN0b3J5LnVuc2hpZnQocmVzdWx0KTtcbiAgY29uc3QgdHJpbW1lZEhpc3RvcnkgPSBoaXN0b3J5LnNsaWNlKDAsIE1BWF9ISVNUT1JZX1NJWkUpO1xuXG4gIGF3YWl0IHN0b3JhZ2Uuc2V0KHsgc2Nhbkhpc3Rvcnk6IHRyaW1tZWRIaXN0b3J5IH0pO1xuICBjb25zb2xlLmxvZygnW1NFTURdIFNhdmVkIHRvIGhpc3RvcnksIHRvdGFsIGVudHJpZXM6JywgdHJpbW1lZEhpc3RvcnkubGVuZ3RoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEhpc3RvcnkoKTogUHJvbWlzZTxTY2FuUmVzdWx0W10+IHtcbiAgY29uc3QgeyBzY2FuSGlzdG9yeSB9ID0gYXdhaXQgc3RvcmFnZS5nZXQoJ3NjYW5IaXN0b3J5Jyk7XG4gIHJldHVybiBzY2FuSGlzdG9yeSB8fCBbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFySGlzdG9yeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgc3RvcmFnZS5zZXQoeyBzY2FuSGlzdG9yeTogW10gfSk7XG4gIGNvbnNvbGUubG9nKCdbU0VNRF0gSGlzdG9yeSBjbGVhcmVkJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVGcm9tSGlzdG9yeSh0aW1lc3RhbXA6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHNjYW5IaXN0b3J5IH0gPSBhd2FpdCBzdG9yYWdlLmdldCgnc2Nhbkhpc3RvcnknKTtcbiAgY29uc3QgaGlzdG9yeSA9IHNjYW5IaXN0b3J5IHx8IFtdO1xuXG4gIGNvbnN0IGZpbHRlcmVkID0gaGlzdG9yeS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0udGltZXN0YW1wICE9PSB0aW1lc3RhbXApO1xuICBhd2FpdCBzdG9yYWdlLnNldCh7IHNjYW5IaXN0b3J5OiBmaWx0ZXJlZCB9KTtcbiAgY29uc29sZS5sb2coJ1tTRU1EXSBSZW1vdmVkIGVudHJ5IGZyb20gaGlzdG9yeScpO1xufVxuIiwiaW1wb3J0IHsgc3RvcmFnZSB9IGZyb20gJy4vc3RvcmFnZSc7XG5pbXBvcnQgdHlwZSB7IEFwaUNvbmZpZyB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgREVGQVVMVF9BUElfRU5EUE9JTlQgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDb25maWcoKTogUHJvbWlzZTxBcGlDb25maWc+IHtcbiAgY29uc3QgeyBhcGlFbmRwb2ludCwgYXBpS2V5IH0gPSBhd2FpdCBzdG9yYWdlLmdldChbJ2FwaUVuZHBvaW50JywgJ2FwaUtleSddKTtcblxuICByZXR1cm4ge1xuICAgIGFwaUVuZHBvaW50OiBhcGlFbmRwb2ludCB8fCBERUZBVUxUX0FQSV9FTkRQT0lOVCxcbiAgICBhcGlLZXk6IGFwaUtleSB8fCAnJyxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldENvbmZpZyhjb25maWc6IFBhcnRpYWw8QXBpQ29uZmlnPik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB1cGRhdGVzOiBQYXJ0aWFsPEFwaUNvbmZpZz4gPSB7fTtcblxuICBpZiAoY29uZmlnLmFwaUVuZHBvaW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICB1cGRhdGVzLmFwaUVuZHBvaW50ID0gY29uZmlnLmFwaUVuZHBvaW50O1xuICB9XG5cbiAgaWYgKGNvbmZpZy5hcGlLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgIHVwZGF0ZXMuYXBpS2V5ID0gY29uZmlnLmFwaUtleTtcbiAgfVxuXG4gIGlmIChPYmplY3Qua2V5cyh1cGRhdGVzKS5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgc3RvcmFnZS5zZXQodXBkYXRlcyk7XG4gICAgY29uc29sZS5sb2coJ1tTRU1EXSBDb25maWcgdXBkYXRlZDonLCBPYmplY3Qua2V5cyh1cGRhdGVzKSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc2V0Q29uZmlnKCk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBzdG9yYWdlLnNldCh7XG4gICAgYXBpRW5kcG9pbnQ6IERFRkFVTFRfQVBJX0VORFBPSU5ULFxuICAgIGFwaUtleTogJycsXG4gIH0pO1xuICBjb25zb2xlLmxvZygnW1NFTURdIENvbmZpZyByZXNldCB0byBkZWZhdWx0cycpO1xufVxuIiwiaW1wb3J0IHsgc3RvcmFnZSB9IGZyb20gJy4vc3RvcmFnZSc7XG5pbXBvcnQgeyBBQ0NFU1NfQ09ERV9MRU5HVEggfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aFN0YXR1cyB7XG4gIGlzQXV0aGVudGljYXRlZDogYm9vbGVhbjtcbiAgYWNjZXNzQ29kZTogc3RyaW5nIHwgbnVsbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEF1dGhTdGF0dXMoKTogUHJvbWlzZTxBdXRoU3RhdHVzPiB7XG4gIGNvbnN0IHsgYWNjZXNzQ29kZSwgaXNBdXRoZW50aWNhdGVkIH0gPSBhd2FpdCBzdG9yYWdlLmdldChbJ2FjY2Vzc0NvZGUnLCAnaXNBdXRoZW50aWNhdGVkJ10pO1xuXG4gIHJldHVybiB7XG4gICAgaXNBdXRoZW50aWNhdGVkOiBpc0F1dGhlbnRpY2F0ZWQgJiYgISFhY2Nlc3NDb2RlLFxuICAgIGFjY2Vzc0NvZGU6IGFjY2Vzc0NvZGUgfHwgbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlQWNjZXNzQ29kZShjb2RlOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc29sZS5sb2coJ1tTRU1EXSBWYWxpZGF0aW5nIGFjY2VzcyBjb2RlJyk7XG5cbiAgaWYgKCFjb2RlIHx8IGNvZGUubGVuZ3RoICE9PSBBQ0NFU1NfQ09ERV9MRU5HVEgpIHtcbiAgICBjb25zb2xlLmxvZygnW1NFTURdIEludmFsaWQgYWNjZXNzIGNvZGUgZm9ybWF0Jyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgaXNWYWxpZCA9IC9eW0EtWmEtejAtOV17Nn0kLy50ZXN0KGNvZGUpO1xuXG4gIGlmIChpc1ZhbGlkKSB7XG4gICAgYXdhaXQgc3RvcmFnZS5zZXQoe1xuICAgICAgYWNjZXNzQ29kZTogY29kZSxcbiAgICAgIGlzQXV0aGVudGljYXRlZDogdHJ1ZSxcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygnW1NFTURdIEFjY2VzcyBjb2RlIHZhbGlkYXRlZCBhbmQgc3RvcmVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjb25zb2xlLmxvZygnW1NFTURdIEFjY2VzcyBjb2RlIHZhbGlkYXRpb24gZmFpbGVkJyk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ291dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgc3RvcmFnZS5zZXQoe1xuICAgIGFjY2Vzc0NvZGU6IG51bGwsXG4gICAgaXNBdXRoZW50aWNhdGVkOiBmYWxzZSxcbiAgfSk7XG4gIGNvbnNvbGUubG9nKCdbU0VNRF0gVXNlciBsb2dnZWQgb3V0Jyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlQXV0aCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBpc0F1dGhlbnRpY2F0ZWQgfSA9IGF3YWl0IGdldEF1dGhTdGF0dXMoKTtcbiAgcmV0dXJuIGlzQXV0aGVudGljYXRlZDtcbn1cbiIsImltcG9ydCB7IGNoZWNrVXJsV2l0aEFQSSB9IGZyb20gJ0AvdXRpbHMvYXBpLnNlcnZpY2UnO1xuaW1wb3J0IHsgc2F2ZVRvSGlzdG9yeSB9IGZyb20gJ0AvdXRpbHMvaGlzdG9yeS5zZXJ2aWNlJztcbmltcG9ydCB7IGdldENvbmZpZyB9IGZyb20gJ0AvdXRpbHMvY29uZmlnLnNlcnZpY2UnO1xuaW1wb3J0IHsgZ2V0QXV0aFN0YXR1cywgdmFsaWRhdGVBY2Nlc3NDb2RlLCBsb2dvdXQsIHJlcXVpcmVBdXRoIH0gZnJvbSAnQC91dGlscy9hdXRoLnNlcnZpY2UnO1xuaW1wb3J0IHsgc3RvcmFnZSB9IGZyb20gJ0AvdXRpbHMvc3RvcmFnZSc7XG5pbXBvcnQge1xuICBNZXNzYWdlVHlwZSxcbiAgdHlwZSBFeHRlbnNpb25NZXNzYWdlLFxuICB0eXBlIE1lc3NhZ2VSZXNwb25zZSxcbiAgdHlwZSBBdXRoU3RhdHVzUmVzcG9uc2UsXG4gIHR5cGUgQ2hlY2tVcmxSZXNwb25zZSxcbn0gZnJvbSAnQC91dGlscy90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZygnW1NFTURdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZCcpO1xuXG4gIGxldCBwb3B1cFdpbmRvd0lkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICBicm93c2VyLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKCkgPT4ge1xuICAgIGlmIChwb3B1cFdpbmRvd0lkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBleGlzdGluZ1dpbmRvdyA9IGF3YWl0IGJyb3dzZXIud2luZG93cy5nZXQocG9wdXBXaW5kb3dJZCk7XG4gICAgICAgIGF3YWl0IGJyb3dzZXIud2luZG93cy51cGRhdGUoZXhpc3RpbmdXaW5kb3cuaWQhLCB7IGZvY3VzZWQ6IHRydWUgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBwb3B1cFdpbmRvd0lkID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB3aW5kb3cgPSBhd2FpdCBicm93c2VyLndpbmRvd3MuY3JlYXRlKHtcbiAgICAgIHVybDogYnJvd3Nlci5ydW50aW1lLmdldFVSTCgncG9wdXAuaHRtbCcpLFxuICAgICAgdHlwZTogJ3BvcHVwJyxcbiAgICAgIHdpZHRoOiAzNjAsXG4gICAgICBoZWlnaHQ6IDUyMCxcbiAgICAgIGZvY3VzZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICBwb3B1cFdpbmRvd0lkID0gd2luZG93LmlkITtcbiAgfSk7XG5cbiAgYnJvd3Nlci53aW5kb3dzLm9uUmVtb3ZlZC5hZGRMaXN0ZW5lcigod2luZG93SWQpID0+IHtcbiAgICBpZiAod2luZG93SWQgPT09IHBvcHVwV2luZG93SWQpIHtcbiAgICAgIHBvcHVwV2luZG93SWQgPSBudWxsO1xuICAgIH1cbiAgfSk7XG5cbiAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICBjb25zdCBtc2cgPSBtZXNzYWdlIGFzIEV4dGVuc2lvbk1lc3NhZ2U7XG5cbiAgICBoYW5kbGVNZXNzYWdlKG1zZywgc2VuZGVyKVxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UocmVzcG9uc2UpKVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbU0VNRF0gTWVzc2FnZSBoYW5kbGVyIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgYnJvd3Nlci5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKGFzeW5jICgpID0+IHtcbiAgICBjb25zb2xlLmxvZygnW1NFTURdIEV4dGVuc2lvbiBpbnN0YWxsZWQnKTtcbiAgICBhd2FpdCBzdG9yYWdlLmluaXRpYWxpemUoKTtcbiAgfSk7XG59KTtcblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlTWVzc2FnZShcbiAgbWVzc2FnZTogRXh0ZW5zaW9uTWVzc2FnZSxcbiAgX3NlbmRlcjogYnJvd3Nlci5SdW50aW1lLk1lc3NhZ2VTZW5kZXJcbik6IFByb21pc2U8TWVzc2FnZVJlc3BvbnNlPiB7XG4gIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgY2FzZSBNZXNzYWdlVHlwZS5DSEVDS19VUkw6IHtcbiAgICAgIGNvbnN0IGlzQXV0aGVkID0gYXdhaXQgcmVxdWlyZUF1dGgoKTtcbiAgICAgIGlmICghaXNBdXRoZWQpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm90IGF1dGhlbnRpY2F0ZWQnIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IGdldENvbmZpZygpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hlY2tVcmxXaXRoQVBJKG1lc3NhZ2UudXJsLCBjb25maWcpO1xuICAgICAgYXdhaXQgc2F2ZVRvSGlzdG9yeShyZXN1bHQpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBkYXRhOiB7IHJlc3VsdCB9IGFzIENoZWNrVXJsUmVzcG9uc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNhc2UgTWVzc2FnZVR5cGUuR0VUX0FVVEhfU1RBVFVTOiB7XG4gICAgICBjb25zdCBhdXRoU3RhdHVzID0gYXdhaXQgZ2V0QXV0aFN0YXR1cygpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgZGF0YTogYXV0aFN0YXR1cyBhcyBBdXRoU3RhdHVzUmVzcG9uc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNhc2UgTWVzc2FnZVR5cGUuVkFMSURBVEVfQUNDRVNTX0NPREU6IHtcbiAgICAgIGNvbnN0IGlzVmFsaWQgPSBhd2FpdCB2YWxpZGF0ZUFjY2Vzc0NvZGUobWVzc2FnZS5jb2RlKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGlzVmFsaWQsXG4gICAgICAgIGVycm9yOiBpc1ZhbGlkID8gdW5kZWZpbmVkIDogJ0ludmFsaWQgYWNjZXNzIGNvZGUnLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjYXNlIE1lc3NhZ2VUeXBlLkxPR09VVDoge1xuICAgICAgYXdhaXQgbG9nb3V0KCk7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1Vua25vd24gbWVzc2FnZSB0eXBlJyB9O1xuICB9XG59XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbImJyb3dzZXIiLCJyZXN1bHQiXSwibWFwcGluZ3MiOiI7O0FBQ0EsV0FBUyxpQkFBaUIsS0FBSztBQUM5QixRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNSO0FDSE8sUUFBTUEsWUFBVSxXQUFXLFNBQVMsU0FBUyxLQUNoRCxXQUFXLFVBQ1gsV0FBVztBQ1dmLFFBQU0sVUFBVTtBQ2RULFFBQU0sdUJBQXVC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
