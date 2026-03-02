export interface ScanResult {
  url: string;
  isMalicious: boolean;
  accuracy: number;
  suggested: string;
  timestamp: string;
  error?: string;
}

export const UIState = {
  LOGIN: 'LOGIN',
  SAFE: 'SAFE',
  MALICIOUS: 'MALICIOUS',
  LOADING: 'LOADING',
  ERROR: 'ERROR',
} as const;

export type UIStateValue = (typeof UIState)[keyof typeof UIState];

export interface PopupState {
  uiState: UIStateValue;
  currentUrl: string;
  scanResult: ScanResult | null;
  isLoading: boolean;
  error: string | null;
}
