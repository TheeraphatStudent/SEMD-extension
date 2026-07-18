import { formatConfidence } from "../../extension/shared/url";
import type { ExtensionSnapshot } from "../../extension/shared/types";

type StatusCardProps = {
  snapshot: ExtensionSnapshot;
  onCheckNow(): void;
  isPending: boolean;
};

export function StatusCard({ snapshot, onCheckNow, isPending }: StatusCardProps) {
  const evaluation = snapshot.evaluation;
  const hostname = snapshot.activeTab?.hostname || "No active website";
  const confidence = formatConfidence(evaluation.result?.confidence);

  return (
    <div className={`card status-card status-${evaluation.status}`}>
      <div className="status-hero">
        <div className={`status-orb status-orb-${evaluation.status}`} aria-hidden="true">
          <span />
        </div>
        <div className="stack-xs">
          <p className="eyebrow">
            {snapshot.settings.enabled ? "Protection enabled" : "Protection disabled"}
          </p>
          <h2>{getStatusTitle(evaluation.status)}</h2>
          <p className="muted">{getStatusMessage(evaluation.status)}</p>
        </div>
      </div>

      <dl className="facts">
        <div>
          <dt>Website</dt>
          <dd>{hostname}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{snapshot.settings.checkMode === "realtime" ? "Real-time" : "Ask before checking"}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{confidence ?? "Not provided"}</dd>
        </div>
      </dl>

      {evaluation.message ? <div className="notice notice-inline">{evaluation.message}</div> : null}

      <div className="button-row">
        <button className="button button-brand" onClick={onCheckNow} disabled={isPending || !snapshot.activeTab?.url}>
          {evaluation.status === "checking" || isPending ? "Checking..." : "Check current URL"}
        </button>
      </div>
    </div>
  );
}

function getStatusTitle(status: ExtensionSnapshot["evaluation"]["status"]) {
  switch (status) {
    case "checking":
      return "Checking this website";
    case "safe":
      return "Confirmed safe";
    case "malicious":
      return "Potential threat detected";
    case "offline":
      return "Offline";
    case "unauthorized":
      return "Access Code required";
    case "error":
      return "Verification failed";
    case "unknown":
      return "Could not verify";
    case "idle":
    default:
      return "Ready to check";
  }
}

function getStatusMessage(status: ExtensionSnapshot["evaluation"]["status"]) {
  switch (status) {
    case "checking":
      return "SEMD is verifying the active website.";
    case "safe":
      return "This result is only shown after a valid SEMD response.";
    case "malicious":
      return "Leave the page unless you fully trust the destination.";
    case "offline":
      return "SEMD could not contact the backend while you are offline.";
    case "unauthorized":
      return "Connect a valid Access Code before running checks.";
    case "error":
      return "The website was not confirmed safe. Retry after checking connectivity and settings.";
    case "unknown":
      return "SEMD did not receive a usable classification.";
    case "idle":
    default:
      return "Open a website and start a verification when needed.";
  }
}
