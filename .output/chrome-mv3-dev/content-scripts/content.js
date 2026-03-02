var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  const OVERLAY_ID = "semd-warning-overlay";
  const THAI_LABELS = {
    OVERLAY_QUESTION: "คุณต้องการเข้าเว็บไซต์",
    OVERLAY_PROCEED: "ใช่, ดำเนินการต่อ",
    OVERLAY_CLOSE: "ไม่, ปิดเว็บไซต์นี้"
  };
  const COLORS = {
    SAFE_GREEN: "#4CAF50",
    DANGER_RED: "#F44336"
  };
  function createOverlay(options) {
    const { url, accuracy, onProceed, onClose } = options;
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(244, 67, 54, 0.2);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
    ">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 32px 40px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      ">
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: ${COLORS.DANGER_RED};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 6V12C4 16.42 7.4 20.74 12 22C16.6 20.74 20 16.42 20 12V6L12 2Z" fill="white" fill-opacity="0.3"/>
            <text x="12" y="16" text-anchor="middle" fill="white" font-size="14" font-weight="bold">!</text>
          </svg>
        </div>

        <p style="
          font-size: 18px;
          color: #333;
          margin: 0 0 12px 0;
          font-weight: 500;
        ">${THAI_LABELS.OVERLAY_QUESTION}</p>

        <p style="
          font-size: 14px;
          color: ${COLORS.DANGER_RED};
          margin: 0 0 8px 0;
          word-break: break-all;
          text-decoration: underline;
        ">${url}</p>

        <p style="
          font-size: 12px;
          color: #666;
          margin: 0 0 24px 0;
        ">ความแม่นยำ: ${(accuracy * 100).toFixed(1)}%</p>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="semd-overlay-proceed" style="
            background: transparent;
            color: ${COLORS.DANGER_RED};
            border: 2px solid ${COLORS.DANGER_RED};
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">${THAI_LABELS.OVERLAY_PROCEED}</button>

          <button id="semd-overlay-close" style="
            background: ${COLORS.SAFE_GREEN};
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">${THAI_LABELS.OVERLAY_CLOSE}</button>
        </div>
      </div>
    </div>
  `;
    const proceedBtn = overlay.querySelector("#semd-overlay-proceed");
    const closeBtn = overlay.querySelector("#semd-overlay-close");
    proceedBtn?.addEventListener("click", () => {
      onProceed();
      removeOverlay();
    });
    closeBtn?.addEventListener("click", () => {
      onClose();
    });
    return overlay;
  }
  function showOverlay(options) {
    removeOverlay();
    const overlay = createOverlay(options);
    if (document.body) {
      document.body.appendChild(overlay);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(overlay);
      });
    }
  }
  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }
  }
  const MessageType = {
    CHECK_URL: "CHECK_URL",
    SHOW_OVERLAY: "SHOW_OVERLAY",
    DISMISS_OVERLAY: "DISMISS_OVERLAY"
  };
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_start",
    main(ctx) {
      console.log("[SEMD] Content script loaded");
      let currentUrl = window.location.href;
      let observer = null;
      init();
      function init() {
        checkUrl(currentUrl);
        startUrlMonitor();
        listenForMessages();
      }
      function checkUrl(url) {
        console.log(`[SEMD] Checking URL: ${url}`);
        browser.runtime.sendMessage(
          { type: MessageType.CHECK_URL, url },
          (response) => {
            if (browser.runtime.lastError) {
              console.warn("[SEMD] Message error:", browser.runtime.lastError.message);
              return;
            }
            if (response?.success && response.data?.result?.isMalicious) {
              handleMaliciousUrl(url, response.data.result);
            }
          }
        );
      }
      function handleMaliciousUrl(url, result2) {
        console.log("[SEMD] Malicious URL detected:", url);
        showOverlay({
          url,
          accuracy: result2.accuracy,
          onProceed: () => {
            console.log("[SEMD] User chose to proceed");
            removeOverlay();
          },
          onClose: () => {
            console.log("[SEMD] User chose to close tab");
            browser.runtime.sendMessage({ type: MessageType.DISMISS_OVERLAY, action: "close" });
            window.close();
          }
        });
      }
      function startUrlMonitor() {
        window.addEventListener("popstate", () => onUrlChange());
        window.addEventListener("hashchange", () => onUrlChange());
        const originalPushState = history.pushState.bind(history);
        const originalReplaceState = history.replaceState.bind(history);
        history.pushState = (...args) => {
          originalPushState(...args);
          onUrlChange();
        };
        history.replaceState = (...args) => {
          originalReplaceState(...args);
          onUrlChange();
        };
        observer = new MutationObserver(() => {
          if (currentUrl !== window.location.href) {
            onUrlChange();
          }
        });
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      }
      function onUrlChange() {
        const newUrl = window.location.href;
        if (newUrl !== currentUrl) {
          console.log(`[SEMD] URL changed: ${currentUrl} -> ${newUrl}`);
          currentUrl = newUrl;
          removeOverlay();
          checkUrl(newUrl);
        }
      }
      function listenForMessages() {
        browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
          const msg = message;
          if (msg.type === MessageType.SHOW_OVERLAY && msg.url) {
            showOverlay({
              url: msg.url,
              accuracy: msg.accuracy || 0,
              onProceed: () => removeOverlay(),
              onClose: () => window.close()
            });
            sendResponse({ success: true });
          }
          if (msg.type === MessageType.DISMISS_OVERLAY) {
            removeOverlay();
            sendResponse({ success: true });
          }
          return true;
        });
      }
      ctx.onInvalidated(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        removeOverlay();
      });
    }
  });
  function print$1(method, ...args) {
    if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
    else method("[wxt]", ...args);
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  var WxtLocationChangeEvent = class WxtLocationChangeEvent2 extends Event {
    static EVENT_NAME = getUniqueEventName("wxt:locationchange");
    constructor(newUrl, oldUrl) {
      super(WxtLocationChangeEvent2.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  function getUniqueEventName(eventName) {
    return `${browser?.runtime?.id}:${"content"}:${eventName}`;
  }
  const supportsNavigationApi = typeof globalThis.navigation?.addEventListener === "function";
  function createLocationWatcher(ctx) {
    let lastUrl;
    let watching = false;
    return { run() {
      if (watching) return;
      watching = true;
      lastUrl = new URL(location.href);
      if (supportsNavigationApi) globalThis.navigation.addEventListener("navigate", (event) => {
        const newUrl = new URL(event.destination.url);
        if (newUrl.href === lastUrl.href) return;
        window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
        lastUrl = newUrl;
      }, { signal: ctx.signal });
      else ctx.setInterval(() => {
        const newUrl = new URL(location.href);
        if (newUrl.href !== lastUrl.href) {
          window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
          lastUrl = newUrl;
        }
      }, 1e3);
    } };
  }
  var ContentScriptContext = class ContentScriptContext2 {
    static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName("wxt:content-script-started");
    id;
    abortController;
    locationWatcher = createLocationWatcher(this);
    constructor(contentScriptName, options) {
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.id = Math.random().toString(36).slice(2);
      this.abortController = new AbortController();
      this.stopOldScripts();
      this.listenForNewerScripts();
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime?.id == null) this.notifyInvalidated();
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
    * Add a listener that is called when the content script's context is invalidated.
    *
    * @returns A function to remove the listener.
    *
    * @example
    * browser.runtime.onMessage.addListener(cb);
    * const removeInvalidatedListener = ctx.onInvalidated(() => {
    *   browser.runtime.onMessage.removeListener(cb);
    * })
    * // ...
    * removeInvalidatedListener();
    */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
    * Return a promise that never resolves. Useful if you have an async function that shouldn't run
    * after the context is expired.
    *
    * @example
    * const getValueFromStorage = async () => {
    *   if (ctx.isInvalid) return ctx.block();
    *
    *   // ...
    * }
    */
    block() {
      return new Promise(() => {
      });
    }
    /**
    * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
    *
    * Intervals can be cleared by calling the normal `clearInterval` function.
    */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
    * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
    *
    * Timeouts can be cleared by calling the normal `setTimeout` function.
    */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
    * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
    * invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelAnimationFrame` function.
    */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
    * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
    * invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelIdleCallback` function.
    */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      target.addEventListener?.(type.startsWith("wxt:") ? getUniqueEventName(type) : type, handler, {
        ...options,
        signal: this.signal
      });
    }
    /**
    * @internal
    * Abort the abort controller and execute all `onInvalidated` listeners.
    */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(`Content script "${this.contentScriptName}" context invalidated`);
    }
    stopOldScripts() {
      document.dispatchEvent(new CustomEvent(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, { detail: {
        contentScriptName: this.contentScriptName,
        messageId: this.id
      } }));
      window.postMessage({
        type: ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE,
        contentScriptName: this.contentScriptName,
        messageId: this.id
      }, "*");
    }
    verifyScriptStartedEvent(event) {
      const isSameContentScript = event.detail?.contentScriptName === this.contentScriptName;
      const isFromSelf = event.detail?.messageId === this.id;
      return isSameContentScript && !isFromSelf;
    }
    listenForNewerScripts() {
      const cb = (event) => {
        if (!(event instanceof CustomEvent) || !this.verifyScriptStartedEvent(event)) return;
        this.notifyInvalidated();
      };
      document.addEventListener(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, cb);
      this.onInvalidated(() => document.removeEventListener(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, cb));
    }
  };
  function initPlugins() {
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
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      return await main(new ContentScriptContext("content", options));
    } catch (err) {
      logger.error(`The content script "${"content"}" crashed on startup!`, err);
      throw err;
    }
  })();
  return result;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vc3JjL3V0aWxzL2NvbnN0YW50cy50cyIsIi4uLy4uLy4uL3NyYy91dGlscy9vdmVybGF5LnRzIiwiLi4vLi4vLi4vc3JjL3V0aWxzL3R5cGVzLnRzIiwiLi4vLi4vLi4vc3JjL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyNyZWdpb24gc3JjL3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC50c1xuZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG5cdHJldHVybiBkZWZpbml0aW9uO1xufVxuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGRlZmluZUNvbnRlbnRTY3JpcHQgfTsiLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIGJyb3dzZXIkMSB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5cbi8vI3JlZ2lvbiBzcmMvYnJvd3Nlci50c1xuLyoqXG4qIENvbnRhaW5zIHRoZSBgYnJvd3NlcmAgZXhwb3J0IHdoaWNoIHlvdSBzaG91bGQgdXNlIHRvIGFjY2VzcyB0aGUgZXh0ZW5zaW9uIEFQSXMgaW4geW91ciBwcm9qZWN0OlxuKiBgYGB0c1xuKiBpbXBvcnQgeyBicm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuKlxuKiBicm93c2VyLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuKiAgIC8vIC4uLlxuKiB9KVxuKiBgYGBcbiogQG1vZHVsZSB3eHQvYnJvd3NlclxuKi9cbmNvbnN0IGJyb3dzZXIgPSBicm93c2VyJDE7XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgYnJvd3NlciB9OyIsImV4cG9ydCBjb25zdCBERUZBVUxUX0FQSV9FTkRQT0lOVCA9ICdodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL3YxL3ByZWRpY3QvcHJlZGljdCc7XG5leHBvcnQgY29uc3QgRVhURU5TSU9OX05BTUUgPSAnU0VNRCc7XG5leHBvcnQgY29uc3QgTUFYX0hJU1RPUllfU0laRSA9IDEwMDtcbmV4cG9ydCBjb25zdCBBQ0NFU1NfQ09ERV9MRU5HVEggPSA2O1xuZXhwb3J0IGNvbnN0IE9WRVJMQVlfSUQgPSAnc2VtZC13YXJuaW5nLW92ZXJsYXknO1xuXG5leHBvcnQgY29uc3QgVEhBSV9MQUJFTFMgPSB7XG4gIExPR0lOX1RJVExFOiAnTG9naW4nLFxuICBMT0dJTl9QUk9NUFQ6ICfguIHguKPguK3guIEgQWNjZXNzIGNvZGUg4LiI4Liy4LiB4LmA4Lin4LmH4Lia4LmE4LiL4LiV4LmMOicsXG4gIExPR0lOX0JVVFRPTjogJ+C5gOC4guC5ieC4suC5g+C4iuC5ieC4h+C4suC4mScsXG4gIFNBRkU6ICfguJvguKXguK3guJTguKDguLHguKInLFxuICBEQU5HRVI6ICfguK3guLHguJnguJXguKPguLLguKInLFxuICBPVkVSTEFZX1FVRVNUSU9OOiAn4LiE4Li44LiT4LiV4LmJ4Lit4LiH4LiB4Liy4Lij4LmA4LiC4LmJ4Liy4LmA4Lin4LmH4Lia4LmE4LiL4LiV4LmMJyxcbiAgT1ZFUkxBWV9QUk9DRUVEOiAn4LmD4LiK4LmILCDguJTguLPguYDguJnguLTguJnguIHguLLguKPguJXguYjguK0nLFxuICBPVkVSTEFZX0NMT1NFOiAn4LmE4Lih4LmILCDguJvguLTguJTguYDguKfguYfguJrguYTguIvguJXguYzguJnguLXguYknLFxuICBTRVRUSU5HU19USVRMRTogJ+C4leC4seC5ieC4h+C4hOC5iOC4sicsXG4gIERBU0hCT0FSRF9USVRMRTogJ+C4m+C4o+C4sOC4p+C4seC4leC4tOC4geC4suC4o+C4quC5geC4geC4mScsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgQ09MT1JTID0ge1xuICBDUkVBTV9CRzogJyNGRkY5RTYnLFxuICBHT0xEX0FDQ0VOVDogJyNGNUQ3NkUnLFxuICBHT0xEX0JPUkRFUjogJyNDNEE4NEInLFxuICBTQUZFX0dSRUVOOiAnIzRDQUY1MCcsXG4gIFNBRkVfR1JFRU5fREFSSzogJyMzODhFM0MnLFxuICBEQU5HRVJfUkVEOiAnI0Y0NDMzNicsXG4gIERBTkdFUl9SRURfREFSSzogJyNEMzJGMkYnLFxuICBEQU5HRVJfUElOS19CRzogJyNGRkVCRUUnLFxuICBTQUZFX0dSRUVOX0JHOiAnI0U4RjVFOScsXG59IGFzIGNvbnN0O1xuIiwiaW1wb3J0IHsgT1ZFUkxBWV9JRCwgVEhBSV9MQUJFTFMsIENPTE9SUyB9IGZyb20gJy4vY29uc3RhbnRzJztcblxuZXhwb3J0IGludGVyZmFjZSBPdmVybGF5T3B0aW9ucyB7XG4gIHVybDogc3RyaW5nO1xuICBhY2N1cmFjeTogbnVtYmVyO1xuICBvblByb2NlZWQ6ICgpID0+IHZvaWQ7XG4gIG9uQ2xvc2U6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVPdmVybGF5KG9wdGlvbnM6IE92ZXJsYXlPcHRpb25zKTogSFRNTEVsZW1lbnQge1xuICBjb25zdCB7IHVybCwgYWNjdXJhY3ksIG9uUHJvY2VlZCwgb25DbG9zZSB9ID0gb3B0aW9ucztcblxuICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIG92ZXJsYXkuaWQgPSBPVkVSTEFZX0lEO1xuICBvdmVybGF5LmlubmVySFRNTCA9IGBcbiAgICA8ZGl2IHN0eWxlPVwiXG4gICAgICBwb3NpdGlvbjogZml4ZWQ7XG4gICAgICB0b3A6IDA7XG4gICAgICBsZWZ0OiAwO1xuICAgICAgd2lkdGg6IDEwMCU7XG4gICAgICBoZWlnaHQ6IDEwMCU7XG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI0NCwgNjcsIDU0LCAwLjIpO1xuICAgICAgei1pbmRleDogMjE0NzQ4MzY0NztcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBSb2JvdG8sICdOb3RvIFNhbnMgVGhhaScsIHNhbnMtc2VyaWY7XG4gICAgXCI+XG4gICAgICA8ZGl2IHN0eWxlPVwiXG4gICAgICAgIGJhY2tncm91bmQ6IHdoaXRlO1xuICAgICAgICBib3JkZXItcmFkaXVzOiAxNnB4O1xuICAgICAgICBwYWRkaW5nOiAzMnB4IDQwcHg7XG4gICAgICAgIG1heC13aWR0aDogNDIwcHg7XG4gICAgICAgIHdpZHRoOiA5MCU7XG4gICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgICAgYm94LXNoYWRvdzogMCA4cHggMzJweCByZ2JhKDAsMCwwLDAuMjUpO1xuICAgICAgXCI+XG4gICAgICAgIDxkaXYgc3R5bGU9XCJcbiAgICAgICAgICB3aWR0aDogODBweDtcbiAgICAgICAgICBoZWlnaHQ6IDgwcHg7XG4gICAgICAgICAgbWFyZ2luOiAwIGF1dG8gMjBweDtcbiAgICAgICAgICBiYWNrZ3JvdW5kOiAke0NPTE9SUy5EQU5HRVJfUkVEfTtcbiAgICAgICAgICBib3JkZXItcmFkaXVzOiA1MCU7XG4gICAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgICAgICBcIj5cbiAgICAgICAgICA8c3ZnIHdpZHRoPVwiNDBcIiBoZWlnaHQ9XCI0MFwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgICAgIDxwYXRoIGQ9XCJNMTIgMkw0IDZWMTJDNCAxNi40MiA3LjQgMjAuNzQgMTIgMjJDMTYuNiAyMC43NCAyMCAxNi40MiAyMCAxMlY2TDEyIDJaXCIgZmlsbD1cIndoaXRlXCIgZmlsbC1vcGFjaXR5PVwiMC4zXCIvPlxuICAgICAgICAgICAgPHRleHQgeD1cIjEyXCIgeT1cIjE2XCIgdGV4dC1hbmNob3I9XCJtaWRkbGVcIiBmaWxsPVwid2hpdGVcIiBmb250LXNpemU9XCIxNFwiIGZvbnQtd2VpZ2h0PVwiYm9sZFwiPiE8L3RleHQ+XG4gICAgICAgICAgPC9zdmc+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxwIHN0eWxlPVwiXG4gICAgICAgICAgZm9udC1zaXplOiAxOHB4O1xuICAgICAgICAgIGNvbG9yOiAjMzMzO1xuICAgICAgICAgIG1hcmdpbjogMCAwIDEycHggMDtcbiAgICAgICAgICBmb250LXdlaWdodDogNTAwO1xuICAgICAgICBcIj4ke1RIQUlfTEFCRUxTLk9WRVJMQVlfUVVFU1RJT059PC9wPlxuXG4gICAgICAgIDxwIHN0eWxlPVwiXG4gICAgICAgICAgZm9udC1zaXplOiAxNHB4O1xuICAgICAgICAgIGNvbG9yOiAke0NPTE9SUy5EQU5HRVJfUkVEfTtcbiAgICAgICAgICBtYXJnaW46IDAgMCA4cHggMDtcbiAgICAgICAgICB3b3JkLWJyZWFrOiBicmVhay1hbGw7XG4gICAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG4gICAgICAgIFwiPiR7dXJsfTwvcD5cblxuICAgICAgICA8cCBzdHlsZT1cIlxuICAgICAgICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICAgICAgICBjb2xvcjogIzY2NjtcbiAgICAgICAgICBtYXJnaW46IDAgMCAyNHB4IDA7XG4gICAgICAgIFwiPuC4hOC4p+C4suC4oeC5geC4oeC5iOC4meC4ouC4szogJHsoYWNjdXJhY3kgKiAxMDApLnRvRml4ZWQoMSl9JTwvcD5cblxuICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgZ2FwOiAxMnB4OyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgZmxleC13cmFwOiB3cmFwO1wiPlxuICAgICAgICAgIDxidXR0b24gaWQ9XCJzZW1kLW92ZXJsYXktcHJvY2VlZFwiIHN0eWxlPVwiXG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgICAgICAgICAgIGNvbG9yOiAke0NPTE9SUy5EQU5HRVJfUkVEfTtcbiAgICAgICAgICAgIGJvcmRlcjogMnB4IHNvbGlkICR7Q09MT1JTLkRBTkdFUl9SRUR9O1xuICAgICAgICAgICAgcGFkZGluZzogMTJweCAyNHB4O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgICAgICAgICAgZm9udC1zaXplOiAxNHB4O1xuICAgICAgICAgICAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgICAgICAgIHRyYW5zaXRpb246IGFsbCAwLjJzO1xuICAgICAgICAgIFwiPiR7VEhBSV9MQUJFTFMuT1ZFUkxBWV9QUk9DRUVEfTwvYnV0dG9uPlxuXG4gICAgICAgICAgPGJ1dHRvbiBpZD1cInNlbWQtb3ZlcmxheS1jbG9zZVwiIHN0eWxlPVwiXG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiAke0NPTE9SUy5TQUZFX0dSRUVOfTtcbiAgICAgICAgICAgIGNvbG9yOiB3aGl0ZTtcbiAgICAgICAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgICAgICAgIHBhZGRpbmc6IDEycHggMjRweDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XG4gICAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICAgICAgICB0cmFuc2l0aW9uOiBhbGwgMC4ycztcbiAgICAgICAgICBcIj4ke1RIQUlfTEFCRUxTLk9WRVJMQVlfQ0xPU0V9PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIGA7XG5cbiAgY29uc3QgcHJvY2VlZEJ0biA9IG92ZXJsYXkucXVlcnlTZWxlY3RvcignI3NlbWQtb3ZlcmxheS1wcm9jZWVkJyk7XG4gIGNvbnN0IGNsb3NlQnRuID0gb3ZlcmxheS5xdWVyeVNlbGVjdG9yKCcjc2VtZC1vdmVybGF5LWNsb3NlJyk7XG5cbiAgcHJvY2VlZEJ0bj8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgb25Qcm9jZWVkKCk7XG4gICAgcmVtb3ZlT3ZlcmxheSgpO1xuICB9KTtcblxuICBjbG9zZUJ0bj8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgb25DbG9zZSgpO1xuICB9KTtcblxuICByZXR1cm4gb3ZlcmxheTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNob3dPdmVybGF5KG9wdGlvbnM6IE92ZXJsYXlPcHRpb25zKTogdm9pZCB7XG4gIHJlbW92ZU92ZXJsYXkoKTtcblxuICBjb25zdCBvdmVybGF5ID0gY3JlYXRlT3ZlcmxheShvcHRpb25zKTtcblxuICBpZiAoZG9jdW1lbnQuYm9keSkge1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG4gIH0gZWxzZSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZU92ZXJsYXkoKTogdm9pZCB7XG4gIGNvbnN0IGV4aXN0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoT1ZFUkxBWV9JRCk7XG4gIGlmIChleGlzdGluZykge1xuICAgIGV4aXN0aW5nLnJlbW92ZSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc092ZXJsYXlWaXNpYmxlKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gISFkb2N1bWVudC5nZXRFbGVtZW50QnlJZChPVkVSTEFZX0lEKTtcbn1cbiIsImV4cG9ydCBjb25zdCBNZXNzYWdlVHlwZSA9IHtcbiAgQ0hFQ0tfVVJMOiAnQ0hFQ0tfVVJMJyxcbiAgVVJMX1JFU1VMVDogJ1VSTF9SRVNVTFQnLFxuICBTSE9XX09WRVJMQVk6ICdTSE9XX09WRVJMQVknLFxuICBESVNNSVNTX09WRVJMQVk6ICdESVNNSVNTX09WRVJMQVknLFxuICBHRVRfQVVUSF9TVEFUVVM6ICdHRVRfQVVUSF9TVEFUVVMnLFxuICBWQUxJREFURV9BQ0NFU1NfQ09ERTogJ1ZBTElEQVRFX0FDQ0VTU19DT0RFJyxcbiAgTE9HT1VUOiAnTE9HT1VUJyxcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIE1lc3NhZ2VUeXBlS2V5ID0ga2V5b2YgdHlwZW9mIE1lc3NhZ2VUeXBlO1xuZXhwb3J0IHR5cGUgTWVzc2FnZVR5cGVWYWx1ZSA9ICh0eXBlb2YgTWVzc2FnZVR5cGUpW01lc3NhZ2VUeXBlS2V5XTtcblxuZXhwb3J0IGludGVyZmFjZSBTY2FuUmVzdWx0IHtcbiAgdXJsOiBzdHJpbmc7XG4gIGlzTWFsaWNpb3VzOiBib29sZWFuO1xuICBhY2N1cmFjeTogbnVtYmVyO1xuICBzdWdnZXN0ZWQ6IHN0cmluZztcbiAgdGltZXN0YW1wOiBzdHJpbmc7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENoZWNrVXJsTWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5DSEVDS19VUkw7XG4gIHVybDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVybFJlc3VsdE1lc3NhZ2Uge1xuICB0eXBlOiB0eXBlb2YgTWVzc2FnZVR5cGUuVVJMX1JFU1VMVDtcbiAgcmVzdWx0OiBTY2FuUmVzdWx0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNob3dPdmVybGF5TWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5TSE9XX09WRVJMQVk7XG4gIHVybDogc3RyaW5nO1xuICBhY2N1cmFjeTogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpc21pc3NPdmVybGF5TWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5ESVNNSVNTX09WRVJMQVk7XG4gIGFjdGlvbjogJ3Byb2NlZWQnIHwgJ2Nsb3NlJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHZXRBdXRoU3RhdHVzTWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5HRVRfQVVUSF9TVEFUVVM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmFsaWRhdGVBY2Nlc3NDb2RlTWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5WQUxJREFURV9BQ0NFU1NfQ09ERTtcbiAgY29kZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvZ291dE1lc3NhZ2Uge1xuICB0eXBlOiB0eXBlb2YgTWVzc2FnZVR5cGUuTE9HT1VUO1xufVxuXG5leHBvcnQgdHlwZSBFeHRlbnNpb25NZXNzYWdlID1cbiAgfCBDaGVja1VybE1lc3NhZ2VcbiAgfCBVcmxSZXN1bHRNZXNzYWdlXG4gIHwgU2hvd092ZXJsYXlNZXNzYWdlXG4gIHwgRGlzbWlzc092ZXJsYXlNZXNzYWdlXG4gIHwgR2V0QXV0aFN0YXR1c01lc3NhZ2VcbiAgfCBWYWxpZGF0ZUFjY2Vzc0NvZGVNZXNzYWdlXG4gIHwgTG9nb3V0TWVzc2FnZTtcblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlUmVzcG9uc2U8VCA9IHVua25vd24+IHtcbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgZGF0YT86IFQ7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhTdGF0dXNSZXNwb25zZSB7XG4gIGlzQXV0aGVudGljYXRlZDogYm9vbGVhbjtcbiAgYWNjZXNzQ29kZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGVja1VybFJlc3BvbnNlIHtcbiAgcmVzdWx0OiBTY2FuUmVzdWx0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByZWRpY3RSZXF1ZXN0IHtcbiAgdXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJlZGljdEFwaVJlc3VsdCB7XG4gIGlzX21hbGljaW91czogYm9vbGVhbjtcbiAgYWNjdXJhdGU6IG51bWJlcjtcbiAgc3VnZ2VzdGVkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJlZGljdFJlc3BvbnNlIHtcbiAgcmVzdWx0OiBQcmVkaWN0QXBpUmVzdWx0O1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBzdGF0dXM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpQ29uZmlnIHtcbiAgYXBpRW5kcG9pbnQ6IHN0cmluZztcbiAgYXBpS2V5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmFnZVNjaGVtYSB7XG4gIGFjY2Vzc0NvZGU6IHN0cmluZyB8IG51bGw7XG4gIGFwaUVuZHBvaW50OiBzdHJpbmc7XG4gIGFwaUtleTogc3RyaW5nO1xuICBzY2FuSGlzdG9yeTogU2NhblJlc3VsdFtdO1xuICBpc0F1dGhlbnRpY2F0ZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFN0b3JhZ2VLZXkgPSBrZXlvZiBTdG9yYWdlU2NoZW1hO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TVE9SQUdFOiBTdG9yYWdlU2NoZW1hID0ge1xuICBhY2Nlc3NDb2RlOiBudWxsLFxuICBhcGlFbmRwb2ludDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdjEvcHJlZGljdC9wcmVkaWN0JyxcbiAgYXBpS2V5OiAnJyxcbiAgc2Nhbkhpc3Rvcnk6IFtdLFxuICBpc0F1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxufTtcbiIsImltcG9ydCB7IHNob3dPdmVybGF5LCByZW1vdmVPdmVybGF5IH0gZnJvbSAnQC91dGlscy9vdmVybGF5JztcbmltcG9ydCB7IE1lc3NhZ2VUeXBlLCB0eXBlIFNjYW5SZXN1bHQsIHR5cGUgTWVzc2FnZVJlc3BvbnNlLCB0eXBlIENoZWNrVXJsUmVzcG9uc2UgfSBmcm9tICdAL3V0aWxzL3R5cGVzJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFsnPGFsbF91cmxzPiddLFxuICBydW5BdDogJ2RvY3VtZW50X3N0YXJ0JyxcblxuICBtYWluKGN0eCkge1xuICAgIGNvbnNvbGUubG9nKCdbU0VNRF0gQ29udGVudCBzY3JpcHQgbG9hZGVkJyk7XG5cbiAgICBsZXQgY3VycmVudFVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICAgIGxldCBvYnNlcnZlcjogTXV0YXRpb25PYnNlcnZlciB8IG51bGwgPSBudWxsO1xuXG4gICAgaW5pdCgpO1xuXG4gICAgZnVuY3Rpb24gaW5pdCgpOiB2b2lkIHtcbiAgICAgIGNoZWNrVXJsKGN1cnJlbnRVcmwpO1xuICAgICAgc3RhcnRVcmxNb25pdG9yKCk7XG4gICAgICBsaXN0ZW5Gb3JNZXNzYWdlcygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrVXJsKHVybDogc3RyaW5nKTogdm9pZCB7XG4gICAgICBjb25zb2xlLmxvZyhgW1NFTURdIENoZWNraW5nIFVSTDogJHt1cmx9YCk7XG5cbiAgICAgIGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZShcbiAgICAgICAgeyB0eXBlOiBNZXNzYWdlVHlwZS5DSEVDS19VUkwsIHVybCB9LFxuICAgICAgICAocmVzcG9uc2U6IE1lc3NhZ2VSZXNwb25zZTxDaGVja1VybFJlc3BvbnNlPikgPT4ge1xuICAgICAgICAgIGlmIChicm93c2VyLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tTRU1EXSBNZXNzYWdlIGVycm9yOicsIGJyb3dzZXIucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHJlc3BvbnNlPy5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGE/LnJlc3VsdD8uaXNNYWxpY2lvdXMpIHtcbiAgICAgICAgICAgIGhhbmRsZU1hbGljaW91c1VybCh1cmwsIHJlc3BvbnNlLmRhdGEucmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlTWFsaWNpb3VzVXJsKHVybDogc3RyaW5nLCByZXN1bHQ6IFNjYW5SZXN1bHQpOiB2b2lkIHtcbiAgICAgIGNvbnNvbGUubG9nKCdbU0VNRF0gTWFsaWNpb3VzIFVSTCBkZXRlY3RlZDonLCB1cmwpO1xuXG4gICAgICBzaG93T3ZlcmxheSh7XG4gICAgICAgIHVybCxcbiAgICAgICAgYWNjdXJhY3k6IHJlc3VsdC5hY2N1cmFjeSxcbiAgICAgICAgb25Qcm9jZWVkOiAoKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1tTRU1EXSBVc2VyIGNob3NlIHRvIHByb2NlZWQnKTtcbiAgICAgICAgICByZW1vdmVPdmVybGF5KCk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uQ2xvc2U6ICgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnW1NFTURdIFVzZXIgY2hvc2UgdG8gY2xvc2UgdGFiJyk7XG4gICAgICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogTWVzc2FnZVR5cGUuRElTTUlTU19PVkVSTEFZLCBhY3Rpb246ICdjbG9zZScgfSk7XG4gICAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGFydFVybE1vbml0b3IoKTogdm9pZCB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoKSA9PiBvblVybENoYW5nZSgpKTtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgKCkgPT4gb25VcmxDaGFuZ2UoKSk7XG5cbiAgICAgIGNvbnN0IG9yaWdpbmFsUHVzaFN0YXRlID0gaGlzdG9yeS5wdXNoU3RhdGUuYmluZChoaXN0b3J5KTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsUmVwbGFjZVN0YXRlID0gaGlzdG9yeS5yZXBsYWNlU3RhdGUuYmluZChoaXN0b3J5KTtcblxuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICBvcmlnaW5hbFB1c2hTdGF0ZSguLi5hcmdzKTtcbiAgICAgICAgb25VcmxDaGFuZ2UoKTtcbiAgICAgIH07XG5cbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgb3JpZ2luYWxSZXBsYWNlU3RhdGUoLi4uYXJncyk7XG4gICAgICAgIG9uVXJsQ2hhbmdlKCk7XG4gICAgICB9O1xuXG4gICAgICBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICAgICAgaWYgKGN1cnJlbnRVcmwgIT09IHdpbmRvdy5sb2NhdGlvbi5ocmVmKSB7XG4gICAgICAgICAgb25VcmxDaGFuZ2UoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xuICAgICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblVybENoYW5nZSgpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICAgICAgaWYgKG5ld1VybCAhPT0gY3VycmVudFVybCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgW1NFTURdIFVSTCBjaGFuZ2VkOiAke2N1cnJlbnRVcmx9IC0+ICR7bmV3VXJsfWApO1xuICAgICAgICBjdXJyZW50VXJsID0gbmV3VXJsO1xuICAgICAgICByZW1vdmVPdmVybGF5KCk7XG4gICAgICAgIGNoZWNrVXJsKG5ld1VybCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuRm9yTWVzc2FnZXMoKTogdm9pZCB7XG4gICAgICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBfc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgICAgY29uc3QgbXNnID0gbWVzc2FnZSBhcyB7IHR5cGU6IHN0cmluZzsgdXJsPzogc3RyaW5nOyBhY2N1cmFjeT86IG51bWJlciB9O1xuXG4gICAgICAgIGlmIChtc2cudHlwZSA9PT0gTWVzc2FnZVR5cGUuU0hPV19PVkVSTEFZICYmIG1zZy51cmwpIHtcbiAgICAgICAgICBzaG93T3ZlcmxheSh7XG4gICAgICAgICAgICB1cmw6IG1zZy51cmwsXG4gICAgICAgICAgICBhY2N1cmFjeTogbXNnLmFjY3VyYWN5IHx8IDAsXG4gICAgICAgICAgICBvblByb2NlZWQ6ICgpID0+IHJlbW92ZU92ZXJsYXkoKSxcbiAgICAgICAgICAgIG9uQ2xvc2U6ICgpID0+IHdpbmRvdy5jbG9zZSgpLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobXNnLnR5cGUgPT09IE1lc3NhZ2VUeXBlLkRJU01JU1NfT1ZFUkxBWSkge1xuICAgICAgICAgIHJlbW92ZU92ZXJsYXkoKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAgICBpZiAob2JzZXJ2ZXIpIHtcbiAgICAgICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICBvYnNlcnZlciA9IG51bGw7XG4gICAgICB9XG4gICAgICByZW1vdmVPdmVybGF5KCk7XG4gICAgfSk7XG4gIH0sXG59KTtcbiIsIi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLnRzXG5mdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcblx0aWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuXHRpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIG1ldGhvZChgW3d4dF0gJHthcmdzLnNoaWZ0KCl9YCwgLi4uYXJncyk7XG5cdGVsc2UgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG59XG4vKipcbiogV3JhcHBlciBhcm91bmQgYGNvbnNvbGVgIHdpdGggYSBcIlt3eHRdXCIgcHJlZml4XG4qL1xuY29uc3QgbG9nZ2VyID0ge1xuXHRkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuXHRsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG5cdHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuXHRlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGxvZ2dlciB9OyIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcblxuLy8jcmVnaW9uIHNyYy91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLnRzXG52YXIgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCA9IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG5cdHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xuXHRjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuXHRcdHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuXHRcdHRoaXMubmV3VXJsID0gbmV3VXJsO1xuXHRcdHRoaXMub2xkVXJsID0gb2xkVXJsO1xuXHR9XG59O1xuLyoqXG4qIFJldHVybnMgYW4gZXZlbnQgbmFtZSB1bmlxdWUgdG8gdGhlIGV4dGVuc2lvbiBhbmQgY29udGVudCBzY3JpcHQgdGhhdCdzIHJ1bm5pbmcuXG4qL1xuZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuXHRyZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCwgZ2V0VW5pcXVlRXZlbnROYW1lIH07IiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5cbi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci50c1xuY29uc3Qgc3VwcG9ydHNOYXZpZ2F0aW9uQXBpID0gdHlwZW9mIGdsb2JhbFRoaXMubmF2aWdhdGlvbj8uYWRkRXZlbnRMaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiO1xuLyoqXG4qIENyZWF0ZSBhIHV0aWwgdGhhdCB3YXRjaGVzIGZvciBVUkwgY2hhbmdlcywgZGlzcGF0Y2hpbmcgdGhlIGN1c3RvbSBldmVudCB3aGVuIGRldGVjdGVkLiBTdG9wc1xuKiB3YXRjaGluZyB3aGVuIGNvbnRlbnQgc2NyaXB0IGlzIGludmFsaWRhdGVkLiBVc2VzIE5hdmlnYXRpb24gQVBJIHdoZW4gYXZhaWxhYmxlLCBvdGhlcndpc2VcbiogZmFsbHMgYmFjayB0byBwb2xsaW5nLlxuKi9cbmZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcblx0bGV0IGxhc3RVcmw7XG5cdGxldCB3YXRjaGluZyA9IGZhbHNlO1xuXHRyZXR1cm4geyBydW4oKSB7XG5cdFx0aWYgKHdhdGNoaW5nKSByZXR1cm47XG5cdFx0d2F0Y2hpbmcgPSB0cnVlO1xuXHRcdGxhc3RVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuXHRcdGlmIChzdXBwb3J0c05hdmlnYXRpb25BcGkpIGdsb2JhbFRoaXMubmF2aWdhdGlvbi5hZGRFdmVudExpc3RlbmVyKFwibmF2aWdhdGVcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRjb25zdCBuZXdVcmwgPSBuZXcgVVJMKGV2ZW50LmRlc3RpbmF0aW9uLnVybCk7XG5cdFx0XHRpZiAobmV3VXJsLmhyZWYgPT09IGxhc3RVcmwuaHJlZikgcmV0dXJuO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBsYXN0VXJsKSk7XG5cdFx0XHRsYXN0VXJsID0gbmV3VXJsO1xuXHRcdH0sIHsgc2lnbmFsOiBjdHguc2lnbmFsIH0pO1xuXHRcdGVsc2UgY3R4LnNldEludGVydmFsKCgpID0+IHtcblx0XHRcdGNvbnN0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG5cdFx0XHRpZiAobmV3VXJsLmhyZWYgIT09IGxhc3RVcmwuaHJlZikge1xuXHRcdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIGxhc3RVcmwpKTtcblx0XHRcdFx0bGFzdFVybCA9IG5ld1VybDtcblx0XHRcdH1cblx0XHR9LCAxZTMpO1xuXHR9IH07XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgY3JlYXRlTG9jYXRpb25XYXRjaGVyIH07IiwiaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5pbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5cbi8vI3JlZ2lvbiBzcmMvdXRpbHMvY29udGVudC1zY3JpcHQtY29udGV4dC50c1xuLyoqXG4qIEltcGxlbWVudHMgW2BBYm9ydENvbnRyb2xsZXJgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQWJvcnRDb250cm9sbGVyKS5cbiogVXNlZCB0byBkZXRlY3QgYW5kIHN0b3AgY29udGVudCBzY3JpcHQgY29kZSB3aGVuIHRoZSBzY3JpcHQgaXMgaW52YWxpZGF0ZWQuXG4qXG4qIEl0IGFsc28gcHJvdmlkZXMgc2V2ZXJhbCB1dGlsaXRpZXMgbGlrZSBgY3R4LnNldFRpbWVvdXRgIGFuZCBgY3R4LnNldEludGVydmFsYCB0aGF0IHNob3VsZCBiZSB1c2VkIGluXG4qIGNvbnRlbnQgc2NyaXB0cyBpbnN0ZWFkIG9mIGB3aW5kb3cuc2V0VGltZW91dGAgb3IgYHdpbmRvdy5zZXRJbnRlcnZhbGAuXG4qXG4qIFRvIGNyZWF0ZSBjb250ZXh0IGZvciB0ZXN0aW5nLCB5b3UgY2FuIHVzZSB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvcjpcbipcbiogYGBgdHNcbiogaW1wb3J0IHsgQ29udGVudFNjcmlwdENvbnRleHQgfSBmcm9tICd3eHQvdXRpbHMvY29udGVudC1zY3JpcHRzLWNvbnRleHQnO1xuKlxuKiB0ZXN0KFwic3RvcmFnZSBsaXN0ZW5lciBzaG91bGQgYmUgcmVtb3ZlZCB3aGVuIGNvbnRleHQgaXMgaW52YWxpZGF0ZWRcIiwgKCkgPT4ge1xuKiAgIGNvbnN0IGN0eCA9IG5ldyBDb250ZW50U2NyaXB0Q29udGV4dCgndGVzdCcpO1xuKiAgIGNvbnN0IGl0ZW0gPSBzdG9yYWdlLmRlZmluZUl0ZW0oXCJsb2NhbDpjb3VudFwiLCB7IGRlZmF1bHRWYWx1ZTogMCB9KTtcbiogICBjb25zdCB3YXRjaGVyID0gdmkuZm4oKTtcbipcbiogICBjb25zdCB1bndhdGNoID0gaXRlbS53YXRjaCh3YXRjaGVyKTtcbiogICBjdHgub25JbnZhbGlkYXRlZCh1bndhdGNoKTsgLy8gTGlzdGVuIGZvciBpbnZhbGlkYXRlIGhlcmVcbipcbiogICBhd2FpdCBpdGVtLnNldFZhbHVlKDEpO1xuKiAgIGV4cGVjdCh3YXRjaGVyKS50b0JlQ2FsbGVkVGltZXMoMSk7XG4qICAgZXhwZWN0KHdhdGNoZXIpLnRvQmVDYWxsZWRXaXRoKDEsIDApO1xuKlxuKiAgIGN0eC5ub3RpZnlJbnZhbGlkYXRlZCgpOyAvLyBVc2UgdGhpcyBmdW5jdGlvbiB0byBpbnZhbGlkYXRlIHRoZSBjb250ZXh0XG4qICAgYXdhaXQgaXRlbS5zZXRWYWx1ZSgyKTtcbiogICBleHBlY3Qod2F0Y2hlcikudG9CZUNhbGxlZFRpbWVzKDEpO1xuKiB9KTtcbiogYGBgXG4qL1xudmFyIENvbnRlbnRTY3JpcHRDb250ZXh0ID0gY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuXHRzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIik7XG5cdGlkO1xuXHRhYm9ydENvbnRyb2xsZXI7XG5cdGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcblx0Y29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHR0aGlzLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMik7XG5cdFx0dGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG5cdFx0dGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuXHRcdHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG5cdH1cblx0Z2V0IHNpZ25hbCgpIHtcblx0XHRyZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuXHR9XG5cdGFib3J0KHJlYXNvbikge1xuXHRcdHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuXHR9XG5cdGdldCBpc0ludmFsaWQoKSB7XG5cdFx0aWYgKGJyb3dzZXIucnVudGltZT8uaWQgPT0gbnVsbCkgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuXHRcdHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuXHR9XG5cdGdldCBpc1ZhbGlkKCkge1xuXHRcdHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG5cdH1cblx0LyoqXG5cdCogQWRkIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgY29udGVudCBzY3JpcHQncyBjb250ZXh0IGlzIGludmFsaWRhdGVkLlxuXHQqXG5cdCogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcblx0KiBjb25zdCByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyID0gY3R4Lm9uSW52YWxpZGF0ZWQoKCkgPT4ge1xuXHQqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG5cdCogfSlcblx0KiAvLyAuLi5cblx0KiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG5cdCovXG5cdG9uSW52YWxpZGF0ZWQoY2IpIHtcblx0XHR0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuXHRcdHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuXHR9XG5cdC8qKlxuXHQqIFJldHVybiBhIHByb21pc2UgdGhhdCBuZXZlciByZXNvbHZlcy4gVXNlZnVsIGlmIHlvdSBoYXZlIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgc2hvdWxkbid0IHJ1blxuXHQqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG5cdCogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuXHQqXG5cdCogICAvLyAuLi5cblx0KiB9XG5cdCovXG5cdGJsb2NrKCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgoKSA9PiB7fSk7XG5cdH1cblx0LyoqXG5cdCogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cblx0KlxuXHQqIEludGVydmFscyBjYW4gYmUgY2xlYXJlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNsZWFySW50ZXJ2YWxgIGZ1bmN0aW9uLlxuXHQqL1xuXHRzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG5cdFx0Y29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG5cdFx0XHRpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG5cdFx0fSwgdGltZW91dCk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcblx0XHRyZXR1cm4gaWQ7XG5cdH1cblx0LyoqXG5cdCogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuXHQqXG5cdCogVGltZW91dHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBzZXRUaW1lb3V0YCBmdW5jdGlvbi5cblx0Ki9cblx0c2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG5cdFx0Y29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcblx0XHR9LCB0aW1lb3V0KTtcblx0XHR0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cdC8qKlxuXHQqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG5cdCogaW52YWxpZGF0ZWQuXG5cdCpcblx0KiBDYWxsYmFja3MgY2FuIGJlIGNhbmNlbGVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2FuY2VsQW5pbWF0aW9uRnJhbWVgIGZ1bmN0aW9uLlxuXHQqL1xuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcblx0XHRjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuXHRcdFx0aWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fSk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cdC8qKlxuXHQqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuXHQqIGludmFsaWRhdGVkLlxuXHQqXG5cdCogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbElkbGVDYWxsYmFja2AgZnVuY3Rpb24uXG5cdCovXG5cdHJlcXVlc3RJZGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMpIHtcblx0XHRjb25zdCBpZCA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soKC4uLmFyZ3MpID0+IHtcblx0XHRcdGlmICghdGhpcy5zaWduYWwuYWJvcnRlZCkgY2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fSwgb3B0aW9ucyk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbElkbGVDYWxsYmFjayhpZCkpO1xuXHRcdHJldHVybiBpZDtcblx0fVxuXHRhZGRFdmVudExpc3RlbmVyKHRhcmdldCwgdHlwZSwgaGFuZGxlciwgb3B0aW9ucykge1xuXHRcdGlmICh0eXBlID09PSBcInd4dDpsb2NhdGlvbmNoYW5nZVwiKSB7XG5cdFx0XHRpZiAodGhpcy5pc1ZhbGlkKSB0aGlzLmxvY2F0aW9uV2F0Y2hlci5ydW4oKTtcblx0XHR9XG5cdFx0dGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXI/Lih0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSwgaGFuZGxlciwge1xuXHRcdFx0Li4ub3B0aW9ucyxcblx0XHRcdHNpZ25hbDogdGhpcy5zaWduYWxcblx0XHR9KTtcblx0fVxuXHQvKipcblx0KiBAaW50ZXJuYWxcblx0KiBBYm9ydCB0aGUgYWJvcnQgY29udHJvbGxlciBhbmQgZXhlY3V0ZSBhbGwgYG9uSW52YWxpZGF0ZWRgIGxpc3RlbmVycy5cblx0Ki9cblx0bm90aWZ5SW52YWxpZGF0ZWQoKSB7XG5cdFx0dGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG5cdFx0bG9nZ2VyLmRlYnVnKGBDb250ZW50IHNjcmlwdCBcIiR7dGhpcy5jb250ZW50U2NyaXB0TmFtZX1cIiBjb250ZXh0IGludmFsaWRhdGVkYCk7XG5cdH1cblx0c3RvcE9sZFNjcmlwdHMoKSB7XG5cdFx0ZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLCB7IGRldGFpbDoge1xuXHRcdFx0Y29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG5cdFx0XHRtZXNzYWdlSWQ6IHRoaXMuaWRcblx0XHR9IH0pKTtcblx0XHR3aW5kb3cucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0dHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuXHRcdFx0Y29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG5cdFx0XHRtZXNzYWdlSWQ6IHRoaXMuaWRcblx0XHR9LCBcIipcIik7XG5cdH1cblx0dmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG5cdFx0Y29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRldGFpbD8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG5cdFx0Y29uc3QgaXNGcm9tU2VsZiA9IGV2ZW50LmRldGFpbD8ubWVzc2FnZUlkID09PSB0aGlzLmlkO1xuXHRcdHJldHVybiBpc1NhbWVDb250ZW50U2NyaXB0ICYmICFpc0Zyb21TZWxmO1xuXHR9XG5cdGxpc3RlbkZvck5ld2VyU2NyaXB0cygpIHtcblx0XHRjb25zdCBjYiA9IChldmVudCkgPT4ge1xuXHRcdFx0aWYgKCEoZXZlbnQgaW5zdGFuY2VvZiBDdXN0b21FdmVudCkgfHwgIXRoaXMudmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSkgcmV0dXJuO1xuXHRcdFx0dGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuXHRcdH07XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsIGNiKTtcblx0XHR0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsIGNiKSk7XG5cdH1cbn07XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgQ29udGVudFNjcmlwdENvbnRleHQgfTsiXSwibmFtZXMiOlsiZGVmaW5pdGlvbiIsImJyb3dzZXIiLCJyZXN1bHQiLCJwcmludCIsImxvZ2dlciIsIld4dExvY2F0aW9uQ2hhbmdlRXZlbnQiLCJDb250ZW50U2NyaXB0Q29udGV4dCJdLCJtYXBwaW5ncyI6Ijs7QUFDQSxXQUFTLG9CQUFvQkEsYUFBWTtBQUN4QyxXQUFPQTtBQUFBLEVBQ1I7QUNGTyxRQUFNQyxZQUFVLFdBQVcsU0FBUyxTQUFTLEtBQ2hELFdBQVcsVUFDWCxXQUFXO0FDV2YsUUFBTSxVQUFVO0FDVlQsUUFBTSxhQUFhO0FBRW5CLFFBQU0sY0FBYztBQUFBLElBTXpCLGtCQUFrQjtBQUFBLElBQ2xCLGlCQUFpQjtBQUFBLElBQ2pCLGVBQWU7QUFBQSxFQUdqQjtBQUVPLFFBQU0sU0FBUztBQUFBLElBSXBCLFlBQVk7QUFBQSxJQUVaLFlBQVk7QUFBQSxFQUlkO0FDcEJPLFdBQVMsY0FBYyxTQUFzQztB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
content;