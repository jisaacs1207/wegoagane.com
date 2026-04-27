# wegoagane API (Workers + Hono + Drizzle)

Backend for **`wegoagane.com/api/*`** (and same routes without `/api` prefix on the Worker): **recommend**, **memorial**, **share**, **feedback**, **analytics**, **growth engine**, **journey** (vector questionnaire + commit), **async build plans** (including a **second AI pass** that fills `talents.levelByLevel` + `talents.buildIntentSummary` when the primary plan validates), and **public build rails** (recent/top/rate/OG). Foundation pieces:

- Drizzle typed schema + SQL migrations (D1)
- Deterministic ranker + validator + template-first destiny/memorial output
- Optional **OpenRouter** enrichment (env-gated, validator-first fallback)
- Persistence for sessions, destinies, memorials, build plans, commits, recommendation logs, growth tables (see schema)

Live route index (also returned by **`GET /`** on the Worker): see [`src/index.ts`](src/index.ts) `endpoints` array. Web session keys and error copy: [`docs/route-qa-matrix.md`](../docs/route-qa-matrix.md).

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
- `AI_MODEL_DESTINY` (default **`openrouter/auto`** — [Auto Router](https://openrouter.ai/docs/features/model-routing); or a pinned `provider/model`)
- `AI_MODEL_MEMORIAL` (same; defaults to `openrouter/auto` in `wrangler.toml`)
- `AI_APP_TITLE` (sent as `X-OpenRouter-Title`)
- `AI_PROVIDER_SORT` (`latency`, `price`, or `throughput` — **ignored when** `model` **is** `openrouter/auto` so routing is not constrained)

Set `AI_GATEWAY_TOKEN` as a Wrangler secret (not in `wrangler.toml`):

```bash
npx wrangler secret put AI_GATEWAY_TOKEN --env production
```

Runtime request headers now include OpenRouter attribution defaults:

- `HTTP-Referer` from `SITE_ORIGIN`
- `X-OpenRouter-Title` from `AI_APP_TITLE`

When AI is disabled/unavailable/invalid, both pipelines return validated template output.

API responses include **`aiMeta.resolvedModelId`** when OpenRouter returns the concrete model used (Auto Router sets top-level `model` in the completion response per [OpenRouter docs](https://openrouter.ai/docs/features/model-routing)).

## Analytics configuration (PostHog US)

Set these Worker env values for M12 analytics:

- `POSTHOG_ENABLED` (`"true"` to emit analytics; default `"false"`)
- `POSTHOG_HOST` (`https://us.i.posthog.com`)
- Wrangler secret: `POSTHOG_PROJECT_API_KEY` (`phc_...`)
- M13 memory rollout vars:
  - `MEMORY_BIAS_ENABLED`
  - `MEMORY_BROWSER_WEIGHT`
  - `MEMORY_SERVER_WEIGHT`
  - `MEMORY_MAX_BIAS`
  - `MEMORY_DEGRADE_MODE`
  - `MEMORY_DEGRADE_SCALE`
  - `MEMORY_LOOKBACK_LIMIT`

Set secret:

```bash
npx wrangler secret put POSTHOG_PROJECT_API_KEY --env production
```

Operational endpoints:

- `GET /api/v1/analytics/config`
- `GET /api/v1/analytics/memory-health`
- `GET /api/v1/share/summary/health`

### Debugging production (quick)

Always inspect **`aiMeta`** (not only `output`): gate off → template path; `providerError` → upstream/model; `ai_invalid_json` after a provider change → ensure latest Worker includes **`extractJsonPayload`** (fenced JSON / prose prefix).

```bash
curl -sS -X POST "https://wegoagane.com/api/v1/memorial" \
  -H "content-type: application/json" \
  -d '{"zone":"Durotar","cause":"Overpull","mood":"dry","nextSignal":"smaller pulls","faction":"horde","characterName":"DocCheck","level":10}' \
  | jq '{sourceType: .output.sourceType, fallbackUsed: .output.fallbackUsed, aiMeta}'
```

## Model bakeoff (optimize destiny vs memorial)

Run a quick benchmark against your gateway/model candidates using the same adapter + validator path used in runtime:

```bash
AI_GATEWAY_URL="https://openrouter.ai/api/v1/chat/completions" \
AI_GATEWAY_TOKEN="..." \
DESTINY_MODELS="openrouter/auto,openai/gpt-4.1-mini" \
MEMORIAL_MODELS="openrouter/auto,anthropic/claude-sonnet-4.5" \
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

## Testing (CI)

`npm test` runs Node’s test runner on `src/**/*.test.ts` — route and handler coverage for recommend, journey commit, feedback, memorial, share, build bodies, growth auth, and related `invalid_json` / validation paths.

Web flows, `SessionKeys`, and API `error` → UI copy: [../docs/route-qa-matrix.md](../docs/route-qa-matrix.md).

## Smoke + persistence checks

```bash
npm run smoke:production
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS sessions FROM sessions;"
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS destinies FROM destinies;"
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS memorials FROM memorials;"
npx wrangler d1 execute wegoagane --remote --env production --command "SELECT COUNT(*) AS logs FROM recommendation_logs;"
```
