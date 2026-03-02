import { useState, useEffect, useCallback } from 'react';

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

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab) {
        setActiveTab({
          id: tab.id ?? null,
          url: tab.url ?? '',
          title: tab.title ?? '',
        });
      }
    } catch (err) {
      console.error('[SEMD] Failed to get active tab:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTab();
  }, [fetchActiveTab]);

  return [activeTab, fetchActiveTab, isLoading];
}

export default useActiveTab;
