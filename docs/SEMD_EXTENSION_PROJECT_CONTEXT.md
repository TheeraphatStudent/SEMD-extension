# SEMD Extension Project Context

## 1. Executive Summary

Confirmed: `semd-extension` is a very small browser-extension project built from a single Next.js App Router page and two browser-target folders (`chrome_extension/`, `firefox_addons/`). Current behavior is split between:

- Popup UI rendered from `app/page.tsx`
- URL scanning logic in plain JavaScript background/content scripts
- Packaging logic in `scripts/build-extension.js`

Confirmed: extension currently checks visited page URLs after navigation, sends each URL to a local SEMD prediction API, and overlays a blocking warning only when API returns malicious. Popup UI is mostly static/demo-grade: it defaults to a safe state with `accuracy: -99`, has a mock access-code screen, and is not wired to extension storage or background messaging.

Main architectural constraints:

- Popup runtime is single-page, no routing, no shared module boundaries
- Background/content logic duplicated across source and built folders
- Build pipeline mixes source and generated artifacts in same folders
- Theme system is minimal; most visual values are hard-coded inline

Main UI constraints:

- Future redesign should preserve existing brand colors `primary` `#FFCE69` and `secondary` `#799EFF` from Tailwind config
- Popup dimensions currently assume about `320x280`
- Existing extension warning overlay uses hard-coded red/green danger patterns outside theme

Main refactor risks:

- Current build script skips `_next` assets, so rebuilt popup likely breaks interactivity
- API failure currently resolves as non-malicious, creating false-safe behavior
- Access Code/auth flow described in UI does not exist in implementation

Evidence:
- `package.json`
- `app/page.tsx`
- `chrome_extension/background.js`
- `chrome_extension/content.js`
- `scripts/build-extension.js`
- `tailwind.config.js`

## 2. Repository and Workspace Structure

Focused tree:

