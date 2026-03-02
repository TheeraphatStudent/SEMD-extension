import { browserAPI } from './browser.adapter';
import type { StorageSchema, StorageKey } from '../../shared/types';
import { DEFAULT_STORAGE } from '../../shared/types';

export const storage = {
  get: <K extends StorageKey>(
    keys: K | K[]
  ): Promise<Pick<StorageSchema, K>> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.get(keys as string | string[], (result) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        const merged: Partial<StorageSchema> = {};
        
        for (const key of keyArray) {
          merged[key] = result[key] ?? DEFAULT_STORAGE[key];
        }
        
        resolve(merged as Pick<StorageSchema, K>);
      });
    });
  },

  set: <K extends StorageKey>(
    items: Partial<Pick<StorageSchema, K>>
  ): Promise<void> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.set(items, resolve);
    });
  },

  remove: (keys: StorageKey | StorageKey[]): Promise<void> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.remove(keys as string | string[], resolve);
    });
  },

  clear: (): Promise<void> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.clear(resolve);
    });
  },

  getAll: (): Promise<StorageSchema> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.get(null, (result) => {
        resolve({
          ...DEFAULT_STORAGE,
          ...result,
        } as StorageSchema);
      });
    });
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

export default storage;
