'use client';

import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginView, PopupView, SettingsView } from './views';

type ViewType = 'login' | 'popup' | 'settings';

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('popup');

  const handleClose = () => {
    window.close();
  };

  const handleLoginSuccess = () => {
    setCurrentView('popup');
  };

  const handleSettings = () => {
    setCurrentView('settings');
  };

  const handleBackFromSettings = () => {
    setCurrentView('popup');
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: '320px',
          minHeight: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #FFF9E6 0%, #FFFFFF 100%)',
          borderRadius: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #F5D76E',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onSuccess={handleLoginSuccess} onClose={handleClose} />;
  }

  if (currentView === 'settings') {
    return <SettingsView onClose={handleClose} onBack={handleBackFromSettings} />;
  }

  return <PopupView onClose={handleClose} onSettings={handleSettings} />;
}
