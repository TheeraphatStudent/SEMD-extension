type BrowserTab = {
  id?: number;
  url?: string;
};

type BrowserNamespace = typeof chrome;
declare const browser: BrowserNamespace | undefined;

function isExtensionBrowserApi(api: BrowserNamespace | undefined): api is BrowserNamespace {
  return Boolean(
    api &&
      api.runtime &&
      typeof api.runtime.sendMessage === "function" &&
      api.runtime.onMessage &&
      typeof api.runtime.onMessage.addListener === "function",
  );
}

export function getBrowserApi(): BrowserNamespace {
  const browserApi = typeof browser !== "undefined" ? (browser as unknown as BrowserNamespace) : undefined;
  const chromeApi = typeof chrome !== "undefined" ? chrome : undefined;
  const api = isExtensionBrowserApi(browserApi)
    ? browserApi
    : isExtensionBrowserApi(chromeApi)
      ? chromeApi
      : undefined;

  if (!api) {
    throw new Error("Browser extension APIs are unavailable");
  }

  return api;
}

export function hasBrowserApi() {
  try {
    getBrowserApi();
    return true;
  } catch {
    return false;
  }
}

export async function getStorageArea() {
  const api = getBrowserApi();
  const area = api.storage.local;
  return {
    get(keys?: string | string[] | Record<string, unknown> | null) {
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        area.get(keys ?? null, (result) => {
          const error = api.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(result as Record<string, unknown>);
        });
      });
    },
    set(items: Record<string, unknown>) {
      return new Promise<void>((resolve, reject) => {
        area.set(items, () => {
          const error = api.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve();
        });
      });
    },
    remove(keys: string | string[]) {
      return new Promise<void>((resolve, reject) => {
        area.remove(keys, () => {
          const error = api.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve();
        });
      });
    },
  };
}

export async function queryActiveTab(): Promise<BrowserTab | undefined> {
  const api = getBrowserApi();
  return new Promise((resolve, reject) => {
    api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = api.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(tabs?.[0] as BrowserTab | undefined);
    });
  });
}

export async function sendMessage<TResponse>(message: unknown): Promise<TResponse> {
  const api = getBrowserApi();
  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (response) => {
      const error = api.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response as TResponse);
    });
  });
}

export async function updateTabUrl(tabId: number, url: string) {
  const api = getBrowserApi();
  return new Promise<void>((resolve, reject) => {
    api.tabs.update(tabId, { url }, () => {
      const error = api.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

export async function goBackTab(tabId: number) {
  const api = getBrowserApi();
  return new Promise<void>((resolve, reject) => {
    api.tabs.goBack(tabId, () => {
      const error = api.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}
