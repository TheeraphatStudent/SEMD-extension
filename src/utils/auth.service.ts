import { storage } from './storage';
import { ACCESS_CODE_LENGTH } from './constants';

export interface AuthStatus {
  isAuthenticated: boolean;
  accessCode: string | null;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const { accessCode, isAuthenticated } = await storage.get(['accessCode', 'isAuthenticated']);

  return {
    isAuthenticated: isAuthenticated && !!accessCode,
    accessCode: accessCode || null,
  };
}

export async function validateAccessCode(code: string): Promise<boolean> {
  console.log('[SEMD] Validating access code');

  if (!code || code.length !== ACCESS_CODE_LENGTH) {
    console.log('[SEMD] Invalid access code format');
    return false;
  }

  const isValid = /^[A-Za-z0-9]{6}$/.test(code);

  if (isValid) {
    await storage.set({
      accessCode: code,
      isAuthenticated: true,
    });
    console.log('[SEMD] Access code validated and stored');
    return true;
  }

  console.log('[SEMD] Access code validation failed');
  return false;
}

export async function logout(): Promise<void> {
  await storage.set({
    accessCode: null,
    isAuthenticated: false,
  });
  console.log('[SEMD] User logged out');
}

export async function requireAuth(): Promise<boolean> {
  const { isAuthenticated } = await getAuthStatus();
  return isAuthenticated;
}
