'use client';

import { useState, useEffect, useCallback } from 'react';

declare const chrome: {
  tabs?: {
    query: (
      queryInfo: { active: boolean; currentWindow: boolean },
      callback: (tabs: Array<{ id?: number; url?: string; title?: string }>) => void
    ) => void;
  };
};

const isDev = typeof window !== 'undefined' && !window.chrome?.runtime?.id;

export interface ActiveTab {
  id: number | null;
  url: string;
  title: string;
}

export function useActiveTab(): [ActiveTab, () => Promise<void>, boolean] {
  const [activeTab, setActiveTab] = useState<ActiveTab>({
    id: null,
    url: '',
    title: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveTab = useCallback(async (): Promise<void> => {
    if (isDev) {
      setActiveTab({
        id: 1,
        url: window.location.href || 'https://example.com',
        title: document.title || 'Dev Mode',
      });
      setIsLoading(false);
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setIsLoading(false);
      return;
    }

    return new Promise((resolve) => {
      chrome.tabs!.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          setActiveTab({
            id: tab.id ?? null,
            url: tab.url ?? '',
            title: tab.title ?? '',
          });
        }
        setIsLoading(false);
        resolve();
      });
    });
  }, []);

  useEffect(() => {
    fetchActiveTab();
  }, [fetchActiveTab]);

  return [activeTab, fetchActiveTab, isLoading];
}

export default useActiveTab;
