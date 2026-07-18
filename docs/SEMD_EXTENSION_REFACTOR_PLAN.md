# SEMD Extension Refactor Plan

## Scope

Refactor the published SEMD browser extension so Chrome and Firefox share one runtime implementation, the popup reflects real extension state, failure states never look safe, and the build pipeline produces deterministic browser-specific outputs with Bun.

## Verified Current Baseline

- Runtime logic is duplicated across `chrome_extension/` and `firefox_addons/`.
- The popup in `app/page.tsx` is static and defaults to a fake safe result.
- API failures currently return `isMalicious: false`, which is a false-safe defect.
- The checked-in build script shells out to `npm`, copies partial Next export output, and builds directly into source-like browser folders.
- Theme usage is limited to two Tailwind colors; the popup and warning overlay are mostly hard-coded inline styles.
- Baseline screenshot capture is blocked in this environment because Bun and browsers are not installed locally. Existing evidence is recorded in `docs/current-ui/SCREENSHOT_CAPTURE_NOTES.md`.

## Target Architecture

```text
src/
  extension/
    background/
      index.ts
    content/
      index.ts
    manifests/
      chrome.json
      firefox.json
    shared/
      api.ts
      browser.ts
      config.ts
      constants.ts
      messaging.ts
      state.ts
      storage.ts
      types.ts
      url.ts
      warning-ui.ts
  popup/
    components/
      access-code-card.tsx
      popup-shell.tsx
      settings-sheet.tsx
      status-card.tsx
    hooks/
      use-extension-popup.ts
    lib/
      browser.ts
```

## Shared Browser Abstraction

- Use one `BrowserLike` wrapper that resolves `browser` when available and falls back to `chrome`.
- Wrap callback-based APIs in promises for storage, messaging, tabs, and runtime listeners.
- Keep browser-specific differences limited to manifest templates and packaging.

## Background Runtime

- Background owns privileged concerns:
  - storage
  - API calls
  - access-code validation boundary
  - tab evaluation state
  - popup subscriptions
- Background maintains a normalized tab-state map and broadcasts updates to popup/content consumers.
- Content and popup never call the SEMD API directly.

## Content Script

- Content script handles:
  - initial page URL reporting
  - SPA URL change detection
  - same-tab pre-navigation checks for supported anchor clicks
  - warning overlay rendering
- Keep post-navigation checks as fallback for coverage the extension can support without new broad permissions.
- Exclude browser-internal schemes and extension-owned pages.

## Popup Architecture

- Popup requests a single background snapshot on open.
- Popup subscribes to runtime state updates instead of polling.
- Popup shows explicit state groups:
  - access code required
  - disabled
  - idle
  - checking
  - safe
  - malicious
  - unknown/offline/error
  - settings

## Storage Schema

Use a versioned storage document with migration support.

```ts
type ExtensionStorage = {
  schemaVersion: 2;
  settings: {
    enabled: boolean;
    checkMode: 'realtime' | 'ask';
    accessCode?: string;
    apiBaseUrl?: string;
    accessCodeValidationPath?: string;
  };
  lastEvaluation?: UrlEvaluation;
  tabStates: Record<string, TabEvaluationState>;
  scanHistory: UrlEvaluation[];
};
```

Migration rules:

- Convert older `apiEndpoint`, `apiKey`, and `scanHistory` keys into the new structure when possible.
- Do not mark any migrated state as safe unless it already represents a verified malicious/safe result from prior storage.
- Missing values fall back to enabled realtime scanning with no access code and no stored evaluation.

## Message Protocol

Use a discriminated protocol with validation helpers for:

- `GET_EXTENSION_STATE`
- `GET_ACTIVE_TAB`
- `EVALUATE_URL`
- `GET_SETTINGS`
- `UPDATE_SETTINGS`
- `VALIDATE_ACCESS_CODE`
- `CLEAR_ACCESS_CODE`
- `CONTINUE_TO_URL`
- `GO_BACK_FROM_WARNING`
- `DISMISS_WARNING`
- `STATE_UPDATED`

Trust boundaries:

- Validate message shape and payload before privileged work.
- Validate sender context for navigation and warning actions.
- Reject page-context or malformed messages with structured errors.

## API Client

- Centralize API access in `src/extension/shared/api.ts`.
- Build request URLs from configuration, not from hard-coded runtime literals.
- Support explicit timeout, offline detection, structured error mapping, and JSON shape validation.
- Treat malformed or missing response fields as `unknown` or `error`, never `safe`.
- Access Code validation remains an integration boundary until a confirmed production contract exists.

## URL Evaluation State Model

Use explicit statuses:

- `idle`
- `checking`
- `safe`
- `malicious`
- `unknown`
- `offline`
- `unauthorized`
- `error`

Popup and content UI derive copy and styling from these states rather than from fake percentages.

## Warning Experience

- Render the warning UI inside a Shadow DOM root to reduce host-page CSS collisions.
- No `innerHTML` for untrusted data.
- Prevent duplicate overlays.
- Support focus management and reduced motion.
- Make “Go back” primary and “Continue anyway” secondary.

## Manifest Strategy

- Maintain separate manifest templates for Chrome and Firefox.
- Preserve:
  - MV3
  - Firefox Gecko ID
  - existing host permissions
  - current action popup path
  - existing icon sizes
- Avoid new permissions unless implementation proves they are necessary.

## Build and Packaging Strategy

- Build Next export once.
- Build `background.ts` and `content.ts` into plain JS with Bun.
- Copy popup export assets and icons into:
  - `dist/chrome`
  - `dist/firefox`
- Validate that every manifest-referenced file exists.
- Package:
  - `export/semd-chrome.zip`
  - `export/semd-addon.xpi`
  - `export/semd-addon.zip`

## Theme Token Usage

- Keep `primary` and `secondary` as brand anchors.
- Introduce semantic CSS variables for:
  - `background`
  - `surface`
  - `surface-elevated`
  - `text-primary`
  - `text-secondary`
  - `brand`
  - `brand-soft`
  - `safe`
  - `safe-soft`
  - `danger`
  - `danger-soft`
  - `warning`
  - `warning-soft`
  - `border`
  - `focus-ring`

## Animation Strategy

- Use CSS transitions and keyframes only.
- Animate entry, status transitions, and checking states with opacity and transforms.
- Respect `prefers-reduced-motion: reduce`.
- No continuous idle motion outside small decorative accents.

## Testing Strategy

- Use `bun test` for unit and small integration tests.
- Cover:
  - URL normalization and exclusions
  - protocol validation
  - storage defaults and migration
  - API response mapping
  - status mapping
  - duplicate-check suppression
  - popup state shaping

## Migration and Release Risks

- Missing production API base URL contract blocks full release confidence.
- Missing confirmed Access Code validation endpoint blocks a fully working auth flow.
- Browser screenshot capture and packaged extension validation are blocked in this environment because Bun and browsers are unavailable.
- Address-bar and browser-level pre-navigation interception still require policy and permission decisions beyond the current permission set.
