"use client";

import { AccessCodeCard } from "./components/access-code-card";
import { PopupShell } from "./components/popup-shell";
import { SettingsSheet } from "./components/settings-sheet";
import { StatusCard } from "./components/status-card";
import { useExtensionPopup } from "./hooks/use-extension-popup";

export function PopupApp() {
  const {
    snapshot,
    panel,
    setPanel,
    accessCodeInput,
    setAccessCodeInput,
    accessCodeStatus,
    accessCodeMessage,
    maskedAccessCode,
    isPending,
    handleCheckNow,
    handleToggleEnabled,
    handleCheckModeChange,
    handleConnectAccessCode,
    handleDisconnectAccessCode,
  } = useExtensionPopup();

  if (!snapshot) {
    return (
      <PopupShell title="Loading SEMD" subtitle="Connecting to the extension runtime...">
        <div className="card loading-card" aria-live="polite">
          <div className="scanner" aria-hidden="true" />
          <p>Preparing the current website status.</p>
        </div>
      </PopupShell>
    );
  }

  return (
    <PopupShell
      title={snapshot.accessCodeConfigured ? "Website protection" : "Connect SEMD"}
      subtitle={
        snapshot.accessCodeConfigured
          ? "Live status for the current website and your extension settings."
          : "Use an Access Code from the SEMD web application to enable checks."
      }
      actions={
        snapshot.accessCodeConfigured ? (
          <button className="icon-button" onClick={() => setPanel(panel === "main" ? "settings" : "main")}>
            {panel === "main" ? "Settings" : "Back"}
          </button>
        ) : null
      }
    >
      {!snapshot.accessCodeConfigured ? (
        <AccessCodeCard
          accessCodeInput={accessCodeInput}
          onAccessCodeChange={setAccessCodeInput}
          onConnect={handleConnectAccessCode}
          accessCodeStatus={accessCodeStatus}
          accessCodeMessage={accessCodeMessage}
          isPending={isPending}
        />
      ) : panel === "settings" ? (
        <SettingsSheet
          snapshot={snapshot}
          maskedAccessCode={maskedAccessCode}
          onToggleEnabled={handleToggleEnabled}
          onCheckModeChange={handleCheckModeChange}
          onDisconnectAccessCode={handleDisconnectAccessCode}
        />
      ) : (
        <StatusCard snapshot={snapshot} onCheckNow={handleCheckNow} isPending={isPending} />
      )}
    </PopupShell>
  );
}
