interface Window {
  chrome?: {
    runtime?: {
      id?: string;
      sendMessage: (message: unknown, callback?: (response: unknown) => void) => void;
      lastError?: { message: string };
    };
    storage?: {
      local: {
        get: (keys: string | string[] | null, callback: (result: Record<string, unknown>) => void) => void;
        set: (items: Record<string, unknown>, callback?: () => void) => void;
      };
    };
    tabs?: {
      query: (
        queryInfo: { active: boolean; currentWindow: boolean },
        callback: (tabs: Array<{ url?: string; title?: string }>) => void
      ) => void;
    };
  };
}
