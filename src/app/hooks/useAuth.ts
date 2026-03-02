'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageType, type MessageResponse, type AuthStatusResponse } from '../../shared/types';
import { ACCESS_CODE_LENGTH } from '../../shared/constants';

declare const chrome: {
  runtime?: {
    sendMessage: (message: unknown, callback?: (response: unknown) => void) => void;
    lastError?: { message: string };
  };
};

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

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setIsLoading(false);
      return;
    }

    return new Promise((resolve) => {
      chrome.runtime!.sendMessage(
        { type: MessageType.GET_AUTH_STATUS },
        (response: unknown) => {
          setIsLoading(false);

          if (chrome.runtime?.lastError) {
            setError(chrome.runtime.lastError.message || 'Unknown error');
            resolve();
            return;
          }

          const typedResponse = response as MessageResponse<AuthStatusResponse>;

          if (typedResponse?.success && typedResponse.data) {
            setIsAuthenticated(typedResponse.data.isAuthenticated);
          }
          resolve();
        }
      );
    });
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

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setError('Chrome runtime not available');
      return false;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      chrome.runtime!.sendMessage(
        { type: MessageType.VALIDATE_ACCESS_CODE, code },
        (response: unknown) => {
          setIsLoading(false);

          if (chrome.runtime?.lastError) {
            setError(chrome.runtime.lastError.message || 'Unknown error');
            resolve(false);
            return;
          }

          const typedResponse = response as MessageResponse;

          if (typedResponse?.success) {
            setIsAuthenticated(true);
            resolve(true);
          } else {
            setError(typedResponse?.error || 'Invalid access code');
            resolve(false);
          }
        }
      );
    });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (isDev) {
      localStorage.removeItem(DEV_STORAGE_KEY);
      setIsAuthenticated(false);
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setIsAuthenticated(false);
      return;
    }

    return new Promise((resolve) => {
      chrome.runtime!.sendMessage({ type: MessageType.LOGOUT }, () => {
        setIsAuthenticated(false);
        resolve();
      });
    });
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return { isAuthenticated, isLoading, error, login, logout, checkAuthStatus };
}

export default useAuth;
