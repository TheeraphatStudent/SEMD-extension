import { getBrowserApi, hasBrowserApi, sendMessage } from "../../extension/shared/browser";
import { MESSAGE_TYPES } from "../../extension/shared/constants";
import { isObject } from "../../extension/shared/messaging";
import type {
  ExtensionSettings,
  ExtensionSnapshot,
  ProtocolResult,
  UrlEvaluation,
} from "../../extension/shared/types";

export async function getExtensionSnapshot() {
  return unwrapResponse<ExtensionSnapshot>(
    await sendMessage<ProtocolResult<ExtensionSnapshot>>({
      type: MESSAGE_TYPES.getExtensionState,
    }),
  );
}

export async function evaluateCurrentUrl(url: string) {
  return unwrapResponse<UrlEvaluation>(
    await sendMessage<ProtocolResult<UrlEvaluation>>({
      type: MESSAGE_TYPES.evaluateUrl,
      payload: {
        url,
        trigger: "popup",
      },
    }),
  );
}

export async function updateSettings(settings: Partial<ExtensionSettings>) {
  return unwrapResponse<ExtensionSettings>(
    await sendMessage<ProtocolResult<ExtensionSettings>>({
      type: MESSAGE_TYPES.updateSettings,
      payload: settings,
    }),
  );
}

export async function validateAccessCode(accessCode: string) {
  return unwrapResponse<{ status: string; message: string }>(
    await sendMessage<ProtocolResult<{ status: string; message: string }>>({
      type: MESSAGE_TYPES.validateAccessCode,
      payload: { accessCode },
    }),
  );
}

export async function clearAccessCode() {
  return unwrapResponse<{ accessCodeConfigured: boolean }>(
    await sendMessage<ProtocolResult<{ accessCodeConfigured: boolean }>>({
      type: MESSAGE_TYPES.clearAccessCode,
    }),
  );
}

export function subscribeToStateUpdates(onSnapshot: (snapshot: ExtensionSnapshot) => void) {
  if (!hasBrowserApi()) {
    return () => undefined;
  }

  const browserApi = getBrowserApi();

  function listener(message: unknown) {
    if (!isObject(message) || message.type !== MESSAGE_TYPES.stateUpdated) {
      return;
    }

    const payload = message.payload;
    if (!isObject(payload) || !("snapshot" in payload)) return;
    onSnapshot(payload.snapshot as ExtensionSnapshot);
  }

  browserApi.runtime.onMessage.addListener(listener);
  return () => browserApi.runtime.onMessage.removeListener(listener);
}

function unwrapResponse<T>(response: ProtocolResult<T>) {
  if (response.ok) {
    return response.data;
  }

  const errorResponse = response as Extract<ProtocolResult<T>, { ok: false }>;
  throw new Error(errorResponse.error.message);
}
