export const STORAGE_KEY = "semd.extension.storage";
export const STORAGE_SCHEMA_VERSION = 2;
export const STATE_HISTORY_LIMIT = 100;
export const EVALUATION_DEDUPE_WINDOW_MS = 8_000;
export const API_TIMEOUT_MS = 8_000;
export const WARNING_OVERLAY_ID = "semd-warning-overlay";
export const WARNING_ROOT_ID = "semd-warning-root";

export const SUPPORTED_CHECK_MODES = ["realtime", "ask"] as const;
export const EVALUATION_STATUSES = [
  "idle",
  "checking",
  "safe",
  "malicious",
  "unknown",
  "offline",
  "unauthorized",
  "error",
] as const;

export const EXCLUDED_PROTOCOLS = [
  "about:",
  "chrome:",
  "chrome-extension:",
  "edge:",
  "file:",
  "moz-extension:",
  "opera:",
  "view-source:",
] as const;

export const MESSAGE_TYPES = {
  getExtensionState: "GET_EXTENSION_STATE",
  getActiveTab: "GET_ACTIVE_TAB",
  evaluateUrl: "EVALUATE_URL",
  getSettings: "GET_SETTINGS",
  updateSettings: "UPDATE_SETTINGS",
  validateAccessCode: "VALIDATE_ACCESS_CODE",
  clearAccessCode: "CLEAR_ACCESS_CODE",
  continueToUrl: "CONTINUE_TO_URL",
  goBackFromWarning: "GO_BACK_FROM_WARNING",
  dismissWarning: "DISMISS_WARNING",
  stateUpdated: "STATE_UPDATED",
} as const;
