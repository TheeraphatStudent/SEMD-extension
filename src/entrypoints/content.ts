/// <reference types="wxt/browser" />

import { showOverlay, removeOverlay } from '@/utils/overlay';
import { MessageType, type ScanResult, type MessageResponse, type CheckUrlResponse, type ShowOverlayMessage, type ExtensionMessage } from '@/utils/types';
import { browser } from 'wxt/browser';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',

  main(ctx) {
    console.log('[SEMD] Content script loaded');

    let currentUrl = window.location.href;
    let observer: MutationObserver | null = null;

    init();

    function init(): void {
      checkUrl(currentUrl);
      startUrlMonitor();
      listenForMessages();
    }

    function checkUrl(url: string): void {
      console.log(`[SEMD] Checking URL: ${url}`);

      browser.runtime.sendMessage(
        {
          type: MessageType.CHECK_URL,
          payload: {
            url: url
          }
        },
        (response: MessageResponse<CheckUrlResponse>) => {
          if (browser.runtime.lastError) {
            console.warn('[SEMD] Message error:', browser.runtime.lastError.message);
            return;
          }

          if (response?.success && response.data?.result?.isMalicious) {
            handleMaliciousUrl(url, response.data.result);
          }
        }
      );
    }

    function handleMaliciousUrl(url: string, result: ScanResult): void {
      console.log('[SEMD] Malicious URL detected:', url);

      showOverlay({
        url,
        accuracy: result.accuracy,
        onProceed: () => {
          console.log('[SEMD] User chose to proceed');
          removeOverlay();
        },
        onClose: () => {
          console.log('[SEMD] User chose to close tab');
          browser.runtime.sendMessage({ type: MessageType.DISMISS_OVERLAY, action: 'close' });
          window.close();
        },
      });
    }

    function startUrlMonitor(): void {
      window.addEventListener('popstate', () => onUrlChange());
      window.addEventListener('hashchange', () => onUrlChange());

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
          subtree: true,
        });
      }
    }

    function onUrlChange(): void {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl) {
        console.log(`[SEMD] URL changed: ${currentUrl} -> ${newUrl}`);
        currentUrl = newUrl;
        removeOverlay();
        checkUrl(newUrl);
      }
    }

    function listenForMessages(): void {
      browser.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
        const msg = message as ShowOverlayMessage;

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
              browser.runtime.sendMessage({ type: MessageType.DISMISS_OVERLAY, action: 'proceed', requestId: msg.requestId });
              removeOverlay();
            },
            onClose: () => {
              browser.runtime.sendMessage({ type: MessageType.DISMISS_OVERLAY, action: 'close', requestId: msg.requestId });
              browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                if (tabs[0]) {
                  browser.tabs.remove(tabs[0].id);
                }
              });
            },
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
  },
});
