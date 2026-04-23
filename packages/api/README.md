# wegoagane API (Workers + Hono + Drizzle)

This package is the M3-M9 backend foundation:

- Drizzle typed schema + SQL migrations (D1)
- Deterministic ranker + validator + template-only destiny output
- Optional AI Gateway enrichment (env-gated, validator-first fallback)
- Hono routes for recommendation + memorial generation
- Persistence for sessions, destinies, memorials, and recommendation logs

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

Memorial endpoint:

```bash
curl -X POST "http://127.0.0.1:8787/v1/memorial" \
  -H "content-type: application/json" \
  -d '{
    "zone":"Durotar",
    "cause":"Overpull",
    "mood":"frustrated",
    "nextSignal":"pull smaller",
    "faction":"horde",
    "characterName":"TestRunner",
    "level":12
  }'
```

## AI configuration (OpenRouter-first)

Set these in Worker env vars when enabling AI enrichment:

- `AI_ENABLED` (`"true"` to enable, default `"false"`)
- `AI_GATEWAY_URL` (default: `https://openrouter.ai/api/v1/chat/completions`)
- `AI_MODEL_DESTINY` (OpenRouter model id, e.g. `openai/gpt-4.1-mini`)
- `AI_MODEL_MEMORIAL` (OpenRouter model id, e.g. `anthropic/claude-3.5-sonnet`)
- `AI_APP_TITLE` (sent as `X-OpenRouter-Title`)
- `AI_PROVIDER_SORT` (`latency`, `price`, or `throughput`)

Set `AI_GATEWAY_TOKEN` as a Wrangler secret (not in `wrangler.toml`):

```bash
npx wrangler secret put AI_GATEWAY_TOKEN --env production
```

Runtime request headers now include OpenRouter attribution defaults:

- `HTTP-Referer` from `SITE_ORIGIN`
- `X-OpenRouter-Title` from `AI_APP_TITLE`

When AI is disabled/unavailable/invalid, both pipelines return validated template output.

## Model bakeoff (optimize destiny vs memorial)

Run a quick benchmark against your gateway/model candidates using the same adapter + validator path used in runtime:

```bash
AI_GATEWAY_URL="https://openrouter.ai/api/v1/chat/completions" \
AI_GATEWAY_TOKEN="..." \
DESTINY_MODELS="openai/gpt-4.1-mini,anthropic/claude-3.5-haiku" \
MEMORIAL_MODELS="anthropic/claude-3.5-sonnet,openai/gpt-4.1-mini" \
BAKEOFF_RUNS=6 \
npm run eval:models
```

Output includes:
- `aiSuccessRate` (how often validated AI output was returned)
- `fallbackRate` (template fallback frequency)
- `avgLatencyMs`
- token usage estimates
- weighted `score` and top recommendation per lane

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
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS memorials FROM memorials;"
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS logs FROM recommendation_logs;"
```
