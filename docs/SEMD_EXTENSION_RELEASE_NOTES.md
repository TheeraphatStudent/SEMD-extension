# SEMD Extension Release Notes

## User-Visible Changes

- Replaced the mock popup with a runtime-connected popup.
- Added explicit Access Code connection UI with masked connected state.
- Added real states for checking, safe, malicious, unknown, offline, unauthorized, disabled, and error.
- Redesigned the popup with theme-based tokens, lighter motion, and clearer warning hierarchy.
- Replaced the raw page overlay with an isolated Shadow DOM warning dialog.

## Storage Migration

- Added versioned storage under `semd.extension.storage`.
- Migrates legacy `apiEndpoint`, `apiKey`, and `scanHistory` fields into the new structure.
- Preserves enabled-by-default behavior without implying a safe result for unverified pages.

## Manifest and Build Changes

- Added source manifest templates under `src/extension/manifests/`.
- Build outputs now target `dist/chrome` and `dist/firefox`.
- Packaging targets are `export/semd-chrome.zip`, `export/semd-addon.xpi`, and `export/semd-addon.zip`.
- Build commands are Bun-based.
- Fixed the previous Next export conflict by allowing `.next/` to remain the build directory and `out/` to remain the static export directory.
- Build script now reuses an existing popup export instead of rebuilding Next once per browser target.

## Security Fixes

- Removed the false-safe API failure behavior.
- Centralized API access in the background context.
- Added message-shape validation before privileged operations.
- Removed `innerHTML`-based warning rendering for dynamic URL content.
- Stopped treating errors, timeouts, and offline states as confirmed-safe results.

## Compatibility Notes

- Manifest version remains 3.
- Existing Firefox Gecko ID remains preserved.
- Existing `activeTab`, `tabs`, `storage`, and `<all_urls>` permissions remain unchanged.

## Store Review Considerations

- No new broad permissions were added in this refactor.
- Behavior is now clearer about verification failures and Access Code requirements.
- Release should remain blocked until packaged builds are tested locally on Chrome and Firefox with the real API configuration.
