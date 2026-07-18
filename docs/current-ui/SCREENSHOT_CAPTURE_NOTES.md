# Screenshot Capture Notes

No current UI screenshots were captured in this environment.

Blocking constraints:

- `node`, `npm`, and `bun` were not available, so local preview/build validation could not run.
- `google-chrome`, `chromium`, `chromium-browser`, and `firefox` were not available, so extension pages could not be rendered headlessly.
- No image conversion tools were available.

Closest verified UI evidence:

- `chrome_extension/index.html`
- `firefox_addons/index.html`

Visible current built popup state in those files:

- Safe popup
- Title: `SEMD`
- Status text: `ปลอดภัย -99%`
- Empty URL field

States present in source but not safely capturable here:

- Login/access code popup: `app/page.tsx`
- Dangerous popup variant: `app/page.tsx`
- Content-script warning overlay: `chrome_extension/content.js`
