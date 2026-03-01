# SEMD Extension Development Guide

This guide explains how to develop, build, and deploy the SEMD extension for both Chrome and Firefox.

## Project Structure

```
extension/
├── chrome_extension/         # Chrome extension source files
│   ├── manifest.json         # Chrome manifest (v2/v3)
├── firefox_extension/        # Firefox addon specific files
│   └── manifest.json         # Firefox manifest
├── app/                      # Next.js React application
│   └── /components
│   └── /public
├── scripts/
│   └── build-extension.js    # Build script for both browsers
├── out/                      # Built content
├── builds/                   # Distributable zip files (generated)
├── package.json              # Dependencies and scripts
├── tailwind.config.json
├── tsconfig.json
├── next.config.js
└── postcss.config.js
```

## Setup

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Development Workflow

- Build for Chrome
```bash
npm run build:chrome
```

- Build for Firefox
```bash
npm run build:firefox
```
- Build Both
```bash
npm run build:all
```

This builds both Chrome and Firefox versions sequentially.

## Installation & Testing

### Chrome Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `chrome_extension/` folder
5. The extension will appear in your extensions list

**To reload after changes:**
- Click the refresh icon on the extension card in `chrome://extensions/`

### Firefox Installation (Development)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file from `dist-firefox/`
4. The addon will appear in your Firefox extensions

**To reload after changes:**
- Click the reload icon next to the addon in `about:debugging`

## Building for Distribution

### Chrome Web Store

...

Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Firefox Add-ons

...

**Build firefox addons**

```bash
cd ./firefox_addons
zip -r -FS ../semd-addon.xpi .
```

Submit to [Mozilla Add-ons](https://addons.mozilla.org/)

**Manifest Firefox**
```
{
  "manifest_version": 3,
  "name": "SEMD - Suspicious URL Evaluation",
  "version": "1.0.0",
  "description": "SEMD - Suspicious URL Evaluation for Malicious Detection Firefox Extension",

  "browser_action": {
    "default_popup": "index.html",
    "default_title": "SEMD Extension",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  "permissions": ["activeTab", "tabs", "storage"],

  "background": {
    "service_worker": "background.js"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],

  "browser_specific_settings": {
    <!-- Mozilla's open-source web rendering engine -->
    "gecko": {
      "id": "th33raphat@gmail.com",
      "strict_min_version": "42.0",
      "strict_max_version": "50.*"
    }
  }
}

```

### Kiwi browser

...

## Development Commands

```bash
# Start Next.js dev server
npm run dev

# Build Next.js for production
npm run build

# Build Chrome extension
npm run build:chrome

# Build Firefox addon
npm run build:firefox

# Build both
npm run build:all

# Clean all build artifacts
npm run clean

# Lint code
npm run lint
```

## Helper tools

- [Chrome extension icon generator](https://alexleybourne.github.io/chrome-extension-icon-generator/)

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtensions Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Firefox mainfest addons](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- [Example firefox addons](https://github.com/mdn/webextensions-examples.git)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions)
- [Next.js Documentation](https://nextjs.org/docs)