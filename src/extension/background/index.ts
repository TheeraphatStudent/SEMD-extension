/// <reference types="chrome"/>

import { evaluateUrlWithApi, validateAccessCodeWithApi } from "../shared/api";
import { getBrowserApi, getStorageArea, goBackTab, queryActiveTab, updateTabUrl } from "../shared/browser";
import { EVALUATION_DEDUPE_WINDOW_MS, MESSAGE_TYPES, STATE_HISTORY_LIMIT } from "../shared/constants";
import { isRequestMessage, createStateUpdatedMessage, type RequestMessage } from "../shared/messaging";
import {
  buildSnapshot,
  createCheckingEvaluation,
  createIdleEvaluation,
  mergeTabState,
  toProtocolError,
  toProtocolSuccess,
} from "../shared/state";
import { readStorage, updateStorage } from "../shared/storage";
import type { ExtensionStorage, ProtocolResult, UrlEvaluation } from "../shared/types";
import { getHostname, isExcludedUrl, normalizeUrl } from "../shared/url";

const browserApi = getBrowserApi();
const recentChecks = new Map<string, number>();

browserApi.runtime.onInstalled.addListener(() => {
  void ensureStorage();
});

browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isRequestMessage(message)) {
    sendResponse(toProtocolError("invalid_message", "Message shape is invalid."));
    return false;
  }

  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse(
        toProtocolError("background_error", error instanceof Error ? error.message : "Unknown error."),
      );
    });

  return true;
});

async function handleMessage(
  message: RequestMessage,
  sender: chrome.runtime.MessageSender,
): Promise<ProtocolResult<unknown>> {
  switch (message.type) {
    case MESSAGE_TYPES.getExtensionState:
      return toProtocolSuccess(await getExtensionSnapshot());
    case MESSAGE_TYPES.getActiveTab:
      return toProtocolSuccess(await getActiveTabInfo());
    case MESSAGE_TYPES.getSettings: {
      const storage = await ensureStorage();
      return toProtocolSuccess(storage.settings);
    }
    case MESSAGE_TYPES.evaluateUrl:
      return toProtocolSuccess(
        await evaluateUrl(message.payload.url, message.payload.tabId ?? sender.tab?.id, message.payload.trigger ?? "manual"),
      );
    case MESSAGE_TYPES.updateSettings:
      return toProtocolSuccess(await updateSettings(message.payload));
    case MESSAGE_TYPES.validateAccessCode:
      return validateAndStoreAccessCode(message.payload.accessCode);
    case MESSAGE_TYPES.clearAccessCode:
      return toProtocolSuccess(await clearAccessCode());
    case MESSAGE_TYPES.continueToUrl:
      if (!sender.tab?.id) {
        return toProtocolError("missing_tab", "No sender tab was available.");
      }
      await updateTabUrl(sender.tab.id, message.payload.url);
      return toProtocolSuccess({ continued: true });
    case MESSAGE_TYPES.goBackFromWarning:
      if (sender.tab?.id) {
        await goBackTab(sender.tab.id);
      }
      return toProtocolSuccess({ navigatedBack: true });
    case MESSAGE_TYPES.dismissWarning:
      if (sender.tab?.id) {
        await setWarningVisibility(sender.tab.id, false);
      }
      return toProtocolSuccess({ dismissed: true });
    default:
      return toProtocolError("unsupported_message", "Unsupported message type.");
  }
}

async function ensureStorage(): Promise<ExtensionStorage> {
  const area = await getStorageArea();
  const storage = await readStorage(area);
  await updateStorage(area, () => storage);
  return storage;
}

async function getActiveTabInfo() {
  const activeTab = await queryActiveTab();
  return {
    id: activeTab?.id,
    url: activeTab?.url ?? "",
    hostname: getHostname(activeTab?.url ?? ""),
  };
}

async function getExtensionSnapshot() {
  const storage = await ensureStorage();
  const activeTab = await queryActiveTab();
  const tabKey = activeTab?.id != null ? String(activeTab.id) : undefined;
  const tabState = tabKey ? storage.tabStates[tabKey] : undefined;

  return buildSnapshot({
    settings: storage.settings,
    activeTab: activeTab?.url ? { id: activeTab.id, url: activeTab.url } : undefined,
    tabState,
    lastEvaluation: storage.lastEvaluation,
    version: browserApi.runtime.getManifest().version,
  });
}

