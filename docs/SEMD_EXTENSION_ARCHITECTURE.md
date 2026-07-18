# SEMD Extension Architecture

## Runtime Overview

```text
Popup UI
  -> runtime message
Background
  -> storage
  -> API client
  -> tab state
  -> popup broadcast
Content script
  -> navigation detection
  -> pre-navigation checks where feasible
  -> post-navigation fallback
  -> warning overlay
```

## Message Flow

1. Popup opens and sends `GET_EXTENSION_STATE`.
2. Background reads versioned storage, queries the active tab, and returns a snapshot.
3. Content or popup sends `EVALUATE_URL`.
4. Background validates the request, updates the tab to `checking`, calls the API client, persists the result, and broadcasts `STATE_UPDATED`.
5. Content shows the warning overlay only for explicit malicious results.

## Storage Schema

Stored under `semd.extension.storage`:

```ts
type ExtensionStorage = {
  schemaVersion: 2;
  settings: {
    enabled: boolean;
    checkMode: "realtime" | "ask";
    accessCode?: string;
    apiBaseUrl?: string;
    accessCodeValidationPath?: string;
  };
  lastEvaluation?: UrlEvaluation;
  tabStates: Record<string, TabEvaluationState>;
  scanHistory: UrlEvaluationResult[];
};
```

Legacy `apiEndpoint`, `apiKey`, and `scanHistory` values are migrated into the new structure.

## API Flow

- Background builds the prediction URL from runtime configuration.
- The Access Code is sent only in the `x-api-key` header.
- Timeouts, HTTP errors, offline cases, and invalid responses map to `offline`, `unauthorized`, `unknown`, or `error`.
- No backend failure path maps to `safe`.

## Browser Abstraction

- `src/extension/shared/browser.ts` resolves `browser` first and falls back to `chrome`.
- Chrome and Firefox share the same bundled background/content logic.
- Browser-specific concerns remain in manifest templates and packaging output names.

## Warning Flow

- The content script evaluates the current page and selected navigations.
- Malicious results render a Shadow DOM warning dialog.
- “Go back” is primary. “Continue anyway” and dismiss are secondary.
- The overlay uses text content only and avoids host-page CSS collisions.

## Access Code Boundary

- The popup exposes a real Access Code entry flow.
- Validation is delegated to `validateAccessCodeWithApi`.
- If no validation endpoint is configured, the UI stays in an explicit integration-required state rather than faking success.

## Build Strategy

- `bun scripts/build-extension.ts chrome`
- `bun scripts/build-extension.ts firefox`
- The build runs `next build`, copies `out/index.html` and `out/_next`, bundles `background.ts` and `content.ts`, copies icons, writes the browser manifest, and validates all manifest-referenced files.
