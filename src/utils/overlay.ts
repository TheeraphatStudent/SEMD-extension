import { OVERLAY_ID, LABELS, COLORS } from './constants';

export interface OverlayOptions {
  url: string;
  accuracy: number;
  onProceed: () => void;
  onClose: () => void;
}

export function createOverlay(options: OverlayOptions): HTMLElement {
  const { url, accuracy, onProceed, onClose } = options;

  const overlay = document.createElement('div');
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
        ">ความแม่นยำ: ${(accuracy.toFixed(2))}%</p>

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

  const proceedBtn = overlay.querySelector('#semd-overlay-proceed');
  const closeBtn = overlay.querySelector('#semd-overlay-close');

  proceedBtn?.addEventListener('click', () => {
    onProceed();
    removeOverlay();
  });

  closeBtn?.addEventListener('click', () => {
    onClose();
  });

  return overlay;
}

export function showOverlay(options: OverlayOptions): void {
  removeOverlay();

  const overlay = createOverlay(options);

  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(overlay);
    });
  }
}

export function removeOverlay(): void {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.remove();
  }
}

export function isOverlayVisible(): boolean {
  return !!document.getElementById(OVERLAY_ID);
}
