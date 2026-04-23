# Build status & iteration contract

**Last updated:** 2026-04-23 (M13 hybrid memory + polish shipped)

---

## Workflow (current)

| Field | Value |
|--------|--------|
| **Current milestone** | **M14 (next)** — content iteration + polish follow-through |
| **Blocked by** | — |
| **Last build iteration** | **M13 shipped:** hybrid memory path (browser `localStorage` + API-derived session history) now biases deterministic ranking with configurable weights/clamps, balanced rollout defaults, degrade-mode controls, memory observability (`/api/v1/analytics/memory-health`), and deploy guard wiring for memory vars. |
| **Next “request to move forward” criteria** | Start **M14** content iteration: use M12/M13 analytics to tune archetype copy/weighting quality and reduce reroll pressure without increasing failure rates. Keep Web/API CI green and memory health action at `keep` under normal traffic. |

---

## Recent engineering decisions (record)

| Topic | Decision | Where it lives |
|--------|-----------|----------------|
| **AI gateway** | Single integration: **OpenRouter** `POST …/chat/completions`, Bearer + optional `HTTP-Referer` / `X-OpenRouter-Title`. | `packages/api/src/ai/adapter.ts`, [OpenRouter quickstart](https://openrouter.ai/docs/quickstart) |
| **Default models** | **`openrouter/auto`** ([Auto Router](https://openrouter.ai/docs/features/model-routing)) for both destiny and memorial env vars until we pin per-lane for cost/quality. | `packages/api/wrangler.toml` |
| **Provider sort** | Not sent when `model === openrouter/auto` (avoid fighting router). | `adapter.ts` |
| **Config source of truth** | Plain Worker vars from **`wrangler.toml` on deploy**; secrets (`AI_GATEWAY_TOKEN`) only via Wrangler/dashboard. Dashboard-only vars can be overwritten on next deploy. | `docs/deploy-wegoagane-com.md` |
| **`AI_ENABLED`** | Treat **boolean or string** truthy values as on (not only `=== "true"`). | `adapter.ts` `isTruthyEnv` |
| **Observability** | Workers Logs enabled in Wrangler `[observability]` for deploy consistency. | `wrangler.toml` |
| **Git workflow** | **`main` protected** — ship via **PR branches**; sync local `main` after merges. | `docs/github-setup.md` |
| **Validator-first** | Unchanged: deterministic ranker wins selection; AI may only enrich copy; invalid AI → template fallback. | `02-content-truth-ai.md`, `adapter.ts` |

---

## MVP content slice (Phase 1 acceleration)

Full launch targets **36** structured archetypes per [02-content-truth-ai.md](02-content-truth-ai.md) §27. To ship **vertical slices** earlier without breaking the Phase 1 vision:

| Field | Proposed default (adjust with operator) |
|--------|----------------------------------------|
| **MVP archetype count** | *Pending your confirmation* — suggest **3–5** archetypes fully validated (skills, items with source tags, First 10 Levels reviewed) for first end-to-end flows |
| **Expansion rule** | Add archetypes in batches; Lucky Roll weights only include “ready” archetypes until library is complete |

Document the agreed number here when decided.

---

## Milestones (usable increments)

Aligned with [04-engineering-data-ops.md](04-engineering-data-ops.md) §26, grouped so each step produces something shippable to *try*.

| ID | Milestone | Definition of done (summary) | Depends on | Open decisions (§29) to resolve before / during |
|----|------------|------------------------------|--------------|--------------------------------------------------|
| **M0** | Handbook + process | Multi-file `docs/handoff/`, archive monolith, STATUS workflow; **GitHub Actions CI** green on push (handbook structure gate — see [04-engineering-data-ops.md](04-engineering-data-ops.md) §17.4) | — | — |
| **M1** | App shell + routing | **Shipped on `main`:** `apps/web` Vite SPA — `/`, `/release-spirit/*`, `/draft-a-run/*`, `/lucky-roll`, `/share/:runId`; CI **Web**; Cloudflare Pages + **https://wegoagane.com**; `_redirects` comment-only (no `/*` SPA rewrite — see [deploy doc — SPA](../deploy-wegoagane-com.md#spa-routing-and-refresh)) | M0 | Wordmark/typography (29.1) partial OK with tokens |
| **M2** | Icons + card UI shell | **Shipped on `main`:** `ClassIcon` (+ `MemorialMarkIcon`, `ShareFrameIcon`); `MemorialCard`, `DestinyCard`, `ShareComboLayout`; fixtures in `apps/web/src/content/cardFixtures.ts`; route **`/design/cards`**; tier line as **prose** pending §29.7 | M1 | Tier labels vs prose-only (29.7) — **deferred:** prose `tierProse` on Destiny card |
| **M3** | Archetype schema + fixture JSON | **Shipped:** typed archetype schema + 8 archetype fixture set in `packages/api/src/domain/archetypes.ts` | M0 | **MVP archetype count** (operator selected 8 for this pass) |
| **M4** | **Output validator** | **Shipped:** request + output validation in `packages/api/src/domain/validator.ts` (class/faction + shape checks) | M3 | — |
| **M5** | Deterministic ranker | **Shipped:** weighted tag-overlap ranker in `packages/api/src/domain/ranker.ts` with explainable reasons | M3–M4 | — |
| **M6** | Template-only Destiny pipeline | **Shipped:** rank → template render → validate in `packages/api/src/domain/template.ts` and `POST /api/v1/recommend` | M4–M5 | Combined vs tabbed result (29.2); share CTA (29.6) |
| **M7** | Workers + D1 + session persistence | **Shipped:** `packages/api` Worker + Drizzle schema + migration + inserts into sessions/question_answers/destinies/recommendation_logs; live on `wegoagane.com/api/*` | M6 | — |
| **M8** | AI Gateway + presentation layer | **Shipped:** OpenRouter-backed adapter; defaults **`openrouter/auto`**; deterministic winner unchanged; retry + validate + fallback; **`aiMeta`** + **`resolvedModelId`**; JSON extraction for markdown-wrapped responses | M6–M7 | Revisit pinned vs auto when cost/tier policy is set (§18) |
| **M9** | Memorial pipeline | **Shipped:** template-first memorial pipeline + validator + persistence + `POST /api/v1/memorial` with AI optional enrichment and fallback | M8 | Name suggest vs optional (29.5); tone “bullshit death” (29.3) |
| **M10** | Refinement + rating gate | **Shipped:** required reroll rating gate, reason-driven reroll/refinement behavior, and post-accept non-blocking rating capture with structured feedback telemetry | M6–M9 | — |
| **M11** | Share images + OG | **Shipped:** async share generation lifecycle, R2 image storage + fallback image, `/share/:runId` polling UX, and OG metadata endpoint for social previews | M2, M7 | — |
| **M12** | Analytics + observability | **Shipped:** PostHog event instrumentation (API + web), runtime analytics config, and share health summary with failed-rate + p95 thresholds | M7+ | Acceptance stats on cards? (29.8) |
| **M13** | Local memory + polish | **Shipped:** hybrid memory hints + server memory read-path + weighted/clamped ranker integration + degrade controls and memory health endpoint | M10–M12 | Planning “first HC” signal (29.4) |

**Test notes (recurring):** phone-first flows; “just generate” death path; validator abuse cases ([06-risks-open-decisions-checklist.md](06-risks-open-decisions-checklist.md) §33); 320px share width; Lucky Roll distribution.

---

## Review gates (ongoing — tighten before UI-heavy work)

**M1–M2** shipped with handbook tokens, flow stubs, and **card shells + class icons**. The checklist below still gates **layout lock**, **share CTA**, and **content scale** (M3+). Record decisions in [06-risks-open-decisions-checklist.md](06-risks-open-decisions-checklist.md) (or short `ADR-*.md` in this folder).

1. **§29 — Open decisions:** Minimum before locking Memorial/Destiny layout: **29.2** (combined vs tabbed), **29.6** (share CTA), **29.7** (tier labels).  
2. **MVP archetype slice:** Set the count and **which** classes/philosophies ship first in M3–M6.  
3. **§30 — Widget demos:** Transcript path is external; either attach excerpts under `docs/reference/` or mark demos as “design session only, no artifact in repo.” Update [08-reference-widget-demos.md](08-reference-widget-demos.md) accordingly.

**Operator checklist (tick when done):**

- [ ] **29.1** — Brand wordmark + typography direction chosen (or “defer: use system stack only” for M1)
- [ ] **29.2** — Memorial + Destiny: combined stacked vs tabbed
- [ ] **29.3** — Tone sharpness for “bullshit death” framing
- [ ] **29.4** — Planning mode: explicit “first HC character” signal or not
- [ ] **29.5** — Character names: suggested vs optional default
- [ ] **29.6** — First share CTA: combo-first vs context-sensitive
- [ ] **29.7** — Tier labels: show vs description-only
- [ ] **29.8** — Acceptance stats on cards vs internal-only
- [ ] **MVP slice** — Count + list of archetype keys for M3–M6 recorded in this file (table above)
- [ ] **§30** — Widget reference: local excerpt in `docs/reference/` *or* explicit “no in-repo artifact” note in [08-reference-widget-demos.md](08-reference-widget-demos.md)

When the checklist is complete enough for the next milestone, update **Current milestone** / **Blocked by** here.

---

## Changelog (high level)

| Date | Change |
|------|--------|
| 2026-04-22 | Split v4 into `docs/handoff/*`; added STATUS + MVP slice framework |
| 2026-04-22 | GitHub Actions CI (handbook layout gate); §17.4 CI guidance in engineering handbook |
| 2026-04-22 | [docs/github-setup.md](../github-setup.md): GitHub **rulesets** (Settings → Rules → Rulesets); Steps 4–6; CI troubleshooting |
| 2026-04-22 | [docs/github-setup.md](../github-setup.md): step roadmap + “after Step 2 continue Steps 3–6”; Step 3 made actionable |
| 2026-04-22 | Profile B notes: `RULESET:` reminder + [`scripts/ruleset_add_required_check.py`](../scripts/ruleset_add_required_check.py) for new required checks |
| 2026-04-22 | [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) on `main`; STATUS workflow row set to **Pre-M1** |
| 2026-04-22 | **`apps/web`** Vite + React Router usable flows; CI job **Web**; [deploy-wegoagane-com.md](../deploy-wegoagane-com.md) |
| 2026-04-23 | **Production live:** Cloudflare Pages from `main`; **https://wegoagane.com** (apex `CNAME` → `wegoagane-com.pages.dev`, proxied); removed Namecheap parking **A** / **www** CNAME; PR #7 `_redirects` comment-only fix |
| 2026-04-23 | STATUS: **M1** marked shipped on `main`; **M2** set as current milestone; review gates reframed post-M1 |
| 2026-04-23 | **M2:** `apps/web` class icons + Memorial / Destiny / share combo components; `/design/cards`; STATUS → **M3** next |
| 2026-04-23 | **M3–M7 foundation (branch):** `packages/api` Hono+Drizzle+D1 migrations, validator/ranker/template pipeline, `/v1/recommend`, web pages calling API with fixture fallback |
| 2026-04-23 | Remote tie-in **live**: Worker route `wegoagane.com/api/*`, production deploy + smoke pass, D1 write verification; docs + deploy workflow updated |
| 2026-04-23 | **M8+M9:** AI adapter (`AI_ENABLED`) with retry+fallback, `memorials` table + recommendation AI telemetry columns, `POST /v1/memorial`, death flow memorial API wiring with fallback, API tests + deploy AI precheck, smoke script verifies recommend + memorial |
| 2026-04-23 | **PR #12–#13:** API foundation + AI gate / `aiMeta` / truthy `AI_ENABLED` / Wrangler prod AI vars merged to `main` |
| 2026-04-23 | **PR #14:** OpenRouter **`openrouter/auto`** defaults + skip `provider.sort` for auto + **`resolvedModelId`** telemetry |
| 2026-04-23 | **`5255d3b` on `main`:** **`extractJsonPayload`** before parse — fixes `ai_invalid_json` when models wrap JSON in fences or lead with prose; production memorial/recommend verified **`sourceType: "ai"`** when gate + token healthy |
| 2026-04-23 | **M10 complete:** reroll rating gate + five reason options, reason-aware reroll mutation (`wrong_class` / `wrong_energy` / `wrong_goals` / `almost_right` / `just_curious`), post-accept 5-point rating, `destiny_feedback` schema extended (`stage`, `reroll_reason`, `post_accept_rating`), and `/api/v1/feedback/summary` + `/ops/feedback` for quick ops validation |
| 2026-04-23 | **M11 complete:** share lifecycle + persistence (`share_runs`), async API routes (`/api/v1/share*`), R2 image storage + fallback SVG, web polling UX at `/share/:runId`, and OG metadata endpoint (`/api/v1/share/:runId/og`) |
| 2026-04-23 | **M12 complete:** PostHog US instrumentation in API + web, analytics config endpoint, deploy prechecks for PostHog vars/secrets, share health summary endpoint + operational thresholds, and production smoke verification of event flow |
| 2026-04-23 | **M13 complete:** browser memory profile (`localStorage`) + memory hints in recommend requests, API history-derived memory features from `destiny_feedback` + `recommendation_logs`, weighted/clamped hybrid memory ranker, and memory degradation runbook (`reduce weights` then `disable`) with `/api/v1/analytics/memory-health` |
