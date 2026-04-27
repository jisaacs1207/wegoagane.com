# wegoagane.com

Hardcore reroll and remembrance — **web** (Vite + React) and **API** (Cloudflare Worker + Hono + D1).

## Where things live

| Path | What |
|------|------|
| [`apps/web`](apps/web) | SPA: flows, cards, share UI. `npm run dev` / `npm run build` / `npm run test` / `npm run test:e2e` |
| [`packages/api`](packages/api) | Worker API + migrations. `npm run deploy:production` (from that directory) |
| [`docs/deploy-wegoagane-com.md`](docs/deploy-wegoagane-com.md) | Production deploy, secrets, smoke checks |
| [`docs/github-setup.md`](docs/github-setup.md) | CI and branch protection |
| [`docs/route-qa-matrix.md`](docs/route-qa-matrix.md) | Routes, `SessionKeys`, API error → UI copy, validation commands |
| [`docs/handoff/STATUS.md`](docs/handoff/STATUS.md) | Milestone tracker (M0–M19+ contract) and what shipped / in flight |

## Quick start (local)

```bash
cd apps/web && npm ci && npm run dev
```

API development uses Wrangler from `packages/api` (see that package’s README).

## CI

GitHub Actions runs **Handbook layout**, **Web** (lint, Vitest, production build, Playwright Chromium install, smoke E2E), and **API** (typecheck, `npm test`, migration drift, local migrate apply, route check). See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Web client map (high signal)

| Area | Location |
|------|-----------|
| Session storage keys | [`apps/web/src/lib/sessionKeys.ts`](apps/web/src/lib/sessionKeys.ts) |
| API errors → copy | [`apps/web/src/lib/recommendClient.ts`](apps/web/src/lib/recommendClient.ts) (`flowApiErrorHint`, `destinyRecommendErrorHint`, `recommendErrorSuggestsSoftenFilters`) |
| Stored destiny for post-generate pages | [`apps/web/src/lib/flowDestinyState.ts`](apps/web/src/lib/flowDestinyState.ts) |
| Dev-only ignored failures | [`apps/web/src/lib/clientDebug.ts`](apps/web/src/lib/clientDebug.ts) (`debugClientIgnored`) |
