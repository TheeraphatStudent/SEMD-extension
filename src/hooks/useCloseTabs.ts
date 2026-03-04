import { MessageType } from '@/utils/types';
import { browser } from 'wxt/browser';

export function useCloseTabs() {
  const closeTab = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      browser.tabs.remove(tabs[0].id);
    }
  };

  return { closeTab };
}