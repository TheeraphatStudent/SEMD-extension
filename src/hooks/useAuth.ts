import { useState, useEffect, useCallback } from 'react';
import { MessageType, type MessageResponse, type AuthStatusResponse } from '@/utils/types';
import { ACCESS_CODE_LENGTH } from '@/utils/constants';

const isDev = typeof window !== 'undefined' && !window.chrome?.runtime?.id;
const DEV_STORAGE_KEY = 'semd_dev_auth';

export interface UseAuthResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async (): Promise<void> => {
    if (isDev) {
      const stored = localStorage.getItem(DEV_STORAGE_KEY);
      setIsAuthenticated(stored === 'true');
      setIsLoading(false);
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({ type: MessageType.GET_AUTH_STATUS });
      const typedResponse = response as MessageResponse<AuthStatusResponse>;

      if (typedResponse?.success && typedResponse.data) {
        setIsAuthenticated(typedResponse.data.isAuthenticated);
      }
    } catch (err) {
      console.error('[SEMD] Auth status check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (code: string): Promise<boolean> => {
    if (isDev) {
      const isValid = code.length === ACCESS_CODE_LENGTH && /^[A-Za-z0-9]{6}$/.test(code);
      if (isValid) {
        localStorage.setItem(DEV_STORAGE_KEY, 'true');
        setIsAuthenticated(true);
        return true;
      }
      setError('Invalid access code format');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await browser.runtime.sendMessage({ type: MessageType.VALIDATE_ACCESS_CODE, code });
      const typedResponse = response as MessageResponse;

      if (typedResponse?.success) {
        setIsAuthenticated(true);
        return true;
      } else {
        setError(typedResponse?.error || 'Invalid access code');
        return false;
      }
    } catch (err) {
      setError('Failed to validate access code');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (isDev) {
      localStorage.removeItem(DEV_STORAGE_KEY);
      setIsAuthenticated(false);
      return;
    }

    try {
      await browser.runtime.sendMessage({ type: MessageType.LOGOUT });
      setIsAuthenticated(false);
    } catch (err) {
      console.error('[SEMD] Logout failed:', err);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return { isAuthenticated, isLoading, error, login, logout, checkAuthStatus };
}

export default useAuth;
