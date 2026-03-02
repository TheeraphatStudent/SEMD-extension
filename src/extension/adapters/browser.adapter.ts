type BrowserAPI = typeof chrome;

declare const browser: BrowserAPI | undefined;

const getBrowserAPI = (): BrowserAPI => {
  if (typeof browser !== 'undefined') {
    return browser;
  }
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  throw new Error('No browser extension API available');
};

export const browserAPI = getBrowserAPI();

export const runtime = {
  sendMessage: <T = unknown>(
    message: unknown,
    callback?: (response: T) => void
  ): void => {
    if (callback) {
      browserAPI.runtime.sendMessage(message, callback);
    } else {
      browserAPI.runtime.sendMessage(message);
    }
  },

  onMessage: {
    addListener: (
      callback: (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => boolean | void
    ): void => {
      browserAPI.runtime.onMessage.addListener(callback);
    },
  },

  onInstalled: {
    addListener: (
      callback: (details: chrome.runtime.InstalledDetails) => void
    ): void => {
      browserAPI.runtime.onInstalled.addListener(callback);
    },
  },

  getLastError: (): chrome.runtime.LastError | undefined => {
    return browserAPI.runtime.lastError;
  },
};

export const tabs = {
  query: (
    queryInfo: chrome.tabs.QueryInfo
  ): Promise<chrome.tabs.Tab[]> => {
    return new Promise((resolve) => {
      browserAPI.tabs.query(queryInfo, resolve);
    });
  },

  remove: (tabId: number): Promise<void> => {
    return new Promise((resolve) => {
      browserAPI.tabs.remove(tabId, resolve);
    });
  },

  getCurrent: (): Promise<chrome.tabs.Tab | undefined> => {
    return new Promise((resolve) => {
      browserAPI.tabs.getCurrent(resolve);
    });
  },

  getActiveTab: async (): Promise<chrome.tabs.Tab | null> => {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  },
};

export const webNavigation = {
  onBeforeNavigate: {
    addListener: (
      callback: (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => void,
      filters?: chrome.webNavigation.WebNavigationEventFilter
    ): void => {
      if (browserAPI.webNavigation?.onBeforeNavigate) {
        browserAPI.webNavigation.onBeforeNavigate.addListener(callback, filters);
      }
    },
  },

  onCompleted: {
    addListener: (
      callback: (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void,
      filters?: chrome.webNavigation.WebNavigationEventFilter
    ): void => {
      if (browserAPI.webNavigation?.onCompleted) {
        browserAPI.webNavigation.onCompleted.addListener(callback, filters);
      }
    },
  },
};
