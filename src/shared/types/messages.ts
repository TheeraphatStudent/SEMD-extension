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

export interface CheckUrlMessage {
  type: typeof MessageType.CHECK_URL;
  url: string;
}

export interface UrlResultMessage {
  type: typeof MessageType.URL_RESULT;
  result: import('./scan').ScanResult;
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
  result: import('./scan').ScanResult;
}
