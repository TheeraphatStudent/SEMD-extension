import React, { useState } from 'react';
import PopupBase from '../components/PopupBase';
import OTPInput from '../components/AccessCodeInput';
import { useAuth } from '@/hooks/useAuth';
import { useCloseTabs } from '@/hooks/useCloseTabs';
import { LABELS, ACCESS_CODE_LENGTH } from '@/utils/constants';

interface LoginViewProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function LoginView({ onSuccess, onClose }: LoginViewProps) {
  const { login, isLoading } = useAuth();
  const { closeTab } = useCloseTabs();
  const [code, setCode] = useState<string[]>(Array(ACCESS_CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeTab();
    }
  };

  const handleSubmit = async () => {
    const accessCode = code.join('');

    if (accessCode.length !== ACCESS_CODE_LENGTH) {
      setError('กรุณากรอกรหัสให้ครบ 6 หลัก');
      return;
    }

    setError(null);
    const success = await login(accessCode);

    if (success) {
      console.log('[SEMD] Login successful, calling onSuccess');
      if (onSuccess) {
        await onSuccess();
      }
    } else {
      setError('รหัสไม่ถูกต้อง กรุณาลองใหม่');
    }
  };

  return (
    <PopupBase title={LABELS.LOGIN_TITLE} variant="default" onClose={handleClose}>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
        {LABELS.LOGIN_PROMPT}
      </p>

      <div style={{ marginBottom: '24px' }}>
        <OTPInput value={code} onChange={setCode} disabled={isLoading} />
      </div>

      {error && (
        <p style={{ color: '#F44336', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '14px',
          background: isLoading ? '#ccc' : '#F5D76E',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#333',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {isLoading ? 'กำลังตรวจสอบ...' : LABELS.LOGIN_BUTTON}
      </button>
    </PopupBase>
  );
}
