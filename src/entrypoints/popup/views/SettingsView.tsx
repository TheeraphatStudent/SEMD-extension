import React, { useState, useEffect } from 'react';
import { useBrowserStorageMultiple } from '@/hooks/useBrowserStorage';
import { useCloseTabs } from '@/hooks/useCloseTabs';
import PopupBase from '../components/PopupBase';
import { LABELS, DEFAULT_API_ENDPOINT } from '@/utils/constants';

interface SettingsViewProps {
  onClose?: () => void;
  onBack?: () => void;
}

export default function SettingsView({ onClose, onBack }: SettingsViewProps) {
  const [storage, updateStorage, isLoading] = useBrowserStorageMultiple(['apiEndpoint', 'apiKey']);
  const { closeTab } = useCloseTabs();
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setApiEndpoint(storage.apiEndpoint || DEFAULT_API_ENDPOINT);
      setApiKey(storage.apiKey || '');
    }
  }, [isLoading, storage]);

  const handleClose = () => {
    if (onBack) {
      onBack();
    } else if (onClose) {
      onClose();
    } else {
      closeTab();
    }
  };

  const handleSave = async () => {
    await updateStorage({
      apiEndpoint: apiEndpoint || DEFAULT_API_ENDPOINT,
      apiKey,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    setApiEndpoint(DEFAULT_API_ENDPOINT);
    setApiKey('');
    await updateStorage({
      apiEndpoint: DEFAULT_API_ENDPOINT,
      apiKey: '',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    border: '2px solid #C4A84B',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '6px',
  };

  return (
    <PopupBase title={LABELS.SETTINGS_TITLE} variant="default" onClose={handleClose}>
      <div style={{ width: '100%' }}>
        <label style={labelStyle}>API Endpoint</label>
        <input
          type="text"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder={DEFAULT_API_ENDPOINT}
          style={inputStyle}
        />

        <label style={labelStyle}>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API key (optional)"
          style={inputStyle}
        />

        {saved && (
          <p style={{ color: '#4CAF50', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
            บันทึกสำเร็จ!
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              border: '2px solid #C4A84B',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#C4A84B',
              cursor: 'pointer',
            }}
          >
            รีเซ็ต
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              background: '#F5D76E',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#333',
              cursor: 'pointer',
            }}
          >
            บันทึก
          </button>
        </div>
      </div>
    </PopupBase>
  );
}
