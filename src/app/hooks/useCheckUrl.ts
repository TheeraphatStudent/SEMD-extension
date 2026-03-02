'use client';

import { useState, useCallback } from 'react';
import { MessageType, type ScanResult, type MessageResponse, type CheckUrlResponse } from '../../shared/types';

declare const chrome: {
  runtime?: {
    sendMessage: (
      message: unknown,
      callback?: (response: unknown) => void
    ) => void;
    lastError?: { message: string };
  };
};

const isDev = typeof window !== 'undefined' && !window.chrome?.runtime?.id;

export interface UseCheckUrlResult {
  scanResult: ScanResult | null;
  isLoading: boolean;
  error: string | null;
  checkUrl: (url: string) => Promise<ScanResult | null>;
  reset: () => void;
}

export function useCheckUrl(): UseCheckUrlResult {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUrl = useCallback(async (url: string): Promise<ScanResult | null> => {
    if (isDev) {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 500));
      const mockResult: ScanResult = {
        url,
        isMalicious: url.includes('malicious') || url.includes('danger'),
        accuracy: 0.95,
        suggested: url.includes('malicious') || url.includes('danger') ? 'block' : 'allow',
        timestamp: new Date().toISOString(),
      };
      setScanResult(mockResult);
      setIsLoading(false);
      return mockResult;
    }

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setError('Chrome runtime not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      chrome.runtime!.sendMessage(
        { type: MessageType.CHECK_URL, url },
        (response: unknown) => {
          setIsLoading(false);

          if (chrome.runtime?.lastError) {
            const errMsg = chrome.runtime.lastError.message || 'Unknown error';
            setError(errMsg);
            resolve(null);
            return;
          }

          const typedResponse = response as MessageResponse<CheckUrlResponse>;

          if (typedResponse?.success && typedResponse.data?.result) {
            setScanResult(typedResponse.data.result);
            resolve(typedResponse.data.result);
          } else {
            setError(typedResponse?.error || 'Failed to check URL');
            resolve(null);
          }
        }
      );
    });
  }, []);

  const reset = useCallback(() => {
    setScanResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { scanResult, isLoading, error, checkUrl, reset };
}

export default useCheckUrl;
