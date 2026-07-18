"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  clearAccessCode,
  evaluateCurrentUrl,
  getExtensionSnapshot,
  subscribeToStateUpdates,
  updateSettings,
  validateAccessCode,
} from "../lib/browser";
import { createIdleEvaluation } from "../../extension/shared/state";
import { maskAccessCode } from "../../extension/shared/url";
import type {
  AccessCodeValidationStatus,
  CheckMode,
  ExtensionSnapshot,
} from "../../extension/shared/types";

export function useExtensionPopup() {
  const [snapshot, setSnapshot] = useState<ExtensionSnapshot | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeStatus, setAccessCodeStatus] = useState<AccessCodeValidationStatus | null>(null);
  const [accessCodeMessage, setAccessCodeMessage] = useState<string | null>(null);
  const [panel, setPanel] = useState<"main" | "settings">("main");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;

    getExtensionSnapshot()
      .then((nextSnapshot) => {
        if (mounted) setSnapshot(nextSnapshot);
      })
      .catch((error) => {
        if (!mounted) return;
        setSnapshot({
          settings: {
            enabled: true,
            checkMode: "realtime",
          },
          evaluation: {
            ...createIdleEvaluation(""),
            status: "error",
            message: error instanceof Error ? error.message : "Extension runtime is unavailable.",
          },
          accessCodeConfigured: false,
        });
      });

    const unsubscribe = subscribeToStateUpdates((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const maskedAccessCode = useMemo(
    () => maskAccessCode(snapshot?.settings.accessCode),
    [snapshot?.settings.accessCode],
  );

  const currentUrl = snapshot?.activeTab?.url ?? snapshot?.evaluation.url ?? "";

  async function handleCheckNow() {
    if (!currentUrl) return;
    startTransition(async () => {
      const evaluation = await evaluateCurrentUrl(currentUrl);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              evaluation,
            }
          : current,
      );
    });
  }

  async function handleToggleEnabled(enabled: boolean) {
    startTransition(async () => {
      const settings = await updateSettings({ enabled });
      setSnapshot((current) => (current ? { ...current, settings } : current));
    });
  }

  async function handleCheckModeChange(checkMode: CheckMode) {
    startTransition(async () => {
      const settings = await updateSettings({ checkMode });
      setSnapshot((current) => (current ? { ...current, settings } : current));
    });
  }

  async function handleConnectAccessCode() {
    setAccessCodeStatus("validating");
    setAccessCodeMessage("Checking your Access Code...");

    try {
      const result = await validateAccessCode(accessCodeInput);
      setAccessCodeStatus("valid");
      setAccessCodeMessage(result.message);
      const nextSnapshot = await getExtensionSnapshot();
      setSnapshot(nextSnapshot);
      setAccessCodeInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to validate the Access Code.";
      const lower = message.toLowerCase();
      const nextStatus: AccessCodeValidationStatus = lower.includes("expired")
        ? "expired"
        : lower.includes("invalid")
          ? "invalid"
          : lower.includes("integration")
            ? "integration_required"
            : lower.includes("network")
              ? "network_error"
              : lower.includes("server")
                ? "server_error"
                : "unauthorized";

      setAccessCodeStatus(nextStatus);
      setAccessCodeMessage(message);
    }
  }

  async function handleDisconnectAccessCode() {
    await clearAccessCode();
    const nextSnapshot = await getExtensionSnapshot();
    setSnapshot(nextSnapshot);
    setAccessCodeStatus(null);
    setAccessCodeMessage(null);
  }

  return {
    snapshot,
    currentUrl,
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
  };
}
