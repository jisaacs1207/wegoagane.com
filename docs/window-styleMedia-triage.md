# `window.styleMedia` warning triage

This warning is not produced by app source in this repository (`rg "styleMedia"` returns no matches in `apps/` or `packages/`).

## Repro checklist

1. Open the app in a clean/incognito browser profile with all extensions disabled.
2. Re-test in a second browser engine (Chromium + Firefox/Safari).
3. Compare dev server vs production build to rule out local tooling injection.
4. If warning appears only with extensions/devtools enabled, classify as non-app-origin runtime noise.

## If warning persists in clean profile

1. Capture full stack trace in browser console.
2. Identify script URL/frame source:
   - first-party bundle (`/assets/*.js`) -> inspect dependency chain and upgrade/patch.
   - extension/injected script -> document as external.
3. If first-party, upgrade the referenced dependency and re-run smoke checks.
