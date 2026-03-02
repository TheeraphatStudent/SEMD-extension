import { storage } from './storage';
import type { ScanResult } from './types';
import { MAX_HISTORY_SIZE } from './constants';

export async function saveToHistory(result: ScanResult): Promise<void> {
  const { scanHistory } = await storage.get('scanHistory');
  const history = scanHistory || [];

  history.unshift(result);
  const trimmedHistory = history.slice(0, MAX_HISTORY_SIZE);

  await storage.set({ scanHistory: trimmedHistory });
  console.log('[SEMD] Saved to history, total entries:', trimmedHistory.length);
}

export async function getHistory(): Promise<ScanResult[]> {
  const { scanHistory } = await storage.get('scanHistory');
  return scanHistory || [];
}

export async function clearHistory(): Promise<void> {
  await storage.set({ scanHistory: [] });
  console.log('[SEMD] History cleared');
}

export async function removeFromHistory(timestamp: string): Promise<void> {
  const { scanHistory } = await storage.get('scanHistory');
  const history = scanHistory || [];

  const filtered = history.filter((item) => item.timestamp !== timestamp);
  await storage.set({ scanHistory: filtered });
  console.log('[SEMD] Removed entry from history');
}
