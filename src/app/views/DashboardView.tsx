'use client';

import React from 'react';
import { PopupBase } from '../components/PopupBase';
import { useBrowserStorage } from '../hooks/useBrowserStorage';
import { THAI_LABELS } from '../../shared/constants';
import type { ScanResult } from '../../shared/types';

interface DashboardViewProps {
  onClose?: () => void;
  onBack?: () => void;
}

export function DashboardView({ onClose, onBack }: DashboardViewProps) {
  const [scanHistory, , isLoading] = useBrowserStorage('scanHistory');

  const handleClose = () => {
    if (onBack) {
      onBack();
    } else if (onClose) {
      onClose();
    } else {
      window.close();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateUrl = (url: string, maxLength = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <PopupBase title={THAI_LABELS.DASHBOARD_TITLE} variant="default" onClose={handleClose}>
      <div style={{ width: '100%', maxHeight: '300px', overflowY: 'auto' }}>
        {isLoading ? (
          <p style={{ color: '#666', textAlign: 'center', fontSize: '14px' }}>กำลังโหลด...</p>
        ) : scanHistory.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', fontSize: '14px' }}>ไม่มีประวัติการสแกน</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scanHistory.slice(0, 20).map((item: ScanResult, index: number) => (
              <div
                key={item.timestamp + index}
                style={{
                  padding: '10px 12px',
                  background: item.isMalicious ? '#FFEBEE' : '#E8F5E9',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${item.isMalicious ? '#F44336' : '#4CAF50'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: item.isMalicious ? '#F44336' : '#4CAF50',
                    }}
                  >
                    {item.isMalicious ? 'อันตราย' : 'ปลอดภัย'} {Math.round(item.accuracy * 100)}%
                  </span>
                  <span style={{ fontSize: '10px', color: '#999' }}>{formatDate(item.timestamp)}</span>
                </div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#666',
                    margin: '4px 0 0 0',
                    wordBreak: 'break-all',
                  }}
                  title={item.url}
                >
                  {truncateUrl(item.url)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PopupBase>
  );
}

export default DashboardView;
