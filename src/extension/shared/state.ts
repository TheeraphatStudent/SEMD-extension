import type {
  ExtensionSettings,
  ExtensionSnapshot,
  ProtocolError,
  ProtocolResult,
  TabEvaluationState,
  UrlEvaluation,
  UrlEvaluationResult,
} from "./types";
import { getHostname } from "./url";

export function createDefaultSettings(): ExtensionSettings {
  return {
    enabled: true,
    checkMode: "realtime",
    accessCode: undefined,
    apiBaseUrl: undefined,
    accessCodeValidationPath: undefined,
  };
}

export function createIdleEvaluation(url = ""): UrlEvaluation {
  return {
    status: "idle",
    url,
  };
}

export function mapResultToEvaluation(
  url: string,
  result: UrlEvaluationResult,
  trigger: UrlEvaluation["trigger"],
): UrlEvaluation {
  return {
    status:
      result.classification === "safe"
        ? "safe"
        : result.classification === "malicious"
          ? "malicious"
          : "unknown",
    url,
    result,
    evaluatedAt: result.evaluatedAt,
    trigger,
  };
}

export function mapErrorToEvaluation(
  url: string,
  errorCode: UrlEvaluation["errorCode"],
  message: string,
  trigger: UrlEvaluation["trigger"],
): UrlEvaluation {
  return {
    status:
      errorCode === "offline"
        ? "offline"
        : errorCode === "unauthorized" || errorCode === "missing_access_code"
          ? "unauthorized"
          : "error",
    url,
    errorCode,
    message,
    evaluatedAt: new Date().toISOString(),
    trigger,
  };
}

export function createCheckingEvaluation(
  url: string,
  trigger: UrlEvaluation["trigger"],
): UrlEvaluation {
  return {
    status: "checking",
    url,
    evaluatedAt: new Date().toISOString(),
    trigger,
  };
}

export function createTabState(tabId: number, url: string): TabEvaluationState {
  return {
    tabId,
    url,
    hostname: getHostname(url),
    status: "idle",
    updatedAt: new Date().toISOString(),
  };
}

export function mergeTabState(
  current: TabEvaluationState | undefined,
  tabId: number,
  evaluation: UrlEvaluation,
): TabEvaluationState {
  const url = evaluation.url || current?.url || "";
  return {
    tabId,
    url,
    hostname: getHostname(url),
    status: evaluation.status,
    lastEvaluation: evaluation,
    warningVisible: current?.warningVisible ?? false,
    updatedAt: new Date().toISOString(),
  };
}

export function toProtocolError(code: string, message: string): ProtocolError {
  return {
    ok: false,
    error: { code, message },
  };
}

export function toProtocolSuccess<T>(data: T): ProtocolResult<T> {
  return {
    ok: true,
    data,
  };
}

export function buildSnapshot(args: {
  settings: ExtensionSettings;
  activeTab?: { id?: number; url: string };
  tabState?: TabEvaluationState;
  lastEvaluation?: UrlEvaluation;
  version?: string;
}): ExtensionSnapshot {
  const evaluation =
    args.tabState?.lastEvaluation ??
    args.lastEvaluation ??
    createIdleEvaluation(args.activeTab?.url ?? "");

  return {
    settings: args.settings,
    activeTab: args.activeTab
      ? {
          id: args.activeTab.id,
          url: args.activeTab.url,
          hostname: getHostname(args.activeTab.url),
        }
      : undefined,
    evaluation,
    tabState: args.tabState,
    accessCodeConfigured: Boolean(args.settings.accessCode),
    version: args.version,
  };
}
