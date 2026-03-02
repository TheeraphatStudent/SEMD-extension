# SEMD Extension - Refactored Structure

## Directory Structure

```
src/
├── shared/                          # Shared between Next.js and extension
│   ├── types/
│   │   ├── index.ts                 # Re-exports all types
│   │   ├── messages.ts              # Message bus types (CHECK_URL, SHOW_OVERLAY, etc.)
│   │   ├── api.ts                   # API request/response shapes
│   │   ├── storage.ts               # Storage schema types
│   │   └── scan.ts                  # ScanResult, UIState types
│   └── constants/
│       └── index.ts                 # API endpoints, storage keys, Thai labels
│
├── extension/                       # Browser extension scripts
│   ├── adapters/
│   │   ├── browser.adapter.ts       # chrome.* vs browser.* abstraction
│   │   └── storage.adapter.ts       # Unified storage get/set
│   ├── background/
│   │   ├── index.ts                 # Thin orchestrator (message handler)
│   │   ├── api.service.ts           # API fetch logic
│   │   ├── history.service.ts       # Scan history management
│   │   ├── config.service.ts        # apiEndpoint, apiKey management
│   │   └── auth.service.ts          # Access code validation
│   └── content/
│       ├── index.ts                 # Message listener, URL monitoring
│       └── overlay.ts               # Warning overlay DOM injection
│
└── app/                             # Next.js App Router
    ├── layout.tsx                   # Root layout
    ├── page.tsx                     # Auth gate → routes to login or popup
    ├── globals.css                  # Tailwind + custom styles
    ├── login/
    │   └── page.tsx                 # 6-digit OTP login
    ├── popup/
    │   └── page.tsx                 # SAFE/MALICIOUS result display
    ├── settings/
    │   └── page.tsx                 # API endpoint/key configuration
    ├── dashboard/
    │   └── page.tsx                 # Scan history list
    ├── components/
    │   ├── PopupBase.tsx            # Shared popup wrapper
    │   ├── ShieldIcon.tsx           # Safe/Danger shield icons
    │   └── OTPInput.tsx             # 6-digit input component
    └── hooks/
        ├── useCheckUrl.ts           # Sends CHECK_URL message
        ├── useBrowserStorage.ts     # chrome.storage React wrapper
        ├── useActiveTab.ts          # Gets current tab URL
        └── useAuth.ts               # Authentication state management
```

## Build Commands

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for Chrome
npm run build:chrome

# Build for Firefox
npm run build:firefox

# Build for both
npm run build:all

# Type checking
npm run typecheck
```

## Output Directories

- **Chrome**: `out/chrome/` - Load as unpacked extension
- **Firefox**: `out/firefox/` - Load as temporary add-on
- **Firefox packages**: `export/semd-addon.xpi` and `export/semd-addon.zip`

## UI States

1. **LOGIN** - 6-digit OTP input with gold/cream styling
2. **POPUP (SAFE)** - Green shield with checkmark, "ปลอดภัย XX%"
3. **POPUP (MALICIOUS)** - Red shield with "!", "อันตราย XX%"
4. **OVERLAY** - Full-page warning with proceed/close options

## Message Types

- `CHECK_URL` - Request URL scan from background
- `URL_RESULT` - Response with scan result
- `SHOW_OVERLAY` - Trigger warning overlay in content script
- `DISMISS_OVERLAY` - Remove overlay
- `GET_AUTH_STATUS` - Check if user is authenticated
- `VALIDATE_ACCESS_CODE` - Validate 6-digit code
- `LOGOUT` - Clear authentication

## Storage Schema

```typescript
interface StorageSchema {
  accessCode: string | null;
  apiEndpoint: string;
  apiKey: string;
  scanHistory: ScanResult[];
  isAuthenticated: boolean;
}
```
