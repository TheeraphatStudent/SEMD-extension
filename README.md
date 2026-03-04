# SEMD Extension

SEMD - Suspicious URL Evaluation for Malicious Detection Browser Extension

Built with [WXT](https://wxt.dev/) framework.

## Project Structure

```
src/
├── entrypoints/           # WXT entrypoints
│   ├── background.ts      # Service worker (message handler)
│   ├── content.ts         # Content script (URL monitoring, overlay)
│   └── popup/             # Popup UI (React)
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── style.css
│       ├── components/    # UI components
│       └── views/         # View components
├── hooks/                 # React hooks
│   ├── useAuth.ts
│   ├── useActiveTab.ts
│   ├── useBrowserStorage.ts
│   └── useCheckUrl.ts
└── utils/                 # Shared utilities
    ├── types.ts           # TypeScript types
    ├── constants.ts       # Constants and labels
    ├── storage.ts         # Browser storage wrapper
    ├── api.service.ts     # API calls
    ├── auth.service.ts    # Authentication
    ├── config.service.ts  # Configuration
    ├── history.service.ts # Scan history
    └── overlay.ts         # Warning overlay
```

## Commands

```bash
# Install dependencies
npm install

# Development (Chrome)
npm run dev

# Development (Firefox)
npm run dev:firefox

# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Create ZIP packages
npm run zip
npm run zip:firefox
```

## Output

- **Chrome**: `.output/chrome-mv3/` - Load as unpacked extension
- **Firefox**: `.output/firefox-mv2/` - Load as temporary add-on

## Features

- **Login** - 6-digit access code authentication
- **URL Scanning** - Real-time malicious URL detection
- **Warning Overlay** - Full-page warning for dangerous sites
- **Settings** - Configurable API endpoint
- **History** - Scan history tracking


## Resources

- [WXT Documentation](https://wxt.dev/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtensions Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Chrome extension icon generator](https://alexleybourne.github.io/chrome-extension-icon-generator/)