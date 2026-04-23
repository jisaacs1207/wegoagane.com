# wegoagane API (Workers + Hono + Drizzle)

This package is the M3-M7 backend foundation:

- Drizzle typed schema + SQL migrations (D1)
- Deterministic ranker + validator + template-only destiny output
- Hono route for recommendation generation
- Persistence for sessions, destinies, and recommendation logs

## Local setup

```bash
cd packages/api
npm install
npm run db:generate
npm run db:migrate:local
npm run dev
```

Health check: `GET http://127.0.0.1:8787/health`

Recommend endpoint:

```bash
curl -X POST "http://127.0.0.1:8787/v1/recommend" \
  -H "content-type: application/json" \
  -d '{
    "entryPath":"draft_a_run",
    "signals":{"intent":"Safest path to 60","nextSignal":"Safer","freeform":"no pet class"}
  }'
```

## Migration workflow

```bash
npm run db:generate
npm run db:migrate:local
# later
npm run db:migrate:remote
```

## Production tie-in (real site)

1. Export `CLOUDFLARE_API_TOKEN` (token with Workers/D1 edit permissions).
2. Apply prod migrations + deploy:

```bash
npm run db:migrate:production
npm run deploy:production
```

Worker routes are configured in `wrangler.toml` for:

- `wegoagane.com/api/*`
- `www.wegoagane.com/api/*`

## Smoke + persistence checks

```bash
npm run smoke:production
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS sessions FROM sessions;"
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS destinies FROM destinies;"
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS logs FROM recommendation_logs;"
```