async function updateSettings(
  input: Partial<{ enabled: boolean; checkMode: "realtime" | "ask"; apiBaseUrl: string }>,
) {
  const area = await getStorageArea();
  const next = await updateStorage(area, (storage) => ({
    ...storage,
    settings: {
      ...storage.settings,
      ...input,
    },
  }));

  await broadcastState();
  return next.settings;
}

async function clearAccessCode() {
  const area = await getStorageArea();
  const next = await updateStorage(area, (storage) => ({
    ...storage,
    settings: {
      ...storage.settings,
      accessCode: undefined,
    },
  }));

  await broadcastState();
  return {
    accessCodeConfigured: Boolean(next.settings.accessCode),
  };
}

async function validateAndStoreAccessCode(accessCode: string): Promise<ProtocolResult<unknown>> {
  const trimmed = accessCode.trim();
  if (!trimmed) {
    return toProtocolError("invalid_access_code", "Enter an Access Code.");
  }

  const area = await getStorageArea();
  const storage = await readStorage(area);
  const validation = await validateAccessCodeWithApi(trimmed, storage.settings);

  if (!validation.ok) {
    return validation;
  }

  await updateStorage(area, (current) => ({
    ...current,
    settings: {
      ...current.settings,
      accessCode: trimmed,
    },
  }));

  await broadcastState();
  return toProtocolSuccess(validation.data);
}

async function evaluateUrl(url: string, tabId: number | undefined, trigger: UrlEvaluation["trigger"]) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || isExcludedUrl(normalizedUrl)) {
    return createIdleEvaluation(normalizedUrl);
  }

  const storage = await ensureStorage();
  if (!storage.settings.enabled) {
    return createIdleEvaluation(normalizedUrl);
  }

  if (storage.settings.checkMode === "ask" && trigger !== "manual" && trigger !== "popup") {
    const idleEvaluation = createIdleEvaluation(normalizedUrl);
    if (tabId != null) {
      await persistEvaluation(tabId, idleEvaluation);
    }
    return idleEvaluation;
  }

  const checkKey = `${tabId ?? "global"}:${normalizedUrl}`;
  const now = Date.now();
  const previousTime = recentChecks.get(checkKey) ?? 0;
  if (now - previousTime < EVALUATION_DEDUPE_WINDOW_MS) {
    const tabState = tabId != null ? storage.tabStates[String(tabId)] : undefined;
    if (tabState?.lastEvaluation?.url === normalizedUrl) {
      return tabState.lastEvaluation;
    }
  }

  recentChecks.set(checkKey, now);

  const checking = createCheckingEvaluation(normalizedUrl, trigger);
  if (tabId != null) {
    await persistEvaluation(tabId, checking);
  }

  const evaluation = await evaluateUrlWithApi(normalizedUrl, storage.settings, trigger);
  if (tabId != null) {
    await persistEvaluation(tabId, evaluation);
    if (evaluation.status === "malicious") {
      await setWarningVisibility(tabId, true);
    }
  }

  return evaluation;
}

async function persistEvaluation(tabId: number, evaluation: UrlEvaluation) {
  const area = await getStorageArea();
  await updateStorage(area, (storage) => {
    const currentTabState = storage.tabStates[String(tabId)];
    const merged = mergeTabState(currentTabState, tabId, evaluation);
    const historyEntry = evaluation.result;

    return {
      ...storage,
      lastEvaluation: evaluation,
      tabStates: {
        ...storage.tabStates,
        [String(tabId)]: merged,
      },
      scanHistory: historyEntry
        ? [historyEntry, ...storage.scanHistory].slice(0, STATE_HISTORY_LIMIT)
        : storage.scanHistory,
    };
  });

  await broadcastState();
}

async function setWarningVisibility(tabId: number, warningVisible: boolean) {
  const area = await getStorageArea();
  await updateStorage(area, (storage) => {
    const current = storage.tabStates[String(tabId)];
    if (!current) return storage;

    return {
      ...storage,
      tabStates: {
        ...storage.tabStates,
        [String(tabId)]: {
          ...current,
          warningVisible,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  });

  await broadcastState();
}

async function broadcastState() {
  const snapshot = await getExtensionSnapshot();
  const message = createStateUpdatedMessage(snapshot);

  try {
    browserApi.runtime.sendMessage(message);
  } catch {
    // Popup listeners are optional.
  }
}
