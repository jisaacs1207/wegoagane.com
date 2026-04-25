# wegoagane.com

Hardcore reroll and remembrance — **web** (Vite + React) and **API** (Cloudflare Worker + Hono + D1).

## Where things live

| Path | What |
|------|------|
| [`apps/web`](apps/web) | SPA: flows, cards, share UI. `npm run dev` / `npm run build` / `npm run test` |
| [`packages/api`](packages/api) | Worker API + migrations. `npm run deploy:production` (from that directory) |
| [`docs/deploy-wegoagane-com.md`](docs/deploy-wegoagane-com.md) | Production deploy, secrets, smoke checks |
| [`docs/github-setup.md`](docs/github-setup.md) | CI and branch protection |
| [`docs/route-qa-matrix.md`](docs/route-qa-matrix.md) | Routes, session keys, and manual QA notes |

## Quick start (local)

```bash
cd apps/web && npm ci && npm run dev
```

API development uses Wrangler from `packages/api` (see that package’s README).

## CI

GitHub Actions runs handbook checks, **web** (lint, tests, build), and **api** (typecheck, tests, migrations). See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
