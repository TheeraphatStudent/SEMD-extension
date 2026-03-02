import { useState, useCallback } from 'react';
import { MessageType, type ScanResult, type MessageResponse, type CheckUrlResponse } from '@/utils/types';

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

    setIsLoading(true);
    setError(null);

    try {
      const response = await browser.runtime.sendMessage({ type: MessageType.CHECK_URL, url });
      const typedResponse = response as MessageResponse<CheckUrlResponse>;

      if (typedResponse?.success && typedResponse.data?.result) {
        setScanResult(typedResponse.data.result);
        return typedResponse.data.result;
      } else {
        setError(typedResponse?.error || 'Failed to check URL');
        return null;
      }
    } catch (err) {
      setError('Failed to check URL');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setScanResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { scanResult, isLoading, error, checkUrl, reset };
}

export default useCheckUrl;
