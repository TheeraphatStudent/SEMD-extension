import { useState, useEffect, useCallback } from 'react';
import type { StorageSchema, StorageKey } from '@/utils/types';
import { DEFAULT_STORAGE } from '@/utils/types';

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
    const loadValue = async () => {
      if (isDev) {
        setValue(getDevStorage(key));
        setIsLoading(false);
        return;
      }

      try {
        const result = await browser.storage.local.get([key]);
        const storedValue = result[key] ?? DEFAULT_STORAGE[key];
        setValue(storedValue as StorageSchema[K]);
      } catch (err) {
        console.error('[SEMD] Storage load failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [key]);

  const updateValue = useCallback(
    async (newValue: StorageSchema[K]): Promise<void> => {
      if (isDev) {
        setDevStorage(key, newValue);
        setValue(newValue);
        return;
      }

      try {
        await browser.storage.local.set({ [key]: newValue });
        setValue(newValue);
      } catch (err) {
        console.error('[SEMD] Storage update failed:', err);
      }
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
    const loadValues = async () => {
      if (isDev) {
        const storedValues: Partial<StorageSchema> = {};
        for (const key of keys) {
          storedValues[key] = getDevStorage(key) as never;
        }
        setValues(storedValues as Pick<StorageSchema, K>);
        setIsLoading(false);
        return;
      }

      try {
        const result = await browser.storage.local.get(keys);
        const storedValues: Partial<StorageSchema> = {};
        for (const key of keys) {
          storedValues[key] = (result[key] ?? DEFAULT_STORAGE[key]) as never;
        }
        setValues(storedValues as Pick<StorageSchema, K>);
      } catch (err) {
        console.error('[SEMD] Storage load failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadValues();
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

      try {
        await browser.storage.local.set(updates);
        setValues((prev) => ({ ...prev, ...updates }));
      } catch (err) {
        console.error('[SEMD] Storage update failed:', err);
      }
    },
    []
  );

  return [values, updateValues, isLoading];
}

export default useBrowserStorage;
