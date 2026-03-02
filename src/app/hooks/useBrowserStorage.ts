'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StorageSchema, StorageKey } from '../../shared/types';
import { DEFAULT_STORAGE } from '../../shared/types';

declare const chrome: {
  storage?: {
    local: {
      get: (keys: string | string[] | null, callback: (result: Record<string, unknown>) => void) => void;
      set: (items: Record<string, unknown>, callback?: () => void) => void;
    };
  };
};

const isDev = typeof window !== 'undefined' && !window.chrome?.runtime?.id;
const DEV_STORAGE_PREFIX = 'semd_dev_';

function getDevStorage<K extends StorageKey>(key: K): StorageSchema[K] {
  if (typeof window === 'undefined') return DEFAULT_STORAGE[key];
  const stored = localStorage.getItem(DEV_STORAGE_PREFIX + key);
  if (stored === null) return DEFAULT_STORAGE[key];
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_STORAGE[key];
  }
}

function setDevStorage<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_STORAGE_PREFIX + key, JSON.stringify(value));
}

export function useBrowserStorage<K extends StorageKey>(
  key: K
): [StorageSchema[K], (value: StorageSchema[K]) => Promise<void>, boolean] {
  const [value, setValue] = useState<StorageSchema[K]>(DEFAULT_STORAGE[key]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDev) {
      setValue(getDevStorage(key));
      setIsLoading(false);
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.storage) {
      setIsLoading(false);
      return;
    }

    chrome.storage.local.get([key], (result) => {
      const storedValue = result[key] ?? DEFAULT_STORAGE[key];
      setValue(storedValue as StorageSchema[K]);
      setIsLoading(false);
    });
  }, [key]);

  const updateValue = useCallback(
    async (newValue: StorageSchema[K]): Promise<void> => {
      if (isDev) {
        setDevStorage(key, newValue);
        setValue(newValue);
        return;
      }

      if (typeof chrome === 'undefined' || !chrome.storage) {
        setValue(newValue);
        return;
      }

      return new Promise((resolve) => {
        chrome.storage!.local.set({ [key]: newValue }, () => {
          setValue(newValue);
          resolve();
        });
      });
    },
    [key]
  );

  return [value, updateValue, isLoading];
}

export function useBrowserStorageMultiple<K extends StorageKey>(
  keys: K[]
): [Pick<StorageSchema, K>, (updates: Partial<Pick<StorageSchema, K>>) => Promise<void>, boolean] {
  const [values, setValues] = useState<Pick<StorageSchema, K>>(() => {
    const initial: Partial<StorageSchema> = {};
    for (const key of keys) {
      initial[key] = DEFAULT_STORAGE[key];
    }
    return initial as Pick<StorageSchema, K>;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDev) {
      const storedValues: Partial<StorageSchema> = {};
      for (const key of keys) {
        storedValues[key] = getDevStorage(key) as never;
      }
      setValues(storedValues as Pick<StorageSchema, K>);
      setIsLoading(false);
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.storage) {
      setIsLoading(false);
      return;
    }

    chrome.storage.local.get(keys, (result) => {
      const storedValues: Partial<StorageSchema> = {};
      for (const key of keys) {
        storedValues[key] = (result[key] ?? DEFAULT_STORAGE[key]) as never;
      }
      setValues(storedValues as Pick<StorageSchema, K>);
      setIsLoading(false);
    });
  }, [keys.join(',')]);

  const updateValues = useCallback(
    async (updates: Partial<Pick<StorageSchema, K>>): Promise<void> => {
      if (isDev) {
        for (const [key, value] of Object.entries(updates)) {
          setDevStorage(key as K, value as StorageSchema[K]);
        }
        setValues((prev) => ({ ...prev, ...updates }));
        return;
      }

      if (typeof chrome === 'undefined' || !chrome.storage) {
        setValues((prev) => ({ ...prev, ...updates }));
        return;
      }

      return new Promise((resolve) => {
        chrome.storage!.local.set(updates, () => {
          setValues((prev) => ({ ...prev, ...updates }));
          resolve();
        });
      });
    },
    []
  );

  return [values, updateValues, isLoading];
}

export default useBrowserStorage;
