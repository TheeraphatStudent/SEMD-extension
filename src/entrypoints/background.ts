/// <reference types="webextension-polyfill" />
import 'webextension-polyfill';

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

  let popupWindowId: number | null = null;

  const pendingRequests = new Map<string, { resolve: (response: any) => void }>();

  // ---------- ต้อง Malual แก้ไข
  // browser.action.onClicked.addListener(async () => {

  browser.browserAction.onClicked.addListener(async () => {
    if (popupWindowId !== null) {
      try {
        const existingWindow = await browser.windows.get(popupWindowId);
        await browser.windows.update(existingWindow.id!, { focused: true });
        return;
      } catch {
        popupWindowId = null;
      }
    }

    const window = await browser.windows.create({
      url: browser.runtime.getURL('popup.html'),
      type: 'popup',
      width: 360,
      height: 520,
      focused: true,
    });

    popupWindowId = window.id!;
  });

  browser.windows.onRemoved.addListener((windowId) => {
    if (windowId === popupWindowId) {
      popupWindowId = null;
    }
  });

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

  browser.webRequest.onBeforeRequest.addListener(
    async (details: browser.WebRequest.OnBeforeRequestDetailsType) => {
      if (details.type !== 'main_frame') {
        return {};
      }

      const isAuthed = await requireAuth();
      if (!isAuthed) {
        return {};
      }

      const config = await getConfig();

      const result = await checkUrlWithAPI(details.url, config);

      if (result.isMalicious) {
        console.log(`[SEMD] Detected malicious URL: ${details.url}, showing overlay on tab ${details.tabId}`);
        try {
          await browser.tabs.sendMessage(details.tabId, {
            type: MessageType.SHOW_OVERLAY,
            url: details.url,
            accuracy: result.accuracy,
            requestId: details.requestId,
          });
        } catch (error) {
          console.error('[SEMD] Failed to send overlay message:', error);
          return { cancel: true };
        }

        await saveToHistory(result);

        return new Promise((resolve) => {
          pendingRequests.set(details.requestId, { resolve });
        });
      }

      return {};
    },
    { urls: ['<all_urls>'] },
    ['blocking']
  );

  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      let { responseHeaders } = details;
      if (responseHeaders) {
        const cspHeader = responseHeaders.find(
          (header) => header.name.toLowerCase() === 'content-security-policy'
        );
        if (cspHeader) {
          cspHeader.value += " 'unsafe-hashes' sha256-IWu8eKPFpwBlPtvm+lmwBh1mAdRu4b2jd4cGC9eFA54=";
        } else {
          responseHeaders.push({
            name: 'Content-Security-Policy',
            value: "'unsafe-hashes' sha256-IWu8eKPFpwBlPtvm+lmwBh1mAdRu4b2jd4cGC9eFA54="
          });
        }
      }
      return { responseHeaders };
    },
    { urls: ['<all_urls>'] },
    ['blocking', 'responseHeaders']
  );
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

    case MessageType.DISMISS_OVERLAY: {
      const pending = pendingRequests.get(message.requestId);
      if (pending) {
        if (message.action === 'proceed') {
          pending.resolve({});
        } else {
          pending.resolve({ cancel: true });
        }
        pendingRequests.delete(message.requestId);
      }
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}
