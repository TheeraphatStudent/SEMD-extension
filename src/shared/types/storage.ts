import type { ScanResult } from './scan';

export interface StorageSchema {
  accessCode: string | null;
  apiEndpoint: string;
  apiKey: string;
  scanHistory: ScanResult[];
  isAuthenticated: boolean;
}

export const StorageKeys = {
  ACCESS_CODE: 'accessCode',
  API_ENDPOINT: 'apiEndpoint',
  API_KEY: 'apiKey',
  SCAN_HISTORY: 'scanHistory',
  IS_AUTHENTICATED: 'isAuthenticated',
} as const;

export type StorageKey = keyof StorageSchema;

export const DEFAULT_STORAGE: StorageSchema = {
  accessCode: null,
  apiEndpoint: 'http://localhost:8000/api/v1/predict/predict',
  apiKey: '',
  scanHistory: [],
  isAuthenticated: false,
};
