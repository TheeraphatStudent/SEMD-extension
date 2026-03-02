import { checkUrlWithAPI } from '@/utils/api.service';
import { saveToHistory } from '@/utils/history.service';
import { getConfig } from '@/utils/config.service';
import { getAuthStatus, validateAccessCode, logout, requireAuth } from '@/utils/auth.service';
import { storage } from '@/utils/storage';
import {
  MessageType,
  type ExtensionMessage,
  type MessageResponse,
  type AuthStatusResponse,
  type CheckUrlResponse,
} from '@/utils/types';

export default defineBackground(() => {
  console.log('[SEMD] Background service worker started');

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msg = message as ExtensionMessage;

    handleMessage(msg, sender)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error('[SEMD] Message handler error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  });

  browser.runtime.onInstalled.addListener(async () => {
    console.log('[SEMD] Extension installed');
    await storage.initialize();
  });
});

async function handleMessage(
  message: ExtensionMessage,
  _sender: browser.Runtime.MessageSender
): Promise<MessageResponse> {
  switch (message.type) {
    case MessageType.CHECK_URL: {
      const isAuthed = await requireAuth();
      if (!isAuthed) {
        return { success: false, error: 'Not authenticated' };
      }

      const config = await getConfig();
      const result = await checkUrlWithAPI(message.url, config);
      await saveToHistory(result);

      return {
        success: true,
        data: { result } as CheckUrlResponse,
      };
    }

    case MessageType.GET_AUTH_STATUS: {
      const authStatus = await getAuthStatus();
      return {
        success: true,
        data: authStatus as AuthStatusResponse,
      };
    }

    case MessageType.VALIDATE_ACCESS_CODE: {
      const isValid = await validateAccessCode(message.code);
      return {
        success: isValid,
        error: isValid ? undefined : 'Invalid access code',
      };
    }

    case MessageType.LOGOUT: {
      await logout();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}
