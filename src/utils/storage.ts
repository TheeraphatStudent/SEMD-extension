import type { StorageSchema, StorageKey } from './types';
import { DEFAULT_STORAGE } from './types';

export const storage = {
  get: async <K extends StorageKey>(keys: K | K[]): Promise<Pick<StorageSchema, K>> => {
    const result = await browser.storage.local.get(keys as string | string[]);
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const merged: Partial<StorageSchema> = {};

    for (const key of keyArray) {
      merged[key] = result[key] ?? DEFAULT_STORAGE[key];
    }

    return merged as Pick<StorageSchema, K>;
  },

  set: async <K extends StorageKey>(items: Partial<Pick<StorageSchema, K>>): Promise<void> => {
    await browser.storage.local.set(items);
  },

  remove: async (keys: StorageKey | StorageKey[]): Promise<void> => {
    await browser.storage.local.remove(keys as string | string[]);
  },

  clear: async (): Promise<void> => {
    await browser.storage.local.clear();
  },

  getAll: async (): Promise<StorageSchema> => {
    const result = await browser.storage.local.get(null);
    return {
      ...DEFAULT_STORAGE,
      ...result,
    } as StorageSchema;
  },

  initialize: async (): Promise<void> => {
    const current = await storage.getAll();
    const updates: Partial<StorageSchema> = {};

    for (const key of Object.keys(DEFAULT_STORAGE) as StorageKey[]) {
      if (current[key] === undefined) {
        updates[key] = DEFAULT_STORAGE[key] as never;
      }
    }

    if (Object.keys(updates).length > 0) {
      await storage.set(updates);
    }
  },
};
