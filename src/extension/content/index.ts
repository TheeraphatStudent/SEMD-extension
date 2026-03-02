import { runtime, tabs } from '../adapters/browser.adapter';
import { showOverlay, removeOverlay } from './overlay';
import { MessageType, type ScanResult, type MessageResponse, type CheckUrlResponse } from '../../shared/types';

console.log('[SEMD] Content script loaded');

class SEMDBlocker {
  private currentUrl: string = '';
  private observer: MutationObserver | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.currentUrl = this.getCurrentUrl();
    this.checkUrl(this.currentUrl);
    this.startUrlMonitor();
    this.listenForMessages();
  }

  private getCurrentUrl(): string {
    return window.location.href;
  }

  private async checkUrl(url: string): Promise<void> {
    console.log(`[SEMD] Checking URL: ${url}`);

    runtime.sendMessage<MessageResponse<CheckUrlResponse>>(
      { type: MessageType.CHECK_URL, url },
      (response) => {
        const lastError = runtime.getLastError();
        if (lastError) {
          console.warn('[SEMD] Message error:', lastError.message);
          return;
        }

        if (response?.success && response.data?.result?.isMalicious) {
          this.handleMaliciousUrl(url, response.data.result);
        }
      }
    );
  }

  private handleMaliciousUrl(url: string, result: ScanResult): void {
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
        runtime.sendMessage({ type: MessageType.DISMISS_OVERLAY, action: 'close' });
        window.close();
      },
    });
  }

  private startUrlMonitor(): void {
    window.addEventListener('popstate', () => this.onUrlChange());
    window.addEventListener('hashchange', () => this.onUrlChange());

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
        subtree: true,
      });
    }
  }

  private onUrlChange(): void {
    const newUrl = this.getCurrentUrl();
    if (newUrl !== this.currentUrl) {
      console.log(`[SEMD] URL changed: ${this.currentUrl} -> ${newUrl}`);
      this.currentUrl = newUrl;
      removeOverlay();
      this.checkUrl(newUrl);
    }
  }

  private listenForMessages(): void {
    runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const msg = message as { type: string; url?: string; accuracy?: number };

      if (msg.type === MessageType.SHOW_OVERLAY && msg.url) {
        showOverlay({
          url: msg.url,
          accuracy: msg.accuracy || 0,
          onProceed: () => removeOverlay(),
          onClose: () => window.close(),
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

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    removeOverlay();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SEMDBlocker());
} else {
  new SEMDBlocker();
}
