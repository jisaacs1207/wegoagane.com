# Deploy wegoagane.com (Cloudflare Pages)

This guide matches **Cloudflare’s published Pages documentation** as consulted on **April 22, 2026**. Canonical references:

- [Git integration (get started)](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image / v3 build system](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [Monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Serving Pages (SPA behavior)](https://developers.cloudflare.com/pages/configuration/serving-pages/)

The production app in this repo is a Vite + React SPA under [`apps/web`](../apps/web). The build writes static assets to **`apps/web/dist`**.

---

## What you are creating

A **Cloudflare Pages** project connected to **Git** (GitHub). Each push to the configured branches triggers a build; production traffic is served from the **production branch** (this repo uses **`main`**).

**Important (Git-connected projects):** Cloudflare states that if you deploy with **Git integration**, you **cannot later switch** that same project to [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/). If you need to stop auto-deploys on every push, use **Settings → Builds → Branch control** to turn off automatic production and/or preview deployments, then deploy with [Wrangler](https://developers.cloudflare.com/workers/wrangler/) as documented under [Disable automatic deployments](https://developers.cloudflare.com/pages/configuration/git-integration/#disable-automatic-deployments).

---

## One-time: create the Pages project

1. Open the Cloudflare dashboard and go to **Workers & Pages** (direct link pattern from Cloudflare docs: [`dash.cloudflare.com/?to=/:account/workers-and-pages`](https://dash.cloudflare.com/?to=/:account/workers-and-pages)—replace `:account` by selecting your account in the UI).
2. Select **Create application** → **Pages** → **Connect to Git**.
3. Sign in with **GitHub** and authorize the [**Cloudflare Workers & Pages** GitHub App](https://github.com/apps/cloudflare-workers-and-pages). Cloudflare recommends limiting the installation to **only the repositories** you intend to build ([GitHub integration — Manage access](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#manage-access)).
4. Choose repository **`jisaacs1207/wegoagane.com`** (or your fork). Private and public repos are supported.
5. Continue to **Set up builds and deployments** (wording may read **Install & Authorize** then **Begin setup** in the wizard).

### Production branch

Set **Production branch** to **`main`** (or your default). You must have pushed at least one branch to the repo for it to appear in the dropdown ([Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/#configure-your-deployment)).

### Configure the build (monorepo subdirectory)

This repository is a **monorepo-style** layout: the site lives in **`apps/web`**, not the repo root. Cloudflare’s entire build pipeline (including dependency install) starts from the **root directory** you configure ([Build configuration — root directory](https://developers.cloudflare.com/pages/configuration/build-configuration/#build-commands-and-directories)).

| Setting | Value | Notes |
|--------|--------|--------|
| **Framework preset** | **React (Vite)** (optional) | Official preset: build command `npm run build`, output **`dist`** ([framework presets table](https://developers.cloudflare.com/pages/configuration/build-configuration/#framework-presets)). You may instead leave preset blank and set commands manually. |
| **Root directory (advanced)** | `apps/web` | Required so installs and builds run inside the Vite app. |
| **Build command** | `npm ci && npm run build` | `npm ci` is stricter and reproducible than `npm install` for CI-like Pages builds; Cloudflare runs whatever command you supply and treats non-zero exit as failure ([build commands](https://developers.cloudflare.com/pages/configuration/build-configuration/#build-commands-and-directories)). |
| **Build output directory** | `dist` | Relative to the **root directory** (`apps/web/dist` on disk). |

**Environment variables:** none are required for the current milestone. You can add keys under **Settings → Environment variables** anytime ([Build configuration — environment variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)).

### Build system (v3) and Node.js

Pages **build image v3** is the current generation; it updates default runtimes (Cloudflare documents a migration path from v2 and deprecation timelines for older images on the [build image](https://developers.cloudflare.com/pages/configuration/build-image/) page). For **Node.js**, v3 documents a default of **22.16.0** (as of the doc revision we used), with overrides via **`NODE_VERSION`**, **`.nvmrc`**, or **`.node-version`**.

This repo’s GitHub Actions **Web** job uses Node **22**; aligning Pages (default or explicit pin) avoids “works in CI, fails on Pages” drift.

**v3 limitations** called out in Cloudflare’s docs include: Node codenames (e.g. `lts/hydrogen`) not supported; no automatic detection of Node or package managers from `package.json` **`engines`** alone—**pin explicitly** if you rely on a specific version ([v3 build system](https://developers.cloudflare.com/pages/configuration/build-image/#v3-build-system)).

### Monorepo: duplicate builds (optional)

By default, **any** change in the repo can trigger a build for this Pages project ([Monorepos — Builds](https://developers.cloudflare.com/pages/configuration/monorepos/#builds)). To skip builds when unrelated paths change, configure [**build watch paths**](https://developers.cloudflare.com/pages/configuration/build-watch-paths/) (and/or branch controls). Monorepo support requires **build system v2 or later** ([Monorepos — Limitations](https://developers.cloudflare.com/pages/configuration/monorepos/#limitations)); new projects should be on v3.

### Save and first deploy

Select **Save and Deploy**. Logs show dependency install, build, and upload. When finished, you get a **`*.pages.dev`** hostname for the project ([first deploy](https://developers.cloudflare.com/pages/get-started/git-integration/#your-first-deploy)).

---

## Custom domain: wegoagane.com

Add domains only through the Pages UI so Cloudflare can attach certificates and routing correctly ([Add a custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-domain)).

1. **Workers & Pages** → your **Pages project** → **Custom domains** → **Set up a domain** → enter **`wegoagane.com`** (and/or **`www.wegoagane.com`**) → **Continue**.

### Apex (`wegoagane.com`)

For an **apex** domain, Cloudflare’s docs require the domain to exist as a **zone on the same Cloudflare account** as the Pages project, with **nameservers pointed to Cloudflare** ([apex domain](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-apex-domain), [full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)). After nameservers are correct, Cloudflare can create the needed DNS (including CNAME-style flattening at the edge where applicable).

### Subdomain only (`www`)

If you use **only** a subdomain and do **not** move the whole zone to Cloudflare, you must add a **CNAME** at your DNS provider per Cloudflare’s instructions—but you must still **complete the “Set up a domain” flow in the Pages dashboard first**. A CNAME alone, without associating the domain in Pages, can produce **522** errors ([custom CNAME](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-cname-record), [522 note](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-cname-record)).

### CAA records

Restrictive **CAA** records can block certificate issuance. If TLS fails when adding a custom domain, add the CAA entries Cloudflare documents ([CAA known issue](https://developers.cloudflare.com/pages/configuration/custom-domains/#caa-records), [CAA FAQ](https://developers.cloudflare.com/ssl/faq/#caa-records)).

### Deleting the project or a domain

Before deleting a project that used a custom domain, clean up DNS and remove the domain in **Custom domains** as documented ([delete custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/#delete-a-custom-domain), [delete project](https://developers.cloudflare.com/pages/get-started/git-integration/#delete-a-project)).

### DNS pitfalls (this repo — April 2026)

If **`*.pages.dev` works** but **`wegoagane.com` / `www` return 522 or 525**, the Pages build is usually fine — **DNS is still pointing the hostname at the wrong origin**.

Common cause after moving a domain to Cloudflare: **registrar parking** records copied into the zone, still **Proxied** (orange cloud):

- Apex **`A`** to a parking IP (e.g. Namecheap `162.255.x.x`)
- **`www`** **`CNAME`** to `parkingpage.namecheap.com` (or similar)

With proxy on, Cloudflare’s edge connects to that parking host → **522** (timeout) / **525** (SSL mismatch). **Remove** those records.

**Working pattern for this project:** apex **`CNAME`** for **`wegoagane.com`** → **`wegoagane-com.pages.dev`**, **Proxied** (Cloudflare flattens apex CNAME to Pages). Add **`www`** only if you want it: **Pages → Custom domains** includes **`www.wegoagane.com`**, then DNS **`CNAME` `www` → `wegoagane-com.pages.dev`**, **Proxied**.

Keep **MX** / **TXT** for mail if you use registrar forwarding; they do not affect the site record above.

**Optional:** [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/) set to something like **`apps/web/*`** so doc-only commits do not rebuild the Pages project.

---

## SPA routing and refresh

Cloudflare Pages **single-page application** behavior: if there is **no** top-level **`404.html`**, Pages treats the site as an SPA and **matches incoming paths to the root** so client routes work ([SPA rendering](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)).

[`apps/web/public/_redirects`](../apps/web/public/_redirects) is intentionally **comment-only**. A Netlify-style line **`/* /index.html 200`** is **rejected** on Pages deploy (“infinite loop” — `index.html` re-matches after normalization), so it is not used here. Rely on **built-in SPA behavior** above; add real redirect lines only when you have concrete paths ([Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)).

**Caching:** Cloudflare warns that heavy custom caching on the **custom domain** can interfere with **redirects** or **Pages Functions** and cause stale responses ([Caching and performance](https://developers.cloudflare.com/pages/configuration/serving-pages/#caching-and-performance)).

---

## GitHub integration behavior (useful day-to-day)

- **Preview deployments:** Opening a PR builds a **unique preview URL** that updates as you push to the branch ([Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)). **PRs from forks** do not get preview URLs ([GitHub integration — Preview URLs](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#preview-urls)).
- **Skip a Pages build** with a commit subject prefix such as **`[CI Skip]`**, **`[Skip CI]`**, or **`[CF-Pages-Skip]`** (case-insensitive; see [Skipping a build](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message)).
- **Check runs** in GitHub show Pages build status when a build runs; if a build is skipped (skip tag, watch paths, branch controls), a check may not appear ([Check runs](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#check-runs)).

Production branch and preview branch rules are under **Settings → Builds → Branch control** ([custom branches](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#custom-branches)).

---

## Injected build environment variables

Cloudflare injects variables such as **`CI=true`**, **`CF_PAGES=1`**, **`CF_PAGES_COMMIT_SHA`**, **`CF_PAGES_BRANCH`**, and **`CF_PAGES_URL`** ([table](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)). Use them for build-time metadata (for example, stamping commit SHA into a debug banner).

---

## GitHub Actions vs Cloudflare Pages

**GitHub Actions** (this repo’s **Web** job) and **Cloudflare Pages** builds are **separate**. Keep them aligned on Node version and install/build commands so green CI correlates with green Pages deploys.

## API on the same domain (`/api/*`)

The frontend now calls **`/api/v1/recommend`** and **`/api/v1/memorial`**. In production this is handled by a **separate Worker** (`packages/api`) routed on the same domain:

- `wegoagane.com/api/*`
- `www.wegoagane.com/api/*`

Routing is declared in [`packages/api/wrangler.toml`](../packages/api/wrangler.toml). This keeps API and SPA split operationally (Worker + D1 vs Pages), while avoiding CORS by staying same-origin.

### One-time API production wiring

1. Set real D1 IDs in [`packages/api/wrangler.toml`](../packages/api/wrangler.toml):
   - `env.preview ... database_id`
   - `env.production ... database_id`
2. Set `CLOUDFLARE_API_TOKEN` in your shell (Workers + D1 edit permissions).
3. Configure AI vars (optional, defaults are safe template-only):
   - `AI_ENABLED` (`"false"` default)
   - `AI_GATEWAY_URL` (OpenRouter: `https://openrouter.ai/api/v1/chat/completions`)
   - `AI_MODEL_DESTINY` (default in repo: **`openrouter/auto`** — see [Auto Router](https://openrouter.ai/docs/features/model-routing); pinned ids use `provider/model`)
   - `AI_MODEL_MEMORIAL` (same; **`openrouter/auto`** by default)
   - `AI_APP_TITLE` (maps to OpenRouter `X-OpenRouter-Title`)
   - `AI_PROVIDER_SORT` (`latency`, `price`, or `throughput` — not sent with `openrouter/auto`)
   - Wrangler secret: `AI_GATEWAY_TOKEN`
4. Apply migrations and deploy:

```bash
npm run db:migrate:production --prefix packages/api
npm run deploy:production --prefix packages/api
```

5. Verify live:

```bash
node packages/api/scripts/smoke.mjs https://wegoagane.com
```

If this returns HTTP `405` on `POST /api/v1/recommend`, `/api/*` is still handled by Pages/another rule, not the Worker route.

**Wrangler vs dashboard:** `wrangler deploy` applies `[env.production.vars]` from `packages/api/wrangler.toml`. A deploy can **overwrite** Worker variables you set only in the Cloudflare UI. Keep `AI_ENABLED` and other non-secrets in `wrangler.toml` in sync with what you want in production, and use **Secrets** for `AI_GATEWAY_TOKEN` only.

Responses from `POST /api/v1/recommend` and `POST /api/v1/memorial` include **`aiMeta`** (`gate`, `providerError`, `modelId` = request model, **`resolvedModelId`** = OpenRouter’s chosen model when present, …) so you can see whether the AI gate is open (`gate.ready`) and why OpenRouter fell back (`providerError`) without guessing.

**Symptom → look here**

| Symptom | Likely cause |
|---------|----------------|
| `output.sourceType` is `"template"` / `fallbackUsed: true` | **`aiMeta.gate`** not ready (`AI_ENABLED` false, missing secret, etc.) or **`aiMeta.providerError`** from OpenRouter |
| `ai_invalid_json` in **`aiMeta`** | Model returned JSON wrapped in markdown fences or leading prose — fixed in Worker by **`extractJsonPayload`** before parse; redeploy if you still see this on old revisions |
| `sourceType: "ai"` + **`resolvedModelId`** set | Healthy Auto or pinned model path |

Example (memorial, production):

```bash
curl -sS -X POST "https://wegoagane.com/api/v1/memorial" \
  -H "content-type: application/json" \
  -d '{"zone":"Durotar","cause":"Overpull","mood":"dry","nextSignal":"smaller pulls","faction":"horde","characterName":"Smoke","level":10}' \
  | jq '{sourceType: .output.sourceType, fallbackUsed: .output.fallbackUsed, aiMeta}'
```

### OpenRouter notes (current API)

- Chat completion endpoint: `POST https://openrouter.ai/api/v1/chat/completions`
- Supported structured output mode in this project: `response_format: { "type": "json_object" }`
- Attribution headers recommended by OpenRouter and sent by this API:
  - `HTTP-Referer` (site origin)
  - `X-OpenRouter-Title` (app title)
- Model IDs should use OpenRouter `provider/model` naming.

---

## M11 share pipeline (R2 + OG)

Share lifecycle endpoints (same under `/v1/*` and `/api/v1/*`):

- `POST /api/v1/share` (create/ensure run)
- `GET /api/v1/share/:runId` (poll status: `queued|rendering|ready|failed`)
- `GET /api/v1/share/:runId/image` (R2-backed image; fallback SVG while pending)
- `GET /api/v1/share/:runId/og` (bot-friendly OG/Twitter meta HTML)

Required Worker bindings/vars in [`packages/api/wrangler.toml`](../packages/api/wrangler.toml):

- R2 binding: `SHARE_IMAGES`
- `SHARE_IMAGE_BASE_URL` (default: `https://wegoagane.com/api/v1/share`)
- `SHARE_RENDER_TIMEOUT_MS` (default: `20000`)

Runbook:

1. Create/configure preview + production R2 buckets used by `SHARE_IMAGES`.
2. Apply latest migrations (includes `share_runs` table):

```bash
npm run db:migrate:production --prefix packages/api
```

3. Deploy API Worker:

```bash
npm run deploy:production --prefix packages/api
```

4. Verify share lifecycle end-to-end:

```bash
curl -sS -X POST "https://wegoagane.com/api/v1/share" \
  -H "content-type: application/json" \
  -d '{"sessionId":"smoke-session","destinyId":"<existing-destiny-id>"}' | jq
```

Then poll:

```bash
curl -sS "https://wegoagane.com/api/v1/share/<runId>" | jq
```

And confirm image + OG:

```bash
curl -I "https://wegoagane.com/api/v1/share/<runId>/image"
curl -sS "https://wegoagane.com/api/v1/share/<runId>/og" | rg "og:image|twitter:card|og:title"
```

---

## M12 analytics + observability (PostHog US)

Runtime config:

- API Worker vars:
  - `POSTHOG_ENABLED` (`"true"` in production)
  - `POSTHOG_HOST` (`https://us.i.posthog.com`)
- API Worker secret:
  - `POSTHOG_PROJECT_API_KEY` (`phc_...`)
- Web analytics host:
  - `https://us.i.posthog.com` (resolved via `/api/v1/analytics/config`)

Set API secret:

```bash
npx wrangler secret put POSTHOG_PROJECT_API_KEY --env production
```

Optional deploy guard vars/secrets used by `.github/workflows/api-deploy.yml`:

- `vars.API_POSTHOG_ENABLED`
- `vars.API_POSTHOG_HOST`
- `secrets.API_POSTHOG_PROJECT_API_KEY`

M12 endpoints/events to verify:

- `GET /api/v1/analytics/config`
- `GET /api/v1/share/summary/health`
- PostHog events:
  - `destiny_generated`, `destiny_generation_failed`
  - `memorial_generated`, `memorial_generation_failed`
  - `feedback_submitted`
  - `share_started`, `share_rendering`, `share_ready`, `share_failed`
  - `flow_started`, `reroll_reason_selected`, `accept_clicked`, `share_viewed`, `share_status_changed`, `post_accept_rating_submitted`

Suggested initial alerts:

- `share_failed_rate > 10%` on latest sample (see `/api/v1/share/summary/health`)
- `share_render_p95 > 8000ms`

---

## M13 hybrid memory rollout (balanced + degrade)

Runtime config:

- API Worker vars:
  - `MEMORY_BIAS_ENABLED` (`"true"` for M13)
  - `MEMORY_BROWSER_WEIGHT` (default `0.45`)
  - `MEMORY_SERVER_WEIGHT` (default `0.55`)
  - `MEMORY_MAX_BIAS` (default `1.5`)
  - `MEMORY_DEGRADE_MODE` (`"false"` normally; set `"true"` during degradation response)
  - `MEMORY_DEGRADE_SCALE` (default `0.5`)
  - `MEMORY_LOOKBACK_LIMIT` (default `80` preview / `120` production)

Optional deploy guard vars used by `.github/workflows/api-deploy.yml`:

- `vars.API_MEMORY_BIAS_ENABLED`
- `vars.API_MEMORY_BROWSER_WEIGHT`
- `vars.API_MEMORY_SERVER_WEIGHT`
- `vars.API_MEMORY_MAX_BIAS`
- `vars.API_MEMORY_DEGRADE_MODE`
- `vars.API_MEMORY_DEGRADE_SCALE`
- `vars.API_MEMORY_LOOKBACK_LIMIT`

M13 endpoints/events to verify:

- `GET /api/v1/analytics/config` (memory block present)
- `GET /api/v1/analytics/memory-health`
- PostHog events/properties include:
  - `memory_profile_updated` (web)
  - `destiny_generated` properties: `memoryEnabled`, weights, confidence, clamp hits, selected bias
  - `memory_health_evaluated` with `recommendedAction`

Degradation runbook:

1. Reduce memory influence first:
   - set `MEMORY_DEGRADE_MODE="true"` and deploy API
2. Recheck `GET /api/v1/analytics/memory-health` and PostHog KPI window
3. If still degraded, disable:
   - set `MEMORY_BIAS_ENABLED="false"` and deploy API

---

## M14–M18 release gates (trust → ceremony → UAT)

These are release discipline checks layered on top of existing M11–M13 runbooks.

### M14 content trust gate

- Promote new archetypes only when each has:
  - mechanics/correctness review
  - First-10 checklist review
  - source-tag completeness
  - non-generic memorial/destiny copy
- Compare post-deploy vs baseline:
  - validation-failure trend
  - reroll-rate trend for top intents

### M15 ceremony language gate

- Verify no placeholder/dev language appears in user-facing core flow screens.
- Confirm “subtle memory” policy remains intact.
- Run a quick human QA pass for tone consistency across death/planning/share.

### M16 share quality gate

- Verify share readability at 320px and in Discord/X previews.
- Validate ready/error/retry states on `/share/:runId`.
- Ensure OG metadata and image URLs resolve for crawlers.

### M17 modern web hardening gate

- Accessibility sanity:
  - keyboard path for core flow
  - control semantics/states
  - readable contrast in primary screens
- Reliability sanity:
  - bounded polling behavior
  - explicit loading/error state copy

### M18 UAT + go/no-go gate

- Execute full UAT matrix:
  - flows: death, planning, lucky roll, reroll, post-accept, share
  - devices: phone-first + desktop sanity
  - failure paths: recommend/memorial/share/analytics degradation
- Record go/no-go decision with measured outcomes:
  - accept-rate floor
  - rerolls/session ceiling
  - share-completion floor
  - validation-failure ceiling

---

## Automation stack for solo speed (AI-first)

### Preferred order

1. Native code automation (scripts, GitHub Actions, Cloudflare cron/Workers)
2. Cheap workflow glue (Make.com/Pipedream/Activepieces) only if native effort/maintenance is higher
3. Advanced orchestration only if scale/reliability needs demand it

### Low-cost tool inclusion matrix

| Need | Default | Cheap optional | Notes |
|---|---|---|---|
| CI checks, nightly QA, lint/tests | GitHub Actions | — | Keep product logic in repo; fastest to audit/debug |
| Periodic health scans / KPI snapshots | Cloudflare Cron + API endpoints | Make.com/Pipedream for notifications | Use webhooks for Slack/Discord summaries if needed |
| Product analytics, flags, replay | PostHog free tier first | Paid usage only after thresholds | Set per-product billing limits |
| Cross-tool webhooks | Code/webhooks in Worker | Make.com/Activepieces | Prefer explicit payload contracts |

### “Code vs tool” rule

- If a workflow can be built and kept stable in under ~60 minutes of code, code it directly.
- If integration churn is high (many SaaS connectors, auth tokens, schema drift), use cheap automation glue.

## Autonomous growth engine runtime (full-auto)

- Worker cron trigger (`*/20 * * * *`) now drives autonomous growth cycles through `POST /api/v1/growth/tick`.
- New growth endpoints:
  - `POST /api/v1/growth/generate`
  - `POST /api/v1/growth/assign`
  - `POST /api/v1/growth/outcome`
  - `POST /api/v1/growth/promote`
  - `GET /api/v1/growth/health`
- New runtime vars:
  - `GROWTH_AUTOPILOT_ENABLED`
  - `GROWTH_HARD_STOP_ENABLED`
  - `GROWTH_DEFAULT_TRAFFIC_PERCENT`
  - `GROWTH_DEFAULT_HOLDOUT_PERCENT`
  - `GROWTH_MIN_SAMPLE_SIZE`
  - `GROWTH_CONTROL_TOKEN` (secret; required for control endpoints in production)
- GitHub automation: `.github/workflows/growth-autopilot-check.yml` polls `GET /api/v1/growth/health` hourly as a lightweight availability guard.

Hardening in this baseline:
- Promotion now requires threshold pass and significance-aware accept-rate comparison against baseline promoted variant.
- Guardrail checks block unknown/scraped asset provenance and missing license tags for community-licensed sources.
- UI copy experiments are applied through a local accessibility-safe sanitizer and default fallback path.

### Autonomous growth rollout record (2026-04-23)

This is the exact implementation + rollout sequence used in production.

1. Ship code + migration artifacts:
   - Growth runtime routes (`/api/v1/growth/*`)
   - Data model migration (`0005_elite_growth_engine.sql`)
   - Drizzle metadata reconciliation migration (`0006_*` no-op SQL + snapshot/journal update)
2. Set production control secret in Cloudflare Worker:
   - `GROWTH_CONTROL_TOKEN`
3. Set matching GitHub Actions secret:
   - `API_GROWTH_CONTROL_TOKEN` (must equal Cloudflare token value)
4. Set GitHub Actions vars for growth deploy prechecks:
   - `API_GROWTH_AUTOPILOT_ENABLED`
   - `API_GROWTH_HARD_STOP_ENABLED`
   - `API_GROWTH_DEFAULT_TRAFFIC_PERCENT`
   - `API_GROWTH_DEFAULT_HOLDOUT_PERCENT`
   - `API_GROWTH_MIN_SAMPLE_SIZE`
5. Run API production migration + deploy from `packages/api`:
   - `npm run db:migrate:production`
   - `npm run deploy:production`
6. Run smoke with token:
   - `GROWTH_CONTROL_TOKEN=... npm run smoke:growth:production`
7. Verify growth health:
   - `curl -sS https://wegoagane.com/api/v1/growth/health | jq`
8. Optional manual seed tick:
   - `curl -sS -X POST "https://wegoagane.com/api/v1/growth/tick" -H "x-growth-control-token: ..."`

Rollout result:
- Growth health moved from `experimentsRunning=0, variantsTotal=0` to active state after manual tick:
  - `experimentsRunning=1`
  - `variantsTotal=2`
  - decisions: `hold` / `under_sampled` (expected at low sample size)

### Rollout gotchas encountered (and fixes)

- **Wrong directory for npm commands** (`ENOENT` root `package.json`):
  - This repo has no root package manifest. Run API scripts from `packages/api`, or use root with `--prefix packages/api` (never both together).
- **Double-prefix path error** (`packages/api/packages/api/package.json`):
  - Caused by running `--prefix packages/api` while already inside `packages/api`.
- **Preview deploy route collision** (resolved):
  - `wrangler deploy --env preview` had attempted to claim production routes when `routes` were top-level in `wrangler.toml`.
  - Routes are now scoped under `[env.production]` only, and CI/deploy enforce this with `npm run check:routes`.
- **Smoke 404 on growth health before deploy**:
  - `GET /api/v1/growth/health` returned 404 until latest Worker deploy was applied.
- **CI migration drift after manual migration**:
  - `db:generate` produced `0006` because manual `0005` lacked matching Drizzle metadata snapshot.
  - Resolved by committing `0006` metadata files and making `0006` SQL intentionally no-op.

### Growth control token rotation (quick runbook)

1. Generate a new strong token locally (for example: `openssl rand -hex 32`).
2. Set it as Cloudflare secret:
   - `npx wrangler secret put GROWTH_CONTROL_TOKEN --env preview`
   - `npx wrangler secret put GROWTH_CONTROL_TOKEN --env production`
3. Redeploy API worker to ensure scheduled and control paths pick up the new secret.
4. Validate:
   - unauthenticated `POST /api/v1/growth/tick` returns `403` in production
   - authenticated request with header `x-growth-control-token` returns `200`
5. If needed, revoke old automation tokens that referenced the previous value.

### Final production release checklist (growth + core)

- API safety:
  - `API_GROWTH_CONTROL_TOKEN` present in GitHub secrets and `GROWTH_CONTROL_TOKEN` set in Cloudflare.
  - `POST /api/v1/growth/tick` returns `403` without token and `200` with `x-growth-control-token`.
  - `GET /api/v1/growth/health` returns healthy JSON payload.
- Data readiness:
  - Run `npm run db:migrate:production --prefix packages/api`.
  - Confirm new growth tables exist and are writable.
- Runtime:
  - Cron trigger enabled (`*/20 * * * *`) and `GROWTH_AUTOPILOT_ENABLED=true` only when ready.
  - `GROWTH_HARD_STOP_ENABLED=true` in production.
- Quality gates:
  - API: `npm run typecheck --prefix packages/api` and `npm run test --prefix packages/api`.
  - Web: `npm run build --prefix apps/web`.
  - Smoke: `GROWTH_CONTROL_TOKEN=... npm run smoke:growth:production --prefix packages/api` (verifies growth auth deny/allow + growth health + analytics growth config).
- Post-release observation window (first 24h):
  - Check PostHog for `growth_assignment_served`, `growth_decision_made`, `growth_hard_stop_triggered`.
  - Verify no unexpected spike in rerolls or validation failures.

---

## Asset and data ingestion risk matrix

| Class | Allowed | Caution | Avoid |
|---|---|---|---|
| Visual assets | Original/licensed assets; generated assets with clear commercial terms | Style-reference generation that might resemble protected IP too closely | Direct copying/redistribution of protected game assets |
| Screenshots | Official/fan-policy compatible usage with required notices | Ambiguous commercial usage contexts | Removing notices or using restricted materials outside policy |
| Scraped data | Public factual data for internal ranking/analysis with compliance checks | ToS-sensitive crawling where contractual risk is unclear | Auth/paywall bypass, protected creative republishing, aggressive crawling |

Compliance checklist for ingestion:
- Review robots.txt and ToS before collection
- Use conservative rate limits and retry/backoff
- Keep usage factual/transformative; avoid republishing protected creative content
- Document source policy checks and last-reviewed timestamps

## After you add new required CI jobs

If GitHub gains a new **required** job for merges, add it to ruleset **`wegoagane-main-ci`** or run:

```bash
python3 scripts/ruleset_add_required_check.py "Web"
python3 scripts/ruleset_add_required_check.py "API"
```

Use the **exact** job name from the workflow YAML.

---

## Local preview

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173` (Vite default).

---

*Production **https://wegoagane.com** on Cloudflare Pages from `main` — see [`docs/handoff/STATUS.md`](handoff/STATUS.md). Cloudflare Pages references as of April 22, 2026; DNS + API + OpenRouter + M11 share ops updated April 23, 2026.*
