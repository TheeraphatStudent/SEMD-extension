import { WARNING_OVERLAY_ID, WARNING_ROOT_ID } from "./constants";
import { getHostname } from "./url";

type WarningHandlers = {
  onContinue(): void;
  onGoBack(): void;
  onDismiss(): void;
};

type WarningLabels = {
  continueText?: string;
  goBackText?: string;
  dismissText?: string;
};

export function removeWarningOverlay() {
  document.getElementById(WARNING_OVERLAY_ID)?.remove();
}

export function showWarningOverlay(url: string, handlers: WarningHandlers, labels: WarningLabels = {}) {
  removeWarningOverlay();

  const host = getHostname(url) || url;
  const overlay = document.createElement("div");
  overlay.id = WARNING_OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.tabIndex = -1;

  const shadowRoot = overlay.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      background: rgba(20, 18, 27, 0.72);
      padding: 20px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .panel {
      width: min(100%, 420px);
      border-radius: 24px;
      padding: 24px;
      background: linear-gradient(180deg, #fff5f4 0%, #ffffff 100%);
      border: 1px solid rgba(191, 77, 55, 0.2);
      box-shadow: 0 24px 80px rgba(32, 18, 18, 0.28);
      color: #271a19;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #ffe0db;
      color: #a73f2b;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 16px 0 8px;
      font-size: 28px;
      line-height: 1.1;
    }
    p {
      margin: 0;
      color: #705654;
      line-height: 1.5;
      font-size: 14px;
    }
    .host {
      margin: 18px 0;
      padding: 14px 16px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid rgba(191, 77, 55, 0.16);
      font-weight: 700;
      word-break: break-word;
    }
    .actions {
      display: grid;
      gap: 10px;
      margin-top: 20px;
    }
    button {
      appearance: none;
      border: none;
      border-radius: 16px;
      min-height: 48px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: transform 150ms ease, opacity 150ms ease, box-shadow 150ms ease;
    }
    button:focus-visible {
      outline: 3px solid rgba(121, 158, 255, 0.5);
      outline-offset: 2px;
    }
    button:hover { transform: translateY(-1px); }
    .primary {
      background: #bf4d37;
      color: white;
      box-shadow: 0 12px 24px rgba(191, 77, 55, 0.24);
    }
    .secondary {
      background: #fff;
      color: #6d4f4c;
      border: 1px solid rgba(191, 77, 55, 0.16);
    }
    .dismiss {
      background: transparent;
      color: #8e7471;
    }
    @media (prefers-reduced-motion: reduce) {
      button { transition: none; }
    }
  `;

  const root = document.createElement("div");
  root.id = WARNING_ROOT_ID;
  root.className = "backdrop";

  const panel = document.createElement("div");
  panel.className = "panel";

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = "SEMD Warning";

  const title = document.createElement("h1");
  title.textContent = "This website may be dangerous";

  const description = document.createElement("p");
  description.textContent =
    "SEMD detected a potentially malicious destination. Going back is recommended unless you trust this address.";

  const hostText = document.createElement("div");
  hostText.className = "host";
  hostText.textContent = host;

  const actions = document.createElement("div");
  actions.className = "actions";

  const goBackButton = document.createElement("button");
  goBackButton.className = "primary";
  goBackButton.textContent = labels.goBackText ?? "Go back";

  const continueButton = document.createElement("button");
  continueButton.className = "secondary";
  continueButton.textContent = labels.continueText ?? "Continue anyway";

  const dismissButton = document.createElement("button");
  dismissButton.className = "dismiss";
  dismissButton.textContent = labels.dismissText ?? "Dismiss";

  actions.append(goBackButton, continueButton, dismissButton);
  panel.append(badge, title, description, hostText, actions);
  root.append(panel);
  shadowRoot.append(style, root);
  document.documentElement.append(overlay);

  const previousFocused = document.activeElement as HTMLElement | null;

  function cleanup() {
    removeWarningOverlay();
    previousFocused?.focus?.();
  }

  goBackButton.addEventListener("click", () => {
    cleanup();
    handlers.onGoBack();
  });

  continueButton.addEventListener("click", () => {
    cleanup();
    handlers.onContinue();
  });

  dismissButton.addEventListener("click", () => {
    cleanup();
    handlers.onDismiss();
  });

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cleanup();
      handlers.onDismiss();
    }
  });

  goBackButton.focus();
}
