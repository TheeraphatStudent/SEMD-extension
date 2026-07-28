import type { AccessCodeValidationStatus } from "../../extension/shared/types";

type AccessCodeCardProps = {
  accessCodeInput: string;
  onAccessCodeChange(value: string): void;
  onConnect(): void;
  accessCodeStatus: AccessCodeValidationStatus | null;
  accessCodeMessage: string | null;
  isPending: boolean;
};

export function AccessCodeCard({
  accessCodeInput,
  onAccessCodeChange,
  onConnect,
  accessCodeStatus,
  accessCodeMessage,
  isPending,
}: AccessCodeCardProps) {
  return (
    <div className="card card-brand">
      <div className="mascot" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="stack-md">
        <div className="stack-xs">
          <h2>Connect your Access Code</h2>
          <p className="muted">
            Get the code from the SEMD web application, then connect it here to attribute your checks to your
            account and raise usage limits.
          </p>
        </div>

        <label className="field">
          <span className="field-label">Access Code</span>
          <input
            value={accessCodeInput}
            onChange={(event) => onAccessCodeChange(event.target.value)}
            placeholder="Paste your Access Code"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="access-code-status"
          />
        </label>

        <button className="button button-brand" onClick={onConnect} disabled={isPending || !accessCodeInput.trim()}>
          {accessCodeStatus === "validating" ? "Validating..." : "Connect"}
        </button>

        <p className="helper">
          Generate this code in the SEMD website account area. The extension never shows it again after successful connection.
        </p>

        <div
          id="access-code-status"
          className={`notice ${accessCodeStatus ? `notice-${accessCodeStatus}` : ""}`}
          aria-live="polite"
        >
          {accessCodeMessage ?? "No Access Code connected yet."}
        </div>
      </div>
    </div>
  );
}
