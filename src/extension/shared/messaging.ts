import { MESSAGE_TYPES } from "./constants";
import type { CheckMode, ExtensionSettings, ProtocolResult, UrlEvaluation } from "./types";

type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type RequestMessage =
  | { type: typeof MESSAGE_TYPES.getExtensionState }
  | { type: typeof MESSAGE_TYPES.getActiveTab }
  | { type: typeof MESSAGE_TYPES.getSettings }
  | {
      type: typeof MESSAGE_TYPES.evaluateUrl;
      payload: {
        url: string;
        tabId?: number;
        trigger?: UrlEvaluation["trigger"];
      };
    }
  | {
      type: typeof MESSAGE_TYPES.updateSettings;
      payload: Partial<Pick<ExtensionSettings, "enabled" | "checkMode" | "apiBaseUrl">>;
    }
  | {
      type: typeof MESSAGE_TYPES.validateAccessCode;
      payload: {
        accessCode: string;
      };
    }
  | { type: typeof MESSAGE_TYPES.clearAccessCode }
  | {
      type: typeof MESSAGE_TYPES.continueToUrl;
      payload: {
        url: string;
      };
    }
  | { type: typeof MESSAGE_TYPES.goBackFromWarning }
  | { type: typeof MESSAGE_TYPES.dismissWarning };

export type StateUpdatedMessage = {
  type: typeof MESSAGE_TYPES.stateUpdated;
  payload: {
    snapshot: unknown;
  };
};

export type AnyMessage = RequestMessage | StateUpdatedMessage;

export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function isMessageType(value: unknown): value is MessageType {
  return typeof value === "string" && Object.values(MESSAGE_TYPES).includes(value as MessageType);
}

export function isRequestMessage(value: unknown): value is RequestMessage {
  if (!isObject(value) || !isMessageType(value.type)) {
    return false;
  }

  switch (value.type) {
    case MESSAGE_TYPES.getExtensionState:
    case MESSAGE_TYPES.getActiveTab:
    case MESSAGE_TYPES.getSettings:
    case MESSAGE_TYPES.clearAccessCode:
    case MESSAGE_TYPES.goBackFromWarning:
    case MESSAGE_TYPES.dismissWarning:
      return true;
    case MESSAGE_TYPES.evaluateUrl:
      return isObject(value.payload) && typeof value.payload.url === "string";
    case MESSAGE_TYPES.updateSettings:
      return isObject(value.payload) && validateSettingsPayload(value.payload);
    case MESSAGE_TYPES.validateAccessCode:
      return isObject(value.payload) && typeof value.payload.accessCode === "string";
    case MESSAGE_TYPES.continueToUrl:
      return isObject(value.payload) && typeof value.payload.url === "string";
    case MESSAGE_TYPES.stateUpdated:
      return false;
    default:
      return false;
  }
}

function validateSettingsPayload(payload: Record<string, unknown>) {
  if ("enabled" in payload && typeof payload.enabled !== "boolean") return false;
  if ("checkMode" in payload && payload.checkMode !== "realtime" && payload.checkMode !== "ask") {
    return false;
  }
  if ("apiBaseUrl" in payload && typeof payload.apiBaseUrl !== "string") return false;
  return true;
}

export function createStateUpdatedMessage(snapshot: unknown): StateUpdatedMessage {
  return {
    type: MESSAGE_TYPES.stateUpdated,
    payload: { snapshot },
  };
}

export async function sendProtocolMessage<T>(
  send: (message: RequestMessage) => Promise<ProtocolResult<T>>,
  message: RequestMessage,
) {
  return send(message);
}
