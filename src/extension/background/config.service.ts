import storage from '../adapters/storage.adapter';
import type { ApiConfig } from '../../shared/types';
import { DEFAULT_API_ENDPOINT } from '../../shared/constants';

export async function getConfig(): Promise<ApiConfig> {
  const { apiEndpoint, apiKey } = await storage.get(['apiEndpoint', 'apiKey']);

  return {
    apiEndpoint: apiEndpoint || DEFAULT_API_ENDPOINT,
    apiKey: apiKey || '',
  };
}

export async function setConfig(config: Partial<ApiConfig>): Promise<void> {
  const updates: Partial<ApiConfig> = {};

  if (config.apiEndpoint !== undefined) {
    updates.apiEndpoint = config.apiEndpoint;
  }

  if (config.apiKey !== undefined) {
    updates.apiKey = config.apiKey;
  }

  if (Object.keys(updates).length > 0) {
    await storage.set(updates);
    console.log('[SEMD] Config updated:', Object.keys(updates));
  }
}

export async function resetConfig(): Promise<void> {
  await storage.set({
    apiEndpoint: DEFAULT_API_ENDPOINT,
    apiKey: '',
  });
  console.log('[SEMD] Config reset to defaults');
}
