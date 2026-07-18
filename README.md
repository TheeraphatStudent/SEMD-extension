# SEMD Extension Development Guide

SEMD is a browser extension that checks suspicious URLs and warns users when a destination appears malicious. The project now builds one shared runtime for Chrome and Firefox and packages browser-specific outputs under `dist/`.

## Project Structure

```text
app/                        Next.js popup entry
src/extension/              Shared background/content runtime and manifest templates
src/popup/                  Popup components, hooks, and browser bridge
docs/                       Refactor, architecture, release, and test documentation
scripts/build-extension.ts  Bun build/package pipeline
dist/chrome/                Generated Chrome extension output
dist/firefox/               Generated Firefox extension output
export/                     Generated packaged artifacts
```

## Bun Commands

```bash
bun install
bun run lint
bun run typecheck
bun test
bun run build:chrome
bun run build:firefox
bun run package:chrome
bun run package:firefox
```

## Local Loading

### Chrome

1. Run `bun run build:chrome`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Load unpacked from `dist/chrome`

### Firefox

1. Run `bun run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Load the temporary add-on from `dist/firefox/manifest.json`

## Configuration

Runtime API configuration is injected during the Bun build. Update `extension.conf.yaml` or provide environment variables before packaging:

- `SEMD_API_BASE_URL`
- `SEMD_ACCESS_CODE_VALIDATION_PATH`

The production Access Code validation contract is still an integration boundary and must be confirmed before release.

## Documentation

- [Refactor plan](docs/SEMD_EXTENSION_REFACTOR_PLAN.md)
- [Architecture](docs/SEMD_EXTENSION_ARCHITECTURE.md)
- [Test report](docs/SEMD_EXTENSION_TEST_REPORT.md)
- [Release notes](docs/SEMD_EXTENSION_RELEASE_NOTES.md)
