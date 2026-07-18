import type { EVALUATION_STATUSES, SUPPORTED_CHECK_MODES } from "./constants";

export type CheckMode = (typeof SUPPORTED_CHECK_MODES)[number];
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export type EvaluationClassification = "safe" | "malicious" | "unknown";
export type AccessCodeValidationStatus =
  | "validating"
  | "valid"
  | "invalid"
  | "expired"
  | "unauthorized"
  | "network_error"
  | "server_error"
  | "integration_required";

export type UrlEvaluationResult = {
  url: string;
  classification: EvaluationClassification;
  confidence?: number;
  probability?: number;
  recommendation?: string;
  source?: string;
  evaluatedAt: string;
  rawSuggested?: string;
};

export type UrlEvaluation = {
  status: EvaluationStatus;
  url: string;
  result?: UrlEvaluationResult;
  errorCode?:
    | "offline"
    | "timeout"
    | "invalid_response"
    | "http_error"
    | "unauthorized"
    | "missing_access_code"
    | "integration_required"
    | "message_rejected"
    | "unknown_error";
  message?: string;
  evaluatedAt?: string;
  trigger?: "manual" | "page_load" | "navigation" | "pre_navigation" | "popup";
};

export type ExtensionSettings = {
  enabled: boolean;
  checkMode: CheckMode;
  accessCode?: string;
  apiBaseUrl?: string;
  accessCodeValidationPath?: string;
};

export type TabEvaluationState = {
  tabId: number;
  url: string;
  hostname: string;
  status: EvaluationStatus;
  lastEvaluation?: UrlEvaluation;
  warningVisible?: boolean;
  updatedAt: string;
};

export type ExtensionStorage = {
  schemaVersion: number;
  settings: ExtensionSettings;
  lastEvaluation?: UrlEvaluation;
  tabStates: Record<string, TabEvaluationState>;
  scanHistory: UrlEvaluationResult[];
};

export type ExtensionSnapshot = {
  settings: ExtensionSettings;
  activeTab?: {
    id?: number;
    url: string;
    hostname: string;
  };
  evaluation: UrlEvaluation;
  tabState?: TabEvaluationState;
  accessCodeConfigured: boolean;
  version?: string;
};

export type ProtocolSuccess<T> = {
  ok: true;
  data: T;
};

export type ProtocolError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ProtocolResult<T> = ProtocolSuccess<T> | ProtocolError;
