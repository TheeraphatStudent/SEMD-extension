import { AccessCodeCard } from "./access-code-card";
import type {
  AccessCodeValidationStatus,
  CheckMode,
  ExtensionSnapshot,
} from "../../extension/shared/types";

type SettingsSheetProps = {
  snapshot: ExtensionSnapshot;
  maskedAccessCode: string;
  accessCodeInput: string;
  onAccessCodeChange(value: string): void;
  onConnectAccessCode(): void;
  accessCodeStatus: AccessCodeValidationStatus | null;
  accessCodeMessage: string | null;
  isPending: boolean;
  onToggleEnabled(enabled: boolean): void;
  onCheckModeChange(checkMode: CheckMode): void;
  onDisconnectAccessCode(): void;
};

export function SettingsSheet({
  snapshot,
  maskedAccessCode,
  accessCodeInput,
  onAccessCodeChange,
  onConnectAccessCode,
  accessCodeStatus,
  accessCodeMessage,
  isPending,
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
        <p className="muted">
          Optional. Connecting an Access Code attributes checks to your SEMD account and raises usage
          limits -- it is not required to check a URL.
        </p>
        {snapshot.accessCodeConfigured ? (
          <div className="settings-row">
            <div>
              <p className="muted">Connected: {maskedAccessCode}</p>
            </div>
            <button className="button button-secondary" onClick={onDisconnectAccessCode}>
              Disconnect
            </button>
          </div>
        ) : (
          <AccessCodeCard
            accessCodeInput={accessCodeInput}
            onAccessCodeChange={onAccessCodeChange}
            onConnect={onConnectAccessCode}
            accessCodeStatus={accessCodeStatus}
            accessCodeMessage={accessCodeMessage}
            isPending={isPending}
          />
        )}
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
