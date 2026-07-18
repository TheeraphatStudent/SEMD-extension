/// <reference types="chrome"/>

import { getBrowserApi } from "../shared/browser";
import { MESSAGE_TYPES } from "../shared/constants";
import { showWarningOverlay, removeWarningOverlay } from "../shared/warning-ui";
import type { ProtocolResult, UrlEvaluation } from "../shared/types";
import { isExcludedUrl, isHttpUrl, normalizeUrl } from "../shared/url";

const browserApi = getBrowserApi();

class SemdContentController {
  private currentUrl = "";
  private observer: MutationObserver | null = null;
  private warningUrl = "";
  private blockedNavigationUrl: string | null = null;

  init() {
    this.currentUrl = normalizeUrl(window.location.href);
    void this.evaluateCurrentUrl("page_load");
    this.startUrlMonitor();
    this.attachNavigationGuards();
  }

  private async evaluateCurrentUrl(trigger: UrlEvaluation["trigger"]) {
    const url = normalizeUrl(window.location.href);
    if (!url || isExcludedUrl(url)) return;
    this.currentUrl = url;

    const response = await this.sendEvaluation(url, trigger);
    if (!response.ok) return;
    this.applyEvaluation(response.data as UrlEvaluation, url);
  }

  private async sendEvaluation(url: string, trigger: UrlEvaluation["trigger"]) {
    return new Promise<ProtocolResult<unknown>>((resolve) => {
      browserApi.runtime.sendMessage(
        {
          type: MESSAGE_TYPES.evaluateUrl,
          payload: {
            url,
            tabId: undefined,
            trigger,
          },
        },
        (response) => {
          if (browserApi.runtime.lastError) {
            resolve({
              ok: false,
              error: {
                code: "message_failed",
                message: browserApi.runtime.lastError.message,
              },
            });
            return;
          }

          resolve(response as ProtocolResult<unknown>);
        },
      );
    });
  }

  private applyEvaluation(evaluation: UrlEvaluation, url: string) {
    if (evaluation.status === "malicious") {
      this.warningUrl = url;
      const isBlockedNavigation = evaluation.trigger === "pre_navigation";
      this.blockedNavigationUrl = isBlockedNavigation ? url : null;

      showWarningOverlay(url, {
        onContinue: () => {
          if (this.blockedNavigationUrl) {
            const blockedUrl = this.blockedNavigationUrl;
            this.blockedNavigationUrl = null;
            void this.sendAction(MESSAGE_TYPES.continueToUrl, { url: blockedUrl });
            return;
          }

          void this.sendAction(MESSAGE_TYPES.dismissWarning);
        },
        onGoBack: () => {
          this.blockedNavigationUrl = null;
          if (isBlockedNavigation) {
            void this.sendAction(MESSAGE_TYPES.dismissWarning);
            return;
          }

          void this.sendAction(MESSAGE_TYPES.goBackFromWarning);
        },
        onDismiss: () => {
          this.blockedNavigationUrl = null;
          void this.sendAction(MESSAGE_TYPES.dismissWarning);
        },
      }, isBlockedNavigation ? {
        goBackText: "Stay here",
      } : undefined);
      return;
    }

    if (this.warningUrl === url) {
      this.warningUrl = "";
      this.blockedNavigationUrl = null;
      removeWarningOverlay();
    }
  }

  private async sendAction(type: string, payload?: Record<string, unknown>) {
    return new Promise<void>((resolve) => {
      browserApi.runtime.sendMessage(payload ? { type, payload } : { type }, () => resolve());
    });
  }

  private startUrlMonitor() {
    window.addEventListener("popstate", () => void this.onUrlChange());
    window.addEventListener("hashchange", () => void this.onUrlChange());

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      void this.onUrlChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState(...args);
      void this.onUrlChange();
    };

    this.observer = new MutationObserver(() => {
      if (normalizeUrl(window.location.href) !== this.currentUrl) {
        void this.onUrlChange();
      }
    });

    if (document.documentElement) {
      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  }

  private async onUrlChange() {
    const nextUrl = normalizeUrl(window.location.href);
    if (nextUrl === this.currentUrl) return;
    this.currentUrl = nextUrl;
    await this.evaluateCurrentUrl("navigation");
  }

  private attachNavigationGuards() {
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
        if (!anchor) return;

        const href = anchor.href;
        if (!isHttpUrl(href) || isExcludedUrl(href)) return;
        if (anchor.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey) return;

        event.preventDefault();
        void this.guardNavigation(href, () => {
          window.location.href = href;
        });
      },
      true,
    );

    document.addEventListener(
      "submit",
      (event) => {
        const form = event.target as HTMLFormElement | null;
        if (!form?.action || !isHttpUrl(form.action) || isExcludedUrl(form.action)) return;

        event.preventDefault();
        void this.guardNavigation(form.action, () => {
          form.submit();
        });
      },
      true,
    );
  }

  private async guardNavigation(url: string, continueNavigation: () => void) {
    const response = await this.sendEvaluation(url, "pre_navigation");
    if (!response.ok) {
      continueNavigation();
      return;
    }

    const evaluation = response.data as UrlEvaluation;
    if (evaluation.status === "malicious") {
      this.applyEvaluation(evaluation, url);
      return;
    }

    continueNavigation();
  }
}

if (!isExcludedUrl(window.location.href)) {
  const controller = new SemdContentController();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => controller.init(), { once: true });
  } else {
    controller.init();
  }
}
