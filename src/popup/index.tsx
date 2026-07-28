"use client";

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
      title="Website protection"
      subtitle="Live status for the current website and your extension settings."
      actions={
        <button className="icon-button" onClick={() => setPanel(panel === "main" ? "settings" : "main")}>
          {panel === "main" ? "Settings" : "Back"}
        </button>
      }
    >
      {panel === "settings" ? (
        <SettingsSheet
          snapshot={snapshot}
          maskedAccessCode={maskedAccessCode}
          accessCodeInput={accessCodeInput}
          onAccessCodeChange={setAccessCodeInput}
          onConnectAccessCode={handleConnectAccessCode}
          accessCodeStatus={accessCodeStatus}
          accessCodeMessage={accessCodeMessage}
          isPending={isPending}
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
