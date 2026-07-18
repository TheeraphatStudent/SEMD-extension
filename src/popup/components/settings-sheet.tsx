import type { CheckMode, ExtensionSnapshot } from "../../extension/shared/types";

type SettingsSheetProps = {
  snapshot: ExtensionSnapshot;
  maskedAccessCode: string;
  onToggleEnabled(enabled: boolean): void;
  onCheckModeChange(checkMode: CheckMode): void;
  onDisconnectAccessCode(): void;
};

export function SettingsSheet({
  snapshot,
  maskedAccessCode,
  onToggleEnabled,
  onCheckModeChange,
  onDisconnectAccessCode,
}: SettingsSheetProps) {
  return (
    <div className="card stack-md">
      <div className="stack-xs">
        <h2>Settings</h2>
        <p className="muted">Choose how SEMD checks websites and manage the connected Access Code.</p>
      </div>

      <div className="settings-row">
        <div>
          <h3>Protection</h3>
          <p className="muted">Enable or disable URL checking without implying that the current page is safe.</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={snapshot.settings.enabled}
            onChange={(event) => onToggleEnabled(event.target.checked)}
          />
          <span />
        </label>
      </div>

      <div className="stack-sm">
        <h3>Check mode</h3>
        <div className="segmented-control" role="radiogroup" aria-label="Check mode">
          {(["realtime", "ask"] as CheckMode[]).map((mode) => (
            <button
              key={mode}
              className={snapshot.settings.checkMode === mode ? "is-active" : ""}
              onClick={() => onCheckModeChange(mode)}
              role="radio"
              aria-checked={snapshot.settings.checkMode === mode}
            >
              {mode === "realtime" ? "Real-time" : "Ask before checking"}
            </button>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <h3>Access Code</h3>
        <div className="settings-row">
          <div>
            <p className="muted">
              {snapshot.accessCodeConfigured ? `Connected: ${maskedAccessCode}` : "No Access Code connected"}
            </p>
          </div>
          {snapshot.accessCodeConfigured ? (
            <button className="button button-secondary" onClick={onDisconnectAccessCode}>
              Disconnect
            </button>
          ) : null}
        </div>
      </div>

      <div className="stack-xs">
        <h3>Privacy</h3>
        <p className="muted">
          SEMD sends the website URL to its verification API only when protection is enabled and a check is triggered.
        </p>
      </div>

      <p className="helper">Version {snapshot.version ?? "unknown"}</p>
    </div>
  );
}
