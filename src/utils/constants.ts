export const DEFAULT_API_ENDPOINT = 'http://localhost:8000/api/v1/predict';
export const EXTENSION_NAME = 'SEMD';
export const MAX_HISTORY_SIZE = 100;
export const ACCESS_CODE_LENGTH = 6;
export const OVERLAY_ID = 'semd-warning-overlay';

export const LABELS = {
  LOGIN_TITLE: 'Login',
  LOGIN_PROMPT: 'กรอก Access code จากเว็บไซต์:',
  LOGIN_BUTTON: 'เข้าใช้งาน',
  SAFE: 'ปลอดภัย',
  DANGER: 'อันตราย',
  OVERLAY_QUESTION: 'คุณต้องการเข้าเว็บไซต์',
  OVERLAY_PROCEED: 'ใช่, ดำเนินการต่อ',
  OVERLAY_CLOSE: 'ไม่, ปิดเว็บไซต์นี้',
  SETTINGS_TITLE: 'ตั้งค่า',
  DASHBOARD_TITLE: 'ประวัติการสแกน',
} as const;

export const COLORS = {
  CREAM_BG: '#FFF9E6',
  GOLD_ACCENT: '#F5D76E',
  GOLD_BORDER: '#C4A84B',
  SAFE_GREEN: '#4CAF50',
  SAFE_GREEN_DARK: '#388E3C',
  DANGER_RED: '#F44336',
  DANGER_RED_DARK: '#D32F2F',
  DANGER_PINK_BG: '#FFEBEE',
  SAFE_GREEN_BG: '#E8F5E9',
} as const;