```text
.
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── public/logo.png
├── chrome_extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── index.html
│   └── icons/
├── firefox_addons/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── index.html
│   └── icons/
├── scripts/
│   ├── build-extension.js
│   └── additional_scripts/
│       ├── background.js
│       └── content.js
├── out/
│   └── _next/...
├── export/
│   ├── firefox_addons.zip
│   └── semd-addon.xpi
├── extension.conf.yaml
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

Important folders:

- `app/`: source for popup UI. Only one page exists. No shared components folder, hooks folder, state folder, or API layer.
- `chrome_extension/`: checked-in Chrome extension artifact/source bundle. Contains manifest, background script, content script, built popup HTML, icons.
- `firefox_addons/`: checked-in Firefox add-on artifact/source bundle. Same structure as Chrome target.
- `scripts/additional_scripts/`: source copies of background/content scripts. Build script copies these into browser target folders.
- `out/`: generated Next.js export output. Should be treated as generated.
- `export/`: generated packaged Firefox artifacts. Should be treated as generated/distribution output.

Workspace-level/shared dependencies outside this directory:

- Not found. No imports reference sibling workspace packages.

Generated files that should not be edited during future refactor:

- `out/**`
- `chrome_extension/index.html`
- `firefox_addons/index.html`
- `export/*.xpi`
- `export/*.zip`

Evidence:
- `package.json`
- `next.config.js`
- `scripts/build-extension.js`
- `chrome_extension/index.html`
- `firefox_addons/index.html`

## 3. Technology Stack

| Area | Technology | Version | Evidence |
| ---- | ---------- | ------: | -------- |
| Package manager | npm lockfile present | lockfile v3 | `package-lock.json` |
| Alternate package manager | Bun lockfile present | lockfile v1 | `bun.lock` |
| UI framework | React | `^18.0.0` | `package.json` |
| App framework | Next.js App Router static export | `^14.0.0` | `package.json`, `app/layout.tsx`, `next.config.js` |
| Extension manifest | Chrome MV3 | `3` | `chrome_extension/manifest.json` |
| Extension manifest | Firefox manifest declared as MV3-like but background format mismatched | `3` | `firefox_addons/manifest.json` |
| Language | TypeScript + JavaScript | TS `^5.0.0` | `package.json`, `tsconfig.json`, `app/*.tsx`, `chrome_extension/*.js` |
| Styling | Tailwind CSS configured but barely used | `^3.3.5` | `package.json`, `tailwind.config.js`, `app/globals.css` |
| PostCSS | autoprefixer + tailwindcss | `^8.4.31`, `^10.4.16` | `package.json`, `postcss.config.js` |
| Popup alert library | SweetAlert2 | `^11.26.17` | `package.json`, `app/page.tsx` |
| Browser typings | `@types/chrome` | `^0.0.254` | `package.json` |
| Linting | ESLint via Next | `^8.0.0` | `package.json` |
| Animation library | Not found | - | no imports besides CSS transitions in `app/page.tsx` |
| State management | React local state only | - | `app/page.tsx` |
| Form library | Not found | - | no package/import |
| Validation library | Not found | - | no package/import |
| API client | native `fetch` | browser built-in | `chrome_extension/background.js` |
| Testing framework | Not found | - | no test deps, no test files, no scripts |
| Extension framework | Not found | - | manual manifests + manual build script |
| Monorepo tooling | Not found | - | no workspace config in repo scope |

Evidence:
- `package.json`
- `package-lock.json`
- `bun.lock`
- `next.config.js`
- `tailwind.config.js`
- `postcss.config.js`

## 4. Extension Entry Points

| Entry Point | File | Responsibility | Runtime |
| ----------- | ---- | -------------- | ------- |
| Popup page source | `app/page.tsx` | React popup UI with login/prediction variants | Next.js client component |
| Popup page built artifact | `chrome_extension/index.html` | HTML loaded by Chrome popup | extension popup |
| Popup page built artifact | `firefox_addons/index.html` | HTML loaded by Firefox popup | extension popup |
| Root layout | `app/layout.tsx` | Popup metadata and HTML shell | Next.js |
| Chrome background | `chrome_extension/background.js` | Receives `CHECK_URL`, calls API, stores history/config | extension service worker |
| Firefox background | `firefox_addons/background.js` | Same logic, but manifest wiring looks questionable | background runtime |
| Chrome content script | `chrome_extension/content.js` | Monitors URL changes and shows warning overlay | injected content script |
| Firefox content script | `firefox_addons/content.js` | Same logic | injected content script |
| Script source copies | `scripts/additional_scripts/*.js` | Canonical copies later copied into targets | build input |
| Build pipeline | `scripts/build-extension.js` | Runs Next build, copies assets/scripts, rewrites manifest, packages Firefox | Node CLI |

Evidence:
- `chrome_extension/manifest.json`
- `firefox_addons/manifest.json`
- `app/page.tsx`
- `scripts/build-extension.js`

## 5. Runtime Architecture

Popup:

- Confirmed: popup is isolated from background/content logic. It does not send `chrome.runtime` messages, does not read `chrome.storage`, and does not request current tab.
- Confirmed: popup initial state is `prediction` view with `isSafe: true`, `accuracy: -99`, empty URL.

Background/service worker:

- Confirmed: listens only for `message.type === "CHECK_URL"`.
- Confirmed: reads `apiEndpoint` and `apiKey` from `chrome.storage.local`.
- Confirmed: sends POST `{ url }` to SEMD API.
- Confirmed: stores up to 100 results in `scanHistory`.

Content script:

- Confirmed: scans initial `window.location.href` on load.
- Confirmed: detects later URL changes via `popstate`, `hashchange`, monkeypatched `history.pushState`, monkeypatched `history.replaceState`, and `MutationObserver`.
- Confirmed: if response says malicious, appends full-page warning overlay into page DOM.

Message passing:

- Confirmed: content script sends `chrome.runtime.sendMessage({ type: "CHECK_URL", url })`.
- Confirmed: background responds asynchronously with result object.

Runtime flow:

```text
Extension installed
  -> background seeds chrome.storage.local with apiEndpoint, apiKey, scanHistory

User opens page
  -> content script loads at document_start
  -> Blocker.init() reads current URL
  -> content script sends CHECK_URL message to background
  -> background fetches SEMD API with POST { url } and x-api-key header
  -> background stores result in scanHistory
  -> result returns to content script
  -> if isMalicious === true, content script overlays warning
  -> user chooses "Go Back to Safety" or "Proceed Anyway"

User navigates within SPA/history/hash change
  -> content script detects URL change
  -> repeat CHECK_URL flow
```

What runs on install/start/open:

- On install: `chrome.runtime.onInstalled` seeds storage. Confirmed.
- On browser start: no `onStartup` listener. Not found.
- On popup open: popup React tree mounts. It only reads `localStorage.getItem('lastPrediction')` and logs it. No state update. Confirmed.

What happens for safe URLs:

- Confirmed: no overlay shown.
- Confirmed: popup does not automatically update with safe result.

What happens for malicious URLs:

- Confirmed: page already loaded, then overlay appears.
- Confirmed: user can dismiss overlay with "Proceed Anyway".
- Confirmed: user can call `history.back()` via "Go Back to Safety".

Errors/timeouts/offline:

- Confirmed: background catches fetch errors and returns `{ isMalicious: false, accuracy: 0, error }`.
- Confirmed: content script only warns when `response.isMalicious`; therefore API failures degrade to allow/safe.
- Confirmed: no timeout handling, retry logic, offline state UI, or popup error UI. Not found.

Evidence:
- `app/page.tsx`
- `chrome_extension/background.js`
- `chrome_extension/content.js`

## 6. Authentication and Access Code Flow

Confirmed behavior:

- User-facing access-code UI exists in `LoginContent`.
- UI expects 6 single-character inputs.
- No submit handler exists on login button.
- No API call validates an access code.
- No token exchange exists.
- No auth storage key exists.
- No logout/disconnect flow exists.

Inferred:

- Access code flow was planned but never implemented. UI text says `กรอก Access code จากเว็บไซต์:` and button `เข้าใช้งาน`, but no business logic follows.

Storage and expiration:

- Not found for access code or auth token.

Security review:

- Confirmed: `apiKey` is stored plaintext in `chrome.storage.local`.
- Confirmed: `apiKey` is sent in `x-api-key` header.
- Confirmed: background logs API result objects to console.
- Confirmed: no credentials appear in query strings.
- Confirmed: access code itself is not currently persisted because flow is not implemented.

Unresolved questions:

- Is Access Code supposed to map to API key?
- Is there a separate auth endpoint?
- Should auth be per browser profile, per device, or per user session?

Evidence:
- `app/page.tsx` `LoginContent`
- `chrome_extension/background.js` `getConfig`
- `chrome_extension/background.js` `onInstalled`

## 7. URL Evaluation Flow

Trigger conditions:

- Confirmed: initial page load
- Confirmed: `popstate`
- Confirmed: `hashchange`
- Confirmed: `history.pushState`
- Confirmed: `history.replaceState`
- Confirmed: DOM mutations if URL changed

Not checked:

- Direct link click before navigation. Not found.
- Form submission before navigation. Not found.
- Network redirects before navigation. Not found.
- New-tab creation from browser events. Not found.
- Current tab from popup. Not found.

Timing:

- Confirmed: checks happen after navigation has already happened, not before.

Bypass/exclusions:

- Confirmed: no explicit exclusion for `chrome://`, `about:`, extension pages, localhost, file URLs, or development URLs.
- Confirmed: manifest matches `<all_urls>`.
- Confirmed: user can bypass malicious warning by clicking "Proceed Anyway".

Duplicate prevention/caching:

- Confirmed: no request cache.
- Confirmed: same URL is skipped only when `newUrl === currentUrl`.
- Confirmed: overlay duplicate guard not implemented; repeated malicious responses could append multiple overlays.

Decision model fields:

- Confirmed: background extracts `is_malicious`, `accurate`, `suggested`.
- Confirmed: popup only shows `isSafe`/`accuracy`/`url`, but it is not wired to actual background result.
- Confirmed: overlay shows only accuracy percent, not `suggested`.

Browser API permissions needed:

- `storage`: config and history
- `host_permissions: <all_urls>`: content script injection / page coverage
- `tabs`, `activeTab`: declared, but no confirmed usage in current code

Evidence:
- `chrome_extension/manifest.json`
- `chrome_extension/content.js`
- `chrome_extension/background.js`

## 8. Browser Permissions

| Permission | Used By | Reason | Risk or Concern |
| ---------- | ------- | ------ | --------------- |
| `storage` | background | stores API config and scan history | plaintext API key storage |
| `host_permissions: <all_urls>` | content scripts | inject and scan all URLs | broad attack surface, unnecessary for some schemes |
| `tabs` | manifest only | no current confirmed usage | likely over-permission |
| `activeTab` | manifest only | no current confirmed usage | likely over-permission |

Evidence:
- `chrome_extension/manifest.json`
- `firefox_addons/manifest.json`
- `chrome_extension/background.js`
- `chrome_extension/content.js`

## 9. API Integration

| Endpoint or Client Method | Called From | Purpose | Request | Response | Error Handling |
| ------------------------- | ----------- | ------- | ------- | -------- | -------------- |
| `fetch(config.apiEndpoint || API_ENDPOINT)` | `chrome_extension/background.js` `checkUrlWithAPI` | URL reputation prediction | `POST`, JSON body `{ url }`, header `x-api-key` | expects `data.result.is_malicious`, `data.result.accurate`, `data.result.suggested` | non-OK throws; catch returns `{ isMalicious: false, accuracy: 0, error }` |
| `chrome.storage.local.get(["apiEndpoint","apiKey"])` | `chrome_extension/background.js` `getConfig` | read API config | storage read | `{ apiEndpoint, apiKey }` | no explicit error path |
| `chrome.storage.local.get/set(["scanHistory"])` | `chrome_extension/background.js` `saveToHistory` | store recent scans | storage R/W | array trimmed to 100 | no explicit error path |

Default endpoint:

- Confirmed: `http://server:8000/api/v1/predict/predict`

Not found:

- Secondary providers
- Detection-mode selector
- User-specific URL flags overriding model result
- Request timeout or abort control

Evidence:
- `chrome_extension/background.js`

## 10. Browser Storage and State

| Key or Store | Storage Type | Written By | Read By | Purpose | Sensitive |
| ------------ | ------------ | ---------- | ------- | ------- | --------- |
| `apiEndpoint` | `chrome.storage.local` | `onInstalled` | `getConfig` | API base/predict endpoint | medium |
| `apiKey` | `chrome.storage.local` | `onInstalled` or manual external write | `getConfig` | SEMD API auth header | high |
| `scanHistory` | `chrome.storage.local` | `saveToHistory` | background only in current code | recent URL scan results | medium |
| `lastPrediction` | `window.localStorage` | Not found | popup `useEffect` | intended popup state handoff | medium |

State notes:

- Confirmed: popup uses React local state only.
- Confirmed: popup never synchronizes with `chrome.storage.local`.
- Confirmed: no centralized message type definitions or shared types.

Evidence:
- `chrome_extension/background.js`
- `app/page.tsx`

## 11. Current UI Inventory

| Screen or State | Entry File | Main Components | Data Source | Current Issues |
| --------------- | ---------- | --------------- | ----------- | -------------- |
| Popup safe state | `app/page.tsx` | `Pages`, `PredictionContent`, `PopupBase`, `CheckShieldIcon` | hard-coded React state | default accuracy `-99`, no live data, no loading/error state |
| Popup danger state | `app/page.tsx` | `PredictionContent`, `DangerStopIcon` | only reachable by code edit/dev toggles in commented block | not connected to extension results |
| Popup login/access code state | `app/page.tsx` | `LoginContent`, `PopupBase` | local 6-field state only | no submit handler, no validation, no persistence |
| Settings action | `app/page.tsx` | settings icon/button | console log only | no screen/route/modal |
| Warning overlay | `chrome_extension/content.js` | injected DOM string | background response | hard-coded styles, no theme reuse, post-navigation only |
| Confirmation dialog concept | `app/page.tsx` commented `Swal.fire` block | SweetAlert2 | dead/commented demo code | not reachable in production |
| Loading state | Not found | - | - | missing |
| Empty state | Not found | - | - | missing |
| Error state | Not found | - | - | missing |
| Offline state | Not found | - | - | missing |
| Settings screen | Not found | - | - | missing |
| Account/user info | Not found | - | - | missing |
| Report URL action | Not found | - | - | missing |

Responsive behavior:

- Confirmed: popup hard-codes `width: 320px`.
- Confirmed: login inputs use `clamp()` width, but overall layout is popup-specific.

Accessibility issues:

- Buttons have no accessible labels for icon-only controls.
- Inputs rely on focus color only; no labels, `aria-label`, or form grouping.
- Warning overlay inserted as raw HTML with no focus trapping.

Evidence:
- `app/page.tsx`
- `chrome_extension/content.js`
- `chrome_extension/index.html`

## 12. Theme and Design Tokens

| Token | Value | Defined In | Used In | Preserve |
| ----- | ----- | ---------- | ------- | -------- |
| `colors.primary` | `#FFCE69` | `tailwind.config.js` | Not found in source usage | yes |
| `colors.secondary` | `#799EFF` | `tailwind.config.js` | Not found in source usage | yes |
| `--foreground-rgb` | `0, 0, 0` / dark `255, 255, 255` | `app/globals.css` | body text color | yes |
| `--background-start-rgb` | `214, 219, 220` / dark `0, 0, 0` | `app/globals.css` | body background | optional |
| `--background-end-rgb` | `255, 255, 255` / dark `0, 0, 0` | `app/globals.css` | body background | optional |
| popup default gradient | `linear-gradient(180deg, #FFF9E6 0%, #FFFFFF 100%)` | `app/page.tsx` | login/default popup | yes, if preserving current look |
| popup default header | `#F5D76E` | `app/page.tsx` | login header/button/focus | yes |
| popup safe gradient | `linear-gradient(180deg, #E8F5E9 0%, #FFFFFF 100%)` | `app/page.tsx` | safe popup | yes |
| popup safe header | `#66BB6A` | `app/page.tsx` | safe popup | yes |
| popup danger gradient | `linear-gradient(180deg, #FFEBEE 0%, #FFCDD2 100%)` | `app/page.tsx` | danger popup | yes |
| popup danger header | `#FF6B6B` | `app/page.tsx` | danger popup | yes |
| safe status | `#4CAF50` | `app/page.tsx`, `chrome_extension/content.js` | status text/icon/fallback button | yes |
| danger status | `#F44336` / overlay `#e74c3c` | `app/page.tsx`, `chrome_extension/content.js` | danger states | yes |
| radius popup | `16px` | `app/page.tsx`, `chrome_extension/content.js` | popup and overlay card | yes |
| radius controls | `8px` / `12px` | `app/page.tsx`, `chrome_extension/content.js` | inputs/buttons | yes |
| shadow popup | `0 8px 32px rgba(0,0,0,0.15)` | `app/page.tsx` | popup card | yes |
| font stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | `app/page.tsx`, `chrome_extension/content.js` | popup + overlay | yes |

Theme assessment:

- Confirmed: Tailwind theme exists but is not driving current UI.
- Confirmed: most color, spacing, radius, and shadow values are hard-coded inline in `app/page.tsx`.
- Confirmed: content-script overlay fully bypasses Tailwind and CSS variables.
- Confirmed: no component variants, spacing scale, typography scale, shadow tokens, motion tokens, or semantic token map beyond minimal values above.

Dark mode:

- Confirmed: `app/globals.css` defines dark-mode CSS variables.
- Confirmed: popup components ignore these variables and use inline light palettes.

Evidence:
- `tailwind.config.js`
- `app/globals.css`
- `app/page.tsx`
- `chrome_extension/content.js`

## 13. Shared Components and Utilities

Reusable pieces currently available:

- `PopupBase`: best candidate for future popup shell extraction
- Inline icon components: `CloseIcon`, `SettingsIcon`, `CheckShieldIcon`, `DangerStopIcon`
- Background helpers: `getConfig`, `saveToHistory`, `checkUrlWithAPI`
- Content-script `Blocker` class: current URL-monitoring implementation

Constraints:

- Confirmed: none of these are in shared modules; all are embedded in single large files.
- Confirmed: no shared TypeScript types between popup and background.
- Confirmed: no reusable utility layer for storage, messaging, status mapping, or theme tokens.

Reuse guidance for future redesign:

- Preserve `PopupBase` behavior concept, not current file shape.
- Preserve icon intent and status mapping.
- Extract background/storage/message helpers into shared typed modules.

Evidence:
- `app/page.tsx`
- `chrome_extension/background.js`
- `chrome_extension/content.js`

## 14. Animation Readiness

Existing animation tools:

- Not found: Framer Motion or similar.
- Confirmed: only simple CSS transition on login input border color.
- Confirmed: SweetAlert2 available, but current alert usage is commented out.

Components that could support animation safely:

- Popup card entrance/exit
- Status icon swaps
- Loading skeleton/spinner once implemented
- Warning overlay fade/scale

Performance limitations inside extension popup:

- Popup is very small and short-lived; keep animation lightweight and deterministic.
- Content-script overlay runs on arbitrary pages; avoid heavy observers plus animations that may block interaction.

Reduced motion:

- Not found: `prefers-reduced-motion` handling.

Evidence:
- `app/page.tsx`
- `chrome_extension/content.js`

## 15. Accessibility Review

Confirmed issues:

- Icon-only close/settings buttons lack text labels: `app/page.tsx`
- Access-code inputs have no labels, no `inputMode`, no `aria-label`, no form semantics: `app/page.tsx`
- Warning overlay does not move focus, trap focus, or expose dialog semantics: `chrome_extension/content.js`
- Proceed/go-back buttons in overlay are keyboard reachable only if DOM order happens to allow it; no initial focus set
- Color-only status communication in popup
- No reduced-motion handling
- Mixed Thai and English UI text without locale strategy

Contrast concerns:

- Requires clarification by actual visual testing. Hard-coded pale yellow on white likely weak in some areas.

Evidence:
- `app/page.tsx`
- `chrome_extension/content.js`

## 16. Code Quality Findings

| Priority | Finding | Evidence | Impact | Recommended Direction |
| -------- | ------- | -------- | ------ | --------------------- |
| P0 | API/network failure returns `isMalicious: false`, so unavailable backend silently allows navigation | `chrome_extension/background.js` lines 51-58 | false-safe security behavior | return explicit indeterminate/error state and let UI/warning handle it |
| P1 | Access Code/auth flow is UI-only; no validation, persistence, or API integration exists | `app/page.tsx` `LoginContent` | product-critical flow missing | define auth contract before refactor; wire popup to real storage/API |
| P1 | Popup not connected to extension runtime; default safe state shows `-99%` and empty URL | `app/page.tsx` lines 265-277, 297-305 | misleading UI, no live functionality | introduce typed popup-background messaging/state hydration |
| P1 | Build script skips `_next` export assets while generated popup HTML references `/_next/...` scripts | `scripts/build-extension.js` lines 70-72, `chrome_extension/index.html` script tags | rebuilt popup likely loses JS/hydration | fix packaging to include required assets and use extension-safe paths |
| P1 | URL scanning happens after navigation, so malicious page can load before warning | `chrome_extension/content.js` lines 13-17, 71-76, 80-145 | security/UX gap | clarify whether true pre-navigation blocking is required and redesign flow accordingly |
| P1 | Firefox manifest declares `manifest_version: 3` but uses `background.scripts` instead of service worker | `firefox_addons/manifest.json` lines 30-34 | potential Firefox load/runtime failure | align manifest with actual Firefox MV3 requirements |
| P2 | API key stored plaintext in `chrome.storage.local` | `chrome_extension/background.js` lines 62-69, 88-91 | credential exposure to local profile/extension debugging | minimize storage lifetime and clarify trust model |
| P2 | `tabs` and `activeTab` permissions are declared but not used in current code | `chrome_extension/manifest.json` lines 22-29 | unnecessary permission scope | trim permissions after verifying future needs |
| P2 | Warning overlay can be duplicated; no guard for existing `#semd-warning-overlay` | `chrome_extension/content.js` lines 80-145 | stacked overlays / event duplication | add singleton guard and state tracking |
| P2 | URL monitoring uses many triggers but no debounce/cache | `chrome_extension/content.js` lines 40-68 | duplicate API calls, noisy history | centralize URL dedupe/cache |
| P2 | Popup and overlay styles bypass theme system with many hard-coded values | `app/page.tsx`, `chrome_extension/content.js`, `tailwind.config.js` | redesign harder, inconsistent theme use | extract semantic design tokens and reuse them |
| P2 | Source duplication across `scripts/additional_scripts`, `chrome_extension`, and `firefox_addons` | matching script contents | high drift risk | keep one source of truth for extension scripts |
| P2 | Build script writes Firefox packages to parent `../export/...`, not repo `export/` | `scripts/build-extension.js` lines 261-262 | artifacts land outside expected folder | normalize output paths |
| P3 | `dev:extension` references missing script `build:extension` | `package.json` line 15 | broken DX command | remove or correct script |
| P3 | `clean` script references `firefox_extension/*`, but folder is `firefox_addons/` | `package.json` line 14 | incomplete cleanup | correct target path |
| P3 | TypeScript strict mode disabled | `tsconfig.json` line 10 | weaker safety during refactor | enable stricter typing incrementally |
| P3 | Dead/commented demo controls and SweetAlert2 example remain in popup source | `app/page.tsx` lines 308-379 | noise, unclear intent | remove after preserving behavior requirements |

Evidence:
- `app/page.tsx`
- `chrome_extension/background.js`
- `chrome_extension/content.js`
- `scripts/build-extension.js`
- `chrome_extension/index.html`
- `firefox_addons/manifest.json`

## 17. Build, Test, and Browser-Loading Instructions

Documented commands:

- Install deps: `npm install` or `bun install`
- Dev app: `npm run dev`
- Build Next app: `npm run build`
- Build Chrome extension: `npm run build:chrome`
- Build Firefox add-on: `npm run build:firefox`
- Build all: `npm run build:all`
- Lint: `npm run lint`
- Start production app: `npm run start`

Documented browser loading:

- Chrome: load unpacked `chrome_extension/`
- Firefox: temporary add-on from `manifest.json` or packaged `.xpi`

Verified in this environment:

- `npm run build` failed: `npm: command not found`
- `npm run lint` failed: `npm: command not found`
- `bun run build` failed: `bun: command not found`
- `bun run lint` failed: `bun: command not found`
- Browser binaries for screenshot testing not found: `google-chrome`, `chromium`, `firefox`

Testing:

- Not found: test files, test scripts, test framework, typecheck script

Environment needs:

- Node/npm or Bun required but unavailable in current environment
- Local API expected at `http://server:8000/api/v1/predict/predict`
- Optional `apiKey` expected in extension local storage

Evidence:
- `package.json`
- `README.md`
- `chrome_extension/background.js`

## 18. Current UI Screenshots

Not captured in this environment.

Reason:

- No Chrome/Chromium/Firefox binary available
- No Node/Bun runtime available to start local preview tooling
- No image conversion tooling available

Closest available evidence:

- Checked-in built popup HTML in `chrome_extension/index.html` and `firefox_addons/index.html`
- Static current state visible there is safe popup with status text `ปลอดภัย -99%`

Capture note:

- `docs/current-ui/SCREENSHOT_CAPTURE_NOTES.md`

Evidence:
- `chrome_extension/index.html`
- `firefox_addons/index.html`

## 19. Refactoring Boundaries

### Must Preserve

- SEMD URL prediction API contract shape currently expected by background script
- Runtime model: content script asks background to evaluate URL
- Browser-target packaging requirement for Chrome and Firefox
- Existing status color intent: yellow/default, green/safe, red/danger
- Existing manifest permission need for `storage` and broad page injection unless product narrows scope

### Safe to Refactor

- Component boundaries inside popup
- State organization and storage adapters
- Messaging abstraction and shared types
- Styling composition and tokenization
- Animation layer
- Error/loading/empty-state presentation
- Build pipeline internals
- Generated artifacts strategy

### Requires Product Clarification

- What Access Code actually authenticates against
- Whether malicious detection must block before navigation
- How indeterminate/error scans should be presented
- Whether user may permanently bypass flagged URLs
- Whether popup should show current tab status, history, settings, or account info

Evidence:
- `app/page.tsx`
- `chrome_extension/background.js`
- `chrome_extension/content.js`
- `scripts/build-extension.js`

## 20. Recommended Implementation Sequence

1. Separate source-of-truth modules for popup UI, storage, messaging, API client, and manifests/build inputs.
2. Stabilize build pipeline so popup assets load correctly in extension packages.
3. Define product-approved auth/access-code contract.
4. Introduce typed popup/background integration and real current-tab status flow.
5. Normalize semantic theme tokens from current hard-coded palette before visual redesign.
6. Add missing loading, error, offline, empty, and malicious-confirmation states.
7. Refactor warning flow and clarify pre/post-navigation behavior.
8. Reduce permissions and add tests once behavior is stable.

Evidence:
- `package.json`
- `scripts/build-extension.js`
- `app/page.tsx`

## 21. Open Questions

- What backend endpoint validates Access Codes, if any?
- Should Access Code become stored API key, session token, or separate credential?
- What is intended meaning of `suggested` field from API, and should it drive UI decisioning?
- Should malicious detection support allowlist/denylist overrides?
- Does Firefox support target need full MV3 parity or fallback manifest behavior?
- Should scan history appear in popup/settings?
- How should popup learn current tab result: live message, storage sync, or tab query plus cache?

Evidence:
- `app/page.tsx`
- `chrome_extension/background.js`
- `firefox_addons/manifest.json`
