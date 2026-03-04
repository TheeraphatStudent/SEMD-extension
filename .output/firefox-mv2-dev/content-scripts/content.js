var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  const OVERLAY_ID = "semd-warning-overlay";
  const LABELS = {
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
        ">${LABELS.OVERLAY_QUESTION}</p>

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
        ">ความแม่นยำ: ${accuracy.toFixed(2)}%</p>

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
          ">${LABELS.OVERLAY_PROCEED}</button>

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
          ">${LABELS.OVERLAY_CLOSE}</button>
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
    DISMISS_OVERLAY: "DISMISS_OVERLAY",
    CLOSE_TAB: "CLOSE_TAB"
  };
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
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
          {
            type: MessageType.CHECK_URL,
            payload: {
              url
            }
          },
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
          if (msg.type === MessageType.CLOSE_TAB && _sender.tab?.id) {
            browser.tabs.remove(_sender.tab.id);
            sendResponse({ success: true });
            return true;
          }
          if (msg.type === MessageType.SHOW_OVERLAY && msg.url) {
            showOverlay({
              url: msg.url,
              accuracy: msg.accuracy || 0,
              onProceed: () => {
                browser.runtime.sendMessage({ type: MessageType.DISMISS_OVERLAY, action: "proceed", requestId: msg.requestId });
                removeOverlay();
              },
              onClose: () => {
                browser.runtime.sendMessage({ type: MessageType.DISMISS_OVERLAY, action: "close", requestId: msg.requestId });
                browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
                  if (tabs[0]) {
                    browser.tabs.remove(tabs[0].id);
                  }
                });
              }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9zcmMvdXRpbHMvY29uc3RhbnRzLnRzIiwiLi4vLi4vLi4vc3JjL3V0aWxzL292ZXJsYXkudHMiLCIuLi8uLi8uLi9zcmMvdXRpbHMvdHlwZXMudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vc3JjL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyNyZWdpb24gc3JjL3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC50c1xuZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG5cdHJldHVybiBkZWZpbml0aW9uO1xufVxuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGRlZmluZUNvbnRlbnRTY3JpcHQgfTsiLCJleHBvcnQgY29uc3QgREVGQVVMVF9BUElfRU5EUE9JTlQgPSAnaHR0cDovL2xvY2FsaG9zdDo4MDAwL2FwaS92MS9wcmVkaWN0JztcbmV4cG9ydCBjb25zdCBFWFRFTlNJT05fTkFNRSA9ICdTRU1EJztcbmV4cG9ydCBjb25zdCBNQVhfSElTVE9SWV9TSVpFID0gMTAwO1xuZXhwb3J0IGNvbnN0IEFDQ0VTU19DT0RFX0xFTkdUSCA9IDY7XG5leHBvcnQgY29uc3QgT1ZFUkxBWV9JRCA9ICdzZW1kLXdhcm5pbmctb3ZlcmxheSc7XG5cbmV4cG9ydCBjb25zdCBMQUJFTFMgPSB7XG4gIExPR0lOX1RJVExFOiAnTG9naW4nLFxuICBMT0dJTl9QUk9NUFQ6ICfguIHguKPguK3guIEgQWNjZXNzIGNvZGUg4LiI4Liy4LiB4LmA4Lin4LmH4Lia4LmE4LiL4LiV4LmMOicsXG4gIExPR0lOX0JVVFRPTjogJ+C5gOC4guC5ieC4suC5g+C4iuC5ieC4h+C4suC4mScsXG4gIFNBRkU6ICfguJvguKXguK3guJTguKDguLHguKInLFxuICBEQU5HRVI6ICfguK3guLHguJnguJXguKPguLLguKInLFxuICBPVkVSTEFZX1FVRVNUSU9OOiAn4LiE4Li44LiT4LiV4LmJ4Lit4LiH4LiB4Liy4Lij4LmA4LiC4LmJ4Liy4LmA4Lin4LmH4Lia4LmE4LiL4LiV4LmMJyxcbiAgT1ZFUkxBWV9QUk9DRUVEOiAn4LmD4LiK4LmILCDguJTguLPguYDguJnguLTguJnguIHguLLguKPguJXguYjguK0nLFxuICBPVkVSTEFZX0NMT1NFOiAn4LmE4Lih4LmILCDguJvguLTguJTguYDguKfguYfguJrguYTguIvguJXguYzguJnguLXguYknLFxuICBTRVRUSU5HU19USVRMRTogJ+C4leC4seC5ieC4h+C4hOC5iOC4sicsXG4gIERBU0hCT0FSRF9USVRMRTogJ+C4m+C4o+C4sOC4p+C4seC4leC4tOC4geC4suC4o+C4quC5geC4geC4mScsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgQ09MT1JTID0ge1xuICBDUkVBTV9CRzogJyNGRkY5RTYnLFxuICBHT0xEX0FDQ0VOVDogJyNGNUQ3NkUnLFxuICBHT0xEX0JPUkRFUjogJyNDNEE4NEInLFxuICBTQUZFX0dSRUVOOiAnIzRDQUY1MCcsXG4gIFNBRkVfR1JFRU5fREFSSzogJyMzODhFM0MnLFxuICBEQU5HRVJfUkVEOiAnI0Y0NDMzNicsXG4gIERBTkdFUl9SRURfREFSSzogJyNEMzJGMkYnLFxuICBEQU5HRVJfUElOS19CRzogJyNGRkVCRUUnLFxuICBTQUZFX0dSRUVOX0JHOiAnI0U4RjVFOScsXG59IGFzIGNvbnN0O1xuIiwiaW1wb3J0IHsgT1ZFUkxBWV9JRCwgTEFCRUxTLCBDT0xPUlMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3ZlcmxheU9wdGlvbnMge1xuICB1cmw6IHN0cmluZztcbiAgYWNjdXJhY3k6IG51bWJlcjtcbiAgb25Qcm9jZWVkOiAoKSA9PiB2b2lkO1xuICBvbkNsb3NlOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlT3ZlcmxheShvcHRpb25zOiBPdmVybGF5T3B0aW9ucyk6IEhUTUxFbGVtZW50IHtcbiAgY29uc3QgeyB1cmwsIGFjY3VyYWN5LCBvblByb2NlZWQsIG9uQ2xvc2UgfSA9IG9wdGlvbnM7XG5cbiAgY29uc3Qgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBvdmVybGF5LmlkID0gT1ZFUkxBWV9JRDtcbiAgb3ZlcmxheS5pbm5lckhUTUwgPSBgXG4gICAgPGRpdiBzdHlsZT1cIlxuICAgICAgcG9zaXRpb246IGZpeGVkO1xuICAgICAgdG9wOiAwO1xuICAgICAgbGVmdDogMDtcbiAgICAgIHdpZHRoOiAxMDAlO1xuICAgICAgaGVpZ2h0OiAxMDAlO1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgyNDQsIDY3LCA1NCwgMC4yKTtcbiAgICAgIHotaW5kZXg6IDIxNDc0ODM2NDc7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCAnTm90byBTYW5zIFRoYWknLCBzYW5zLXNlcmlmO1xuICAgIFwiPlxuICAgICAgPGRpdiBzdHlsZT1cIlxuICAgICAgICBiYWNrZ3JvdW5kOiB3aGl0ZTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMTZweDtcbiAgICAgICAgcGFkZGluZzogMzJweCA0MHB4O1xuICAgICAgICBtYXgtd2lkdGg6IDQyMHB4O1xuICAgICAgICB3aWR0aDogOTAlO1xuICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICAgIGJveC1zaGFkb3c6IDAgOHB4IDMycHggcmdiYSgwLDAsMCwwLjI1KTtcbiAgICAgIFwiPlxuICAgICAgICA8ZGl2IHN0eWxlPVwiXG4gICAgICAgICAgd2lkdGg6IDgwcHg7XG4gICAgICAgICAgaGVpZ2h0OiA4MHB4O1xuICAgICAgICAgIG1hcmdpbjogMCBhdXRvIDIwcHg7XG4gICAgICAgICAgYmFja2dyb3VuZDogJHtDT0xPUlMuREFOR0VSX1JFRH07XG4gICAgICAgICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgICAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICAgICAgXCI+XG4gICAgICAgICAgPHN2ZyB3aWR0aD1cIjQwXCIgaGVpZ2h0PVwiNDBcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICAgICAgICA8cGF0aCBkPVwiTTEyIDJMNCA2VjEyQzQgMTYuNDIgNy40IDIwLjc0IDEyIDIyQzE2LjYgMjAuNzQgMjAgMTYuNDIgMjAgMTJWNkwxMiAyWlwiIGZpbGw9XCJ3aGl0ZVwiIGZpbGwtb3BhY2l0eT1cIjAuM1wiLz5cbiAgICAgICAgICAgIDx0ZXh0IHg9XCIxMlwiIHk9XCIxNlwiIHRleHQtYW5jaG9yPVwibWlkZGxlXCIgZmlsbD1cIndoaXRlXCIgZm9udC1zaXplPVwiMTRcIiBmb250LXdlaWdodD1cImJvbGRcIj4hPC90ZXh0PlxuICAgICAgICAgIDwvc3ZnPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8cCBzdHlsZT1cIlxuICAgICAgICAgIGZvbnQtc2l6ZTogMThweDtcbiAgICAgICAgICBjb2xvcjogIzMzMztcbiAgICAgICAgICBtYXJnaW46IDAgMCAxMnB4IDA7XG4gICAgICAgICAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgICAgICAgXCI+JHtMQUJFTFMuT1ZFUkxBWV9RVUVTVElPTn08L3A+XG5cbiAgICAgICAgPHAgc3R5bGU9XCJcbiAgICAgICAgICBmb250LXNpemU6IDE0cHg7XG4gICAgICAgICAgY29sb3I6ICR7Q09MT1JTLkRBTkdFUl9SRUR9O1xuICAgICAgICAgIG1hcmdpbjogMCAwIDhweCAwO1xuICAgICAgICAgIHdvcmQtYnJlYWs6IGJyZWFrLWFsbDtcbiAgICAgICAgICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgICAgICAgXCI+JHt1cmx9PC9wPlxuXG4gICAgICAgIDxwIHN0eWxlPVwiXG4gICAgICAgICAgZm9udC1zaXplOiAxMnB4O1xuICAgICAgICAgIGNvbG9yOiAjNjY2O1xuICAgICAgICAgIG1hcmdpbjogMCAwIDI0cHggMDtcbiAgICAgICAgXCI+4LiE4Lin4Liy4Lih4LmB4Lih4LmI4LiZ4Lii4LizOiAkeyhhY2N1cmFjeS50b0ZpeGVkKDIpKX0lPC9wPlxuXG4gICAgICAgIDxkaXYgc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyBnYXA6IDEycHg7IGp1c3RpZnktY29udGVudDogY2VudGVyOyBmbGV4LXdyYXA6IHdyYXA7XCI+XG4gICAgICAgICAgPGJ1dHRvbiBpZD1cInNlbWQtb3ZlcmxheS1wcm9jZWVkXCIgc3R5bGU9XCJcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgICAgICAgY29sb3I6ICR7Q09MT1JTLkRBTkdFUl9SRUR9O1xuICAgICAgICAgICAgYm9yZGVyOiAycHggc29saWQgJHtDT0xPUlMuREFOR0VSX1JFRH07XG4gICAgICAgICAgICBwYWRkaW5nOiAxMnB4IDI0cHg7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiA4cHg7XG4gICAgICAgICAgICBmb250LXNpemU6IDE0cHg7XG4gICAgICAgICAgICBmb250LXdlaWdodDogNTAwO1xuICAgICAgICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgICAgICAgdHJhbnNpdGlvbjogYWxsIDAuMnM7XG4gICAgICAgICAgXCI+JHtMQUJFTFMuT1ZFUkxBWV9QUk9DRUVEfTwvYnV0dG9uPlxuXG4gICAgICAgICAgPGJ1dHRvbiBpZD1cInNlbWQtb3ZlcmxheS1jbG9zZVwiIHN0eWxlPVwiXG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiAke0NPTE9SUy5TQUZFX0dSRUVOfTtcbiAgICAgICAgICAgIGNvbG9yOiB3aGl0ZTtcbiAgICAgICAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgICAgICAgIHBhZGRpbmc6IDEycHggMjRweDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XG4gICAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICAgICAgICB0cmFuc2l0aW9uOiBhbGwgMC4ycztcbiAgICAgICAgICBcIj4ke0xBQkVMUy5PVkVSTEFZX0NMT1NFfTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICBgO1xuXG4gIGNvbnN0IHByb2NlZWRCdG4gPSBvdmVybGF5LnF1ZXJ5U2VsZWN0b3IoJyNzZW1kLW92ZXJsYXktcHJvY2VlZCcpO1xuICBjb25zdCBjbG9zZUJ0biA9IG92ZXJsYXkucXVlcnlTZWxlY3RvcignI3NlbWQtb3ZlcmxheS1jbG9zZScpO1xuXG4gIHByb2NlZWRCdG4/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIG9uUHJvY2VlZCgpO1xuICAgIHJlbW92ZU92ZXJsYXkoKTtcbiAgfSk7XG5cbiAgY2xvc2VCdG4/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIG9uQ2xvc2UoKTtcbiAgfSk7XG5cbiAgcmV0dXJuIG92ZXJsYXk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaG93T3ZlcmxheShvcHRpb25zOiBPdmVybGF5T3B0aW9ucyk6IHZvaWQge1xuICByZW1vdmVPdmVybGF5KCk7XG5cbiAgY29uc3Qgb3ZlcmxheSA9IGNyZWF0ZU92ZXJsYXkob3B0aW9ucyk7XG5cbiAgaWYgKGRvY3VtZW50LmJvZHkpIHtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG92ZXJsYXkpO1xuICB9IGVsc2Uge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG92ZXJsYXkpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVPdmVybGF5KCk6IHZvaWQge1xuICBjb25zdCBleGlzdGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKE9WRVJMQVlfSUQpO1xuICBpZiAoZXhpc3RpbmcpIHtcbiAgICBleGlzdGluZy5yZW1vdmUoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNPdmVybGF5VmlzaWJsZSgpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoT1ZFUkxBWV9JRCk7XG59XG4iLCJleHBvcnQgY29uc3QgTWVzc2FnZVR5cGUgPSB7XG4gIENIRUNLX1VSTDogJ0NIRUNLX1VSTCcsXG4gIFVSTF9SRVNVTFQ6ICdVUkxfUkVTVUxUJyxcbiAgU0hPV19PVkVSTEFZOiAnU0hPV19PVkVSTEFZJyxcbiAgRElTTUlTU19PVkVSTEFZOiAnRElTTUlTU19PVkVSTEFZJyxcbiAgR0VUX0FVVEhfU1RBVFVTOiAnR0VUX0FVVEhfU1RBVFVTJyxcbiAgVkFMSURBVEVfQUNDRVNTX0NPREU6ICdWQUxJREFURV9BQ0NFU1NfQ09ERScsXG4gIExPR09VVDogJ0xPR09VVCcsXG4gIENMT1NFX1RBQjogJ0NMT1NFX1RBQicsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBNZXNzYWdlVHlwZUtleSA9IGtleW9mIHR5cGVvZiBNZXNzYWdlVHlwZTtcbmV4cG9ydCB0eXBlIE1lc3NhZ2VUeXBlVmFsdWUgPSAodHlwZW9mIE1lc3NhZ2VUeXBlKVtNZXNzYWdlVHlwZUtleV07XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NhblJlc3VsdCB7XG4gIHVybDogc3RyaW5nO1xuICBpc01hbGljaW91czogYm9vbGVhbjtcbiAgYWNjdXJhY3k6IG51bWJlcjtcbiAgc3VnZ2VzdGVkOiBzdHJpbmc7XG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGVja1VybE1lc3NhZ2Uge1xuICB0eXBlOiB0eXBlb2YgTWVzc2FnZVR5cGUuQ0hFQ0tfVVJMO1xuICB1cmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBVcmxSZXN1bHRNZXNzYWdlIHtcbiAgdHlwZTogdHlwZW9mIE1lc3NhZ2VUeXBlLlVSTF9SRVNVTFQ7XG4gIHJlc3VsdDogU2NhblJlc3VsdDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTaG93T3ZlcmxheU1lc3NhZ2Uge1xuICB0eXBlOiB0eXBlb2YgTWVzc2FnZVR5cGUuU0hPV19PVkVSTEFZO1xuICB1cmw6IHN0cmluZztcbiAgYWNjdXJhY3k6IG51bWJlcjtcbiAgcmVxdWVzdElkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlzbWlzc092ZXJsYXlNZXNzYWdlIHtcbiAgdHlwZTogdHlwZW9mIE1lc3NhZ2VUeXBlLkRJU01JU1NfT1ZFUkxBWTtcbiAgYWN0aW9uOiAncHJvY2VlZCcgfCAnY2xvc2UnO1xuICByZXF1ZXN0SWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHZXRBdXRoU3RhdHVzTWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5HRVRfQVVUSF9TVEFUVVM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmFsaWRhdGVBY2Nlc3NDb2RlTWVzc2FnZSB7XG4gIHR5cGU6IHR5cGVvZiBNZXNzYWdlVHlwZS5WQUxJREFURV9BQ0NFU1NfQ09ERTtcbiAgY29kZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvZ291dE1lc3NhZ2Uge1xuICB0eXBlOiB0eXBlb2YgTWVzc2FnZVR5cGUuTE9HT1VUO1xufVxuXG5leHBvcnQgdHlwZSBFeHRlbnNpb25NZXNzYWdlID1cbiAgfCBDaGVja1VybE1lc3NhZ2VcbiAgfCBVcmxSZXN1bHRNZXNzYWdlXG4gIHwgU2hvd092ZXJsYXlNZXNzYWdlXG4gIHwgRGlzbWlzc092ZXJsYXlNZXNzYWdlXG4gIHwgR2V0QXV0aFN0YXR1c01lc3NhZ2VcbiAgfCBWYWxpZGF0ZUFjY2Vzc0NvZGVNZXNzYWdlXG4gIHwgTG9nb3V0TWVzc2FnZTtcblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlUmVzcG9uc2U8VCA9IHVua25vd24+IHtcbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgZGF0YT86IFQ7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhTdGF0dXNSZXNwb25zZSB7XG4gIGlzQXV0aGVudGljYXRlZDogYm9vbGVhbjtcbiAgYWNjZXNzQ29kZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGVja1VybFJlc3BvbnNlIHtcbiAgcmVzdWx0OiBTY2FuUmVzdWx0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByZWRpY3RSZXF1ZXN0IHtcbiAgdXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJlZGljdEFwaVJlc3VsdCB7XG4gIGlzX21hbGljaW91czogYm9vbGVhbjtcbiAgYWNjdXJhdGU6IG51bWJlcjtcbiAgc3VnZ2VzdGVkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJlZGljdFJlc3BvbnNlIHtcbiAgcmVzdWx0OiBQcmVkaWN0QXBpUmVzdWx0O1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBzdGF0dXM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpQ29uZmlnIHtcbiAgYXBpRW5kcG9pbnQ6IHN0cmluZztcbiAgYXBpS2V5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmFnZVNjaGVtYSB7XG4gIGFjY2Vzc0NvZGU6IHN0cmluZyB8IG51bGw7XG4gIGFwaUVuZHBvaW50OiBzdHJpbmc7XG4gIGFwaUtleTogc3RyaW5nO1xuICBzY2FuSGlzdG9yeTogU2NhblJlc3VsdFtdO1xuICBpc0F1dGhlbnRpY2F0ZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFN0b3JhZ2VLZXkgPSBrZXlvZiBTdG9yYWdlU2NoZW1hO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TVE9SQUdFOiBTdG9yYWdlU2NoZW1hID0ge1xuICBhY2Nlc3NDb2RlOiBudWxsLFxuICBhcGlFbmRwb2ludDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdjEvcHJlZGljdC9wcmVkaWN0JyxcbiAgYXBpS2V5OiAnJyxcbiAgc2Nhbkhpc3Rvcnk6IFtdLFxuICBpc0F1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxufTtcbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgYnJvd3NlciQxIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcblxuLy8jcmVnaW9uIHNyYy9icm93c2VyLnRzXG4vKipcbiogQ29udGFpbnMgdGhlIGBicm93c2VyYCBleHBvcnQgd2hpY2ggeW91IHNob3VsZCB1c2UgdG8gYWNjZXNzIHRoZSBleHRlbnNpb24gQVBJcyBpbiB5b3VyIHByb2plY3Q6XG4qIGBgYHRzXG4qIGltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG4qXG4qIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4qICAgLy8gLi4uXG4qIH0pXG4qIGBgYFxuKiBAbW9kdWxlIHd4dC9icm93c2VyXG4qL1xuY29uc3QgYnJvd3NlciA9IGJyb3dzZXIkMTtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBicm93c2VyIH07IiwiLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ3eHQvYnJvd3NlclwiIC8+XG5cbmltcG9ydCB7IHNob3dPdmVybGF5LCByZW1vdmVPdmVybGF5IH0gZnJvbSAnQC91dGlscy9vdmVybGF5JztcbmltcG9ydCB7IE1lc3NhZ2VUeXBlLCB0eXBlIFNjYW5SZXN1bHQsIHR5cGUgTWVzc2FnZVJlc3BvbnNlLCB0eXBlIENoZWNrVXJsUmVzcG9uc2UsIHR5cGUgU2hvd092ZXJsYXlNZXNzYWdlLCB0eXBlIEV4dGVuc2lvbk1lc3NhZ2UgfSBmcm9tICdAL3V0aWxzL3R5cGVzJztcbmltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbnRlbnRTY3JpcHQoe1xuICBtYXRjaGVzOiBbJzxhbGxfdXJscz4nXSxcbiAgcnVuQXQ6ICdkb2N1bWVudF9zdGFydCcsXG5cbiAgbWFpbihjdHgpIHtcbiAgICBjb25zb2xlLmxvZygnW1NFTURdIENvbnRlbnQgc2NyaXB0IGxvYWRlZCcpO1xuXG4gICAgbGV0IGN1cnJlbnRVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgICBsZXQgb2JzZXJ2ZXI6IE11dGF0aW9uT2JzZXJ2ZXIgfCBudWxsID0gbnVsbDtcblxuICAgIGluaXQoKTtcblxuICAgIGZ1bmN0aW9uIGluaXQoKTogdm9pZCB7XG4gICAgICBjaGVja1VybChjdXJyZW50VXJsKTtcbiAgICAgIHN0YXJ0VXJsTW9uaXRvcigpO1xuICAgICAgbGlzdGVuRm9yTWVzc2FnZXMoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja1VybCh1cmw6IHN0cmluZyk6IHZvaWQge1xuICAgICAgY29uc29sZS5sb2coYFtTRU1EXSBDaGVja2luZyBVUkw6ICR7dXJsfWApO1xuXG4gICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5DSEVDS19VUkwsXG4gICAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgICAgdXJsOiB1cmxcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIChyZXNwb25zZTogTWVzc2FnZVJlc3BvbnNlPENoZWNrVXJsUmVzcG9uc2U+KSA9PiB7XG4gICAgICAgICAgaWYgKGJyb3dzZXIucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW1NFTURdIE1lc3NhZ2UgZXJyb3I6JywgYnJvd3Nlci5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocmVzcG9uc2U/LnN1Y2Nlc3MgJiYgcmVzcG9uc2UuZGF0YT8ucmVzdWx0Py5pc01hbGljaW91cykge1xuICAgICAgICAgICAgaGFuZGxlTWFsaWNpb3VzVXJsKHVybCwgcmVzcG9uc2UuZGF0YS5yZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVNYWxpY2lvdXNVcmwodXJsOiBzdHJpbmcsIHJlc3VsdDogU2NhblJlc3VsdCk6IHZvaWQge1xuICAgICAgY29uc29sZS5sb2coJ1tTRU1EXSBNYWxpY2lvdXMgVVJMIGRldGVjdGVkOicsIHVybCk7XG5cbiAgICAgIHNob3dPdmVybGF5KHtcbiAgICAgICAgdXJsLFxuICAgICAgICBhY2N1cmFjeTogcmVzdWx0LmFjY3VyYWN5LFxuICAgICAgICBvblByb2NlZWQ6ICgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnW1NFTURdIFVzZXIgY2hvc2UgdG8gcHJvY2VlZCcpO1xuICAgICAgICAgIHJlbW92ZU92ZXJsYXkoKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdbU0VNRF0gVXNlciBjaG9zZSB0byBjbG9zZSB0YWInKTtcbiAgICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBNZXNzYWdlVHlwZS5ESVNNSVNTX09WRVJMQVksIGFjdGlvbjogJ2Nsb3NlJyB9KTtcbiAgICAgICAgICB3aW5kb3cuY2xvc2UoKTtcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0YXJ0VXJsTW9uaXRvcigpOiB2b2lkIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsICgpID0+IG9uVXJsQ2hhbmdlKCkpO1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCAoKSA9PiBvblVybENoYW5nZSgpKTtcblxuICAgICAgY29uc3Qgb3JpZ2luYWxQdXNoU3RhdGUgPSBoaXN0b3J5LnB1c2hTdGF0ZS5iaW5kKGhpc3RvcnkpO1xuICAgICAgY29uc3Qgb3JpZ2luYWxSZXBsYWNlU3RhdGUgPSBoaXN0b3J5LnJlcGxhY2VTdGF0ZS5iaW5kKGhpc3RvcnkpO1xuXG4gICAgICBoaXN0b3J5LnB1c2hTdGF0ZSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIG9yaWdpbmFsUHVzaFN0YXRlKC4uLmFyZ3MpO1xuICAgICAgICBvblVybENoYW5nZSgpO1xuICAgICAgfTtcblxuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICBvcmlnaW5hbFJlcGxhY2VTdGF0ZSguLi5hcmdzKTtcbiAgICAgICAgb25VcmxDaGFuZ2UoKTtcbiAgICAgIH07XG5cbiAgICAgIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKCkgPT4ge1xuICAgICAgICBpZiAoY3VycmVudFVybCAhPT0gd2luZG93LmxvY2F0aW9uLmhyZWYpIHtcbiAgICAgICAgICBvblVybENoYW5nZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uVXJsQ2hhbmdlKCk6IHZvaWQge1xuICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gICAgICBpZiAobmV3VXJsICE9PSBjdXJyZW50VXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbU0VNRF0gVVJMIGNoYW5nZWQ6ICR7Y3VycmVudFVybH0gLT4gJHtuZXdVcmx9YCk7XG4gICAgICAgIGN1cnJlbnRVcmwgPSBuZXdVcmw7XG4gICAgICAgIHJlbW92ZU92ZXJsYXkoKTtcbiAgICAgICAgY2hlY2tVcmwobmV3VXJsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5Gb3JNZXNzYWdlcygpOiB2b2lkIHtcbiAgICAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2U6IEV4dGVuc2lvbk1lc3NhZ2UsIF9zZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICAgICAgICBjb25zdCBtc2cgPSBtZXNzYWdlIGFzIFNob3dPdmVybGF5TWVzc2FnZTtcblxuICAgICAgICBpZiAobXNnLnR5cGUgPT09IE1lc3NhZ2VUeXBlLkNMT1NFX1RBQiAmJiBfc2VuZGVyLnRhYj8uaWQpIHtcbiAgICAgICAgICBicm93c2VyLnRhYnMucmVtb3ZlKF9zZW5kZXIudGFiLmlkKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1zZy50eXBlID09PSBNZXNzYWdlVHlwZS5TSE9XX09WRVJMQVkgJiYgbXNnLnVybCkge1xuICAgICAgICAgIHNob3dPdmVybGF5KHtcbiAgICAgICAgICAgIHVybDogbXNnLnVybCxcbiAgICAgICAgICAgIGFjY3VyYWN5OiBtc2cuYWNjdXJhY3kgfHwgMCxcbiAgICAgICAgICAgIG9uUHJvY2VlZDogKCkgPT4ge1xuICAgICAgICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBNZXNzYWdlVHlwZS5ESVNNSVNTX09WRVJMQVksIGFjdGlvbjogJ3Byb2NlZWQnLCByZXF1ZXN0SWQ6IG1zZy5yZXF1ZXN0SWQgfSk7XG4gICAgICAgICAgICAgIHJlbW92ZU92ZXJsYXkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgICAgICAgIGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZSh7IHR5cGU6IE1lc3NhZ2VUeXBlLkRJU01JU1NfT1ZFUkxBWSwgYWN0aW9uOiAnY2xvc2UnLCByZXF1ZXN0SWQ6IG1zZy5yZXF1ZXN0SWQgfSk7XG4gICAgICAgICAgICAgIGJyb3dzZXIudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9KS50aGVuKHRhYnMgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJzWzBdKSB7XG4gICAgICAgICAgICAgICAgICBicm93c2VyLnRhYnMucmVtb3ZlKHRhYnNbMF0uaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobXNnLnR5cGUgPT09IE1lc3NhZ2VUeXBlLkRJU01JU1NfT1ZFUkxBWSkge1xuICAgICAgICAgIHJlbW92ZU92ZXJsYXkoKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAgICBpZiAob2JzZXJ2ZXIpIHtcbiAgICAgICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICBvYnNlcnZlciA9IG51bGw7XG4gICAgICB9XG4gICAgICByZW1vdmVPdmVybGF5KCk7XG4gICAgfSk7XG4gIH0sXG59KTtcbiIsIi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLnRzXG5mdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcblx0aWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuXHRpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIG1ldGhvZChgW3d4dF0gJHthcmdzLnNoaWZ0KCl9YCwgLi4uYXJncyk7XG5cdGVsc2UgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG59XG4vKipcbiogV3JhcHBlciBhcm91bmQgYGNvbnNvbGVgIHdpdGggYSBcIlt3eHRdXCIgcHJlZml4XG4qL1xuY29uc3QgbG9nZ2VyID0ge1xuXHRkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuXHRsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG5cdHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuXHRlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGxvZ2dlciB9OyIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcblxuLy8jcmVnaW9uIHNyYy91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLnRzXG52YXIgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCA9IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG5cdHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xuXHRjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuXHRcdHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuXHRcdHRoaXMubmV3VXJsID0gbmV3VXJsO1xuXHRcdHRoaXMub2xkVXJsID0gb2xkVXJsO1xuXHR9XG59O1xuLyoqXG4qIFJldHVybnMgYW4gZXZlbnQgbmFtZSB1bmlxdWUgdG8gdGhlIGV4dGVuc2lvbiBhbmQgY29udGVudCBzY3JpcHQgdGhhdCdzIHJ1bm5pbmcuXG4qL1xuZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuXHRyZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCwgZ2V0VW5pcXVlRXZlbnROYW1lIH07IiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5cbi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci50c1xuY29uc3Qgc3VwcG9ydHNOYXZpZ2F0aW9uQXBpID0gdHlwZW9mIGdsb2JhbFRoaXMubmF2aWdhdGlvbj8uYWRkRXZlbnRMaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiO1xuLyoqXG4qIENyZWF0ZSBhIHV0aWwgdGhhdCB3YXRjaGVzIGZvciBVUkwgY2hhbmdlcywgZGlzcGF0Y2hpbmcgdGhlIGN1c3RvbSBldmVudCB3aGVuIGRldGVjdGVkLiBTdG9wc1xuKiB3YXRjaGluZyB3aGVuIGNvbnRlbnQgc2NyaXB0IGlzIGludmFsaWRhdGVkLiBVc2VzIE5hdmlnYXRpb24gQVBJIHdoZW4gYXZhaWxhYmxlLCBvdGhlcndpc2VcbiogZmFsbHMgYmFjayB0byBwb2xsaW5nLlxuKi9cbmZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcblx0bGV0IGxhc3RVcmw7XG5cdGxldCB3YXRjaGluZyA9IGZhbHNlO1xuXHRyZXR1cm4geyBydW4oKSB7XG5cdFx0aWYgKHdhdGNoaW5nKSByZXR1cm47XG5cdFx0d2F0Y2hpbmcgPSB0cnVlO1xuXHRcdGxhc3RVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuXHRcdGlmIChzdXBwb3J0c05hdmlnYXRpb25BcGkpIGdsb2JhbFRoaXMubmF2aWdhdGlvbi5hZGRFdmVudExpc3RlbmVyKFwibmF2aWdhdGVcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRjb25zdCBuZXdVcmwgPSBuZXcgVVJMKGV2ZW50LmRlc3RpbmF0aW9uLnVybCk7XG5cdFx0XHRpZiAobmV3VXJsLmhyZWYgPT09IGxhc3RVcmwuaHJlZikgcmV0dXJuO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBsYXN0VXJsKSk7XG5cdFx0XHRsYXN0VXJsID0gbmV3VXJsO1xuXHRcdH0sIHsgc2lnbmFsOiBjdHguc2lnbmFsIH0pO1xuXHRcdGVsc2UgY3R4LnNldEludGVydmFsKCgpID0+IHtcblx0XHRcdGNvbnN0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG5cdFx0XHRpZiAobmV3VXJsLmhyZWYgIT09IGxhc3RVcmwuaHJlZikge1xuXHRcdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIGxhc3RVcmwpKTtcblx0XHRcdFx0bGFzdFVybCA9IG5ld1VybDtcblx0XHRcdH1cblx0XHR9LCAxZTMpO1xuXHR9IH07XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgY3JlYXRlTG9jYXRpb25XYXRjaGVyIH07IiwiaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5pbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5cbi8vI3JlZ2lvbiBzcmMvdXRpbHMvY29udGVudC1zY3JpcHQtY29udGV4dC50c1xuLyoqXG4qIEltcGxlbWVudHMgW2BBYm9ydENvbnRyb2xsZXJgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQWJvcnRDb250cm9sbGVyKS5cbiogVXNlZCB0byBkZXRlY3QgYW5kIHN0b3AgY29udGVudCBzY3JpcHQgY29kZSB3aGVuIHRoZSBzY3JpcHQgaXMgaW52YWxpZGF0ZWQuXG4qXG4qIEl0IGFsc28gcHJvdmlkZXMgc2V2ZXJhbCB1dGlsaXRpZXMgbGlrZSBgY3R4LnNldFRpbWVvdXRgIGFuZCBgY3R4LnNldEludGVydmFsYCB0aGF0IHNob3VsZCBiZSB1c2VkIGluXG4qIGNvbnRlbnQgc2NyaXB0cyBpbnN0ZWFkIG9mIGB3aW5kb3cuc2V0VGltZW91dGAgb3IgYHdpbmRvdy5zZXRJbnRlcnZhbGAuXG4qXG4qIFRvIGNyZWF0ZSBjb250ZXh0IGZvciB0ZXN0aW5nLCB5b3UgY2FuIHVzZSB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvcjpcbipcbiogYGBgdHNcbiogaW1wb3J0IHsgQ29udGVudFNjcmlwdENvbnRleHQgfSBmcm9tICd3eHQvdXRpbHMvY29udGVudC1zY3JpcHRzLWNvbnRleHQnO1xuKlxuKiB0ZXN0KFwic3RvcmFnZSBsaXN0ZW5lciBzaG91bGQgYmUgcmVtb3ZlZCB3aGVuIGNvbnRleHQgaXMgaW52YWxpZGF0ZWRcIiwgKCkgPT4ge1xuKiAgIGNvbnN0IGN0eCA9IG5ldyBDb250ZW50U2NyaXB0Q29udGV4dCgndGVzdCcpO1xuKiAgIGNvbnN0IGl0ZW0gPSBzdG9yYWdlLmRlZmluZUl0ZW0oXCJsb2NhbDpjb3VudFwiLCB7IGRlZmF1bHRWYWx1ZTogMCB9KTtcbiogICBjb25zdCB3YXRjaGVyID0gdmkuZm4oKTtcbipcbiogICBjb25zdCB1bndhdGNoID0gaXRlbS53YXRjaCh3YXRjaGVyKTtcbiogICBjdHgub25JbnZhbGlkYXRlZCh1bndhdGNoKTsgLy8gTGlzdGVuIGZvciBpbnZhbGlkYXRlIGhlcmVcbipcbiogICBhd2FpdCBpdGVtLnNldFZhbHVlKDEpO1xuKiAgIGV4cGVjdCh3YXRjaGVyKS50b0JlQ2FsbGVkVGltZXMoMSk7XG4qICAgZXhwZWN0KHdhdGNoZXIpLnRvQmVDYWxsZWRXaXRoKDEsIDApO1xuKlxuKiAgIGN0eC5ub3RpZnlJbnZhbGlkYXRlZCgpOyAvLyBVc2UgdGhpcyBmdW5jdGlvbiB0byBpbnZhbGlkYXRlIHRoZSBjb250ZXh0XG4qICAgYXdhaXQgaXRlbS5zZXRWYWx1ZSgyKTtcbiogICBleHBlY3Qod2F0Y2hlcikudG9CZUNhbGxlZFRpbWVzKDEpO1xuKiB9KTtcbiogYGBgXG4qL1xudmFyIENvbnRlbnRTY3JpcHRDb250ZXh0ID0gY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuXHRzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIik7XG5cdGlkO1xuXHRhYm9ydENvbnRyb2xsZXI7XG5cdGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcblx0Y29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHR0aGlzLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMik7XG5cdFx0dGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG5cdFx0dGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuXHRcdHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG5cdH1cblx0Z2V0IHNpZ25hbCgpIHtcblx0XHRyZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuXHR9XG5cdGFib3J0KHJlYXNvbikge1xuXHRcdHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuXHR9XG5cdGdldCBpc0ludmFsaWQoKSB7XG5cdFx0aWYgKGJyb3dzZXIucnVudGltZT8uaWQgPT0gbnVsbCkgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuXHRcdHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuXHR9XG5cdGdldCBpc1ZhbGlkKCkge1xuXHRcdHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG5cdH1cblx0LyoqXG5cdCogQWRkIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgY29udGVudCBzY3JpcHQncyBjb250ZXh0IGlzIGludmFsaWRhdGVkLlxuXHQqXG5cdCogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcblx0KiBjb25zdCByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyID0gY3R4Lm9uSW52YWxpZGF0ZWQoKCkgPT4ge1xuXHQqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG5cdCogfSlcblx0KiAvLyAuLi5cblx0KiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG5cdCovXG5cdG9uSW52YWxpZGF0ZWQoY2IpIHtcblx0XHR0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuXHRcdHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuXHR9XG5cdC8qKlxuXHQqIFJldHVybiBhIHByb21pc2UgdGhhdCBuZXZlciByZXNvbHZlcy4gVXNlZnVsIGlmIHlvdSBoYXZlIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgc2hvdWxkbid0IHJ1blxuXHQqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG5cdCogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuXHQqXG5cdCogICAvLyAuLi5cblx0KiB9XG5cdCovXG5cdGJsb2NrKCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgoKSA9PiB7fSk7XG5cdH1cblx0LyoqXG5cdCogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cblx0KlxuXHQqIEludGVydmFscyBjYW4gYmUgY2xlYXJlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNsZWFySW50ZXJ2YWxgIGZ1bmN0aW9uLlxuXHQqL1xuXHRzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG5cdFx0Y29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG5cdFx0XHRpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG5cdFx0fSwgdGltZW91dCk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcblx0XHRyZXR1cm4gaWQ7XG5cdH1cblx0LyoqXG5cdCogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuXHQqXG5cdCogVGltZW91dHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBzZXRUaW1lb3V0YCBmdW5jdGlvbi5cblx0Ki9cblx0c2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG5cdFx0Y29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcblx0XHR9LCB0aW1lb3V0KTtcblx0XHR0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cdC8qKlxuXHQqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG5cdCogaW52YWxpZGF0ZWQuXG5cdCpcblx0KiBDYWxsYmFja3MgY2FuIGJlIGNhbmNlbGVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2FuY2VsQW5pbWF0aW9uRnJhbWVgIGZ1bmN0aW9uLlxuXHQqL1xuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcblx0XHRjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuXHRcdFx0aWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fSk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cdC8qKlxuXHQqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuXHQqIGludmFsaWRhdGVkLlxuXHQqXG5cdCogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbElkbGVDYWxsYmFja2AgZnVuY3Rpb24uXG5cdCovXG5cdHJlcXVlc3RJZGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMpIHtcblx0XHRjb25zdCBpZCA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soKC4uLmFyZ3MpID0+IHtcblx0XHRcdGlmICghdGhpcy5zaWduYWwuYWJvcnRlZCkgY2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fSwgb3B0aW9ucyk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbElkbGVDYWxsYmFjayhpZCkpO1xuXHRcdHJldHVybiBpZDtcblx0fVxuXHRhZGRFdmVudExpc3RlbmVyKHRhcmdldCwgdHlwZSwgaGFuZGxlciwgb3B0aW9ucykge1xuXHRcdGlmICh0eXBlID09PSBcInd4dDpsb2NhdGlvbmNoYW5nZVwiKSB7XG5cdFx0XHRpZiAodGhpcy5pc1ZhbGlkKSB0aGlzLmxvY2F0aW9uV2F0Y2hlci5ydW4oKTtcblx0XHR9XG5cdFx0dGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXI/Lih0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSwgaGFuZGxlciwge1xuXHRcdFx0Li4ub3B0aW9ucyxcblx0XHRcdHNpZ25hbDogdGhpcy5zaWduYWxcblx0XHR9KTtcblx0fVxuXHQvKipcblx0KiBAaW50ZXJuYWxcblx0KiBBYm9ydCB0aGUgYWJvcnQgY29udHJvbGxlciBhbmQgZXhlY3V0ZSBhbGwgYG9uSW52YWxpZGF0ZWRgIGxpc3RlbmVycy5cblx0Ki9cblx0bm90aWZ5SW52YWxpZGF0ZWQoKSB7XG5cdFx0dGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG5cdFx0bG9nZ2VyLmRlYnVnKGBDb250ZW50IHNjcmlwdCBcIiR7dGhpcy5jb250ZW50U2NyaXB0TmFtZX1cIiBjb250ZXh0IGludmFsaWRhdGVkYCk7XG5cdH1cblx0c3RvcE9sZFNjcmlwdHMoKSB7XG5cdFx0ZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLCB7IGRldGFpbDoge1xuXHRcdFx0Y29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG5cdFx0XHRtZXNzYWdlSWQ6IHRoaXMuaWRcblx0XHR9IH0pKTtcblx0XHR3aW5kb3cucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0dHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuXHRcdFx0Y29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG5cdFx0XHRtZXNzYWdlSWQ6IHRoaXMuaWRcblx0XHR9LCBcIipcIik7XG5cdH1cblx0dmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG5cdFx0Y29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRldGFpbD8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG5cdFx0Y29uc3QgaXNGcm9tU2VsZiA9IGV2ZW50LmRldGFpbD8ubWVzc2FnZUlkID09PSB0aGlzLmlkO1xuXHRcdHJldHVybiBpc1NhbWVDb250ZW50U2NyaXB0ICYmICFpc0Zyb21TZWxmO1xuXHR9XG5cdGxpc3RlbkZvck5ld2VyU2NyaXB0cygpIHtcblx0XHRjb25zdCBjYiA9IChldmVudCkgPT4ge1xuXHRcdFx0aWYgKCEoZXZlbnQgaW5zdGFuY2VvZiBDdXN0b21FdmVudCkgfHwgIXRoaXMudmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSkgcmV0dXJuO1xuXHRcdFx0dGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuXHRcdH07XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsIGNiKTtcblx0XHR0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsIGNiKSk7XG5cdH1cbn07XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgQ29udGVudFNjcmlwdENvbnRleHQgfTsiXSwibmFtZXMiOlsiZGVmaW5pdGlvbiIsImJyb3dzZXIiLCJyZXN1bHQiLCJwcmludCIsImxvZ2dlciIsIld4dExvY2F0aW9uQ2hhbmdlRXZlbnQiLCJDb250ZW50U2NyaXB0Q29udGV4dCJdLCJtYXBwaW5ncyI6Ijs7QUFDQSxXQUFTLG9CQUFvQkEsYUFBWTtBQUN4QyxXQUFPQTtBQUFBLEVBQ1I7QUNDTyxRQUFNLGFBQWE7QUFFbkIsUUFBTSxTQUFTO0FBQUEsSUFNcEIsa0JBQWtCO0FBQUEsSUFDbEIsaUJBQWlCO0FBQUEsSUFDakIsZUFBZTtBQUFBLEVBR2pCO0FBRU8sUUFBTSxTQUFTO0FBQUEsSUFJcEIsWUFBWTtBQUFBLElBRVosWUFBWTtBQUFBLEVBSWQ7QUNwQk8sV0FBUyxjQUFjLFNBQXNDO0FBQ2xFLFVBQU0sRUFBRSxLQUFLLFVBQVUsV0FBVyxZQUFZO0FBRTlDLFVBQU0s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
content;