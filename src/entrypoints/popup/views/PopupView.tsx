import React, { useEffect } from 'react';
import PopupBase from '../components/PopupBase';
import ShieldIcon from '../components/ShieldIcon';
import { useCheckUrl } from '@/hooks/useCheckUrl';
import { useActiveTab } from '@/hooks/useActiveTab';
import { useCloseTabs } from '@/hooks/useCloseTabs';
import { LABELS } from '@/utils/constants';

interface PopupViewProps {
  onClose?: () => void;
  onSettings?: () => void;
}

export default function PopupView({ onClose, onSettings }: PopupViewProps) {
  const [activeTab, , tabLoading] = useActiveTab();
  const { scanResult, isLoading, error, checkUrl } = useCheckUrl();
  const { closeTab } = useCloseTabs();

  useEffect(() => {
    if (activeTab.url && !tabLoading) {
      checkUrl(activeTab.url);
    }
  }, [activeTab.url, tabLoading, checkUrl]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeTab();
    }
  };

  const handleSettings = () => {
    if (onSettings) {
      onSettings();
    }
  };

  const isSafe = scanResult ? !scanResult.isMalicious : true;
  const accuracy = scanResult ? scanResult.accuracy.toFixed(2) : 0;
  const variant = isSafe ? 'safe' : 'danger';
  const statusText = isSafe ? LABELS.SAFE : LABELS.DANGER;
  const statusColor = isSafe ? '#4CAF50' : '#F44336';

  if (isLoading || tabLoading) {
    return (
      <PopupBase title="SEMD" variant="default" onClose={handleClose} onSettings={handleSettings}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #F5D76E',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: '#666', marginTop: '16px', fontSize: '14px' }}>กำลังตรวจสอบ...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </PopupBase>
    );
  }

  if (error) {
    return (
      <PopupBase title="SEMD" variant="default" onClose={handleClose} onSettings={handleSettings}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: '#F44336', fontSize: '14px' }}>{error}</p>
        </div>
      </PopupBase>
    );
  }

  return (
    <PopupBase title="SEMD" variant={variant} onClose={handleClose} onSettings={handleSettings}>
      <div style={{ marginBottom: '16px' }}>
        <ShieldIcon variant={isSafe ? 'safe' : 'danger'} />
      </div>

      <p
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: statusColor,
          margin: '0 0 8px 0',
        }}
      >
        {statusText} {accuracy}%
      </p>

      <p
        style={{
          fontSize: '12px',
          color: '#999',
          margin: 0,
          wordBreak: 'break-all',
          textAlign: 'center',
          maxWidth: '280px',
        }}
      >
        {activeTab.url || scanResult?.url || ''}
      </p>
    </PopupBase>
  );
}
