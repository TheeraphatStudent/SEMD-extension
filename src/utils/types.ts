export const MessageType = {
  CHECK_URL: 'CHECK_URL',
  URL_RESULT: 'URL_RESULT',
  SHOW_OVERLAY: 'SHOW_OVERLAY',
  DISMISS_OVERLAY: 'DISMISS_OVERLAY',
  GET_AUTH_STATUS: 'GET_AUTH_STATUS',
  VALIDATE_ACCESS_CODE: 'VALIDATE_ACCESS_CODE',
  LOGOUT: 'LOGOUT',
} as const;

export type MessageTypeKey = keyof typeof MessageType;
export type MessageTypeValue = (typeof MessageType)[MessageTypeKey];

export interface ScanResult {
  url: string;
  isMalicious: boolean;
  accuracy: number;
  suggested: string;
  timestamp: string;
  error?: string;
}

export interface CheckUrlMessage {
  type: typeof MessageType.CHECK_URL;
  url: string;
}

export interface UrlResultMessage {
  type: typeof MessageType.URL_RESULT;
  result: ScanResult;
}

export interface ShowOverlayMessage {
  type: typeof MessageType.SHOW_OVERLAY;
  url: string;
  accuracy: number;
}

export interface DismissOverlayMessage {
  type: typeof MessageType.DISMISS_OVERLAY;
  action: 'proceed' | 'close';
}

export interface GetAuthStatusMessage {
  type: typeof MessageType.GET_AUTH_STATUS;
}

export interface ValidateAccessCodeMessage {
  type: typeof MessageType.VALIDATE_ACCESS_CODE;
  code: string;
}

export interface LogoutMessage {
  type: typeof MessageType.LOGOUT;
}

export type ExtensionMessage =
  | CheckUrlMessage
  | UrlResultMessage
  | ShowOverlayMessage
  | DismissOverlayMessage
  | GetAuthStatusMessage
  | ValidateAccessCodeMessage
  | LogoutMessage;

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthStatusResponse {
  isAuthenticated: boolean;
  accessCode?: string;
}

export interface CheckUrlResponse {
  result: ScanResult;
}

export interface PredictRequest {
  url: string;
}

export interface PredictApiResult {
  is_malicious: boolean;
  accurate: number;
  suggested: string;
}

export interface PredictResponse {
  result: PredictApiResult;
  message?: string;
  status?: string;
}

export interface ApiConfig {
  apiEndpoint: string;
  apiKey: string;
}

export interface StorageSchema {
  accessCode: string | null;
  apiEndpoint: string;
  apiKey: string;
  scanHistory: ScanResult[];
  isAuthenticated: boolean;
}

export type StorageKey = keyof StorageSchema;

export const DEFAULT_STORAGE: StorageSchema = {
  accessCode: null,
  apiEndpoint: 'http://localhost:8000/api/v1/predict/predict',
  apiKey: '',
  scanHistory: [],
  isAuthenticated: false,
};
