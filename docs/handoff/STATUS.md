# Build status & iteration contract

**Last updated:** 2026-04-23 (M8+M9 safe rollout slice implemented with AI-gated fallback + memorial endpoint)

---

## Workflow (current)

| Field | Value |
|--------|--------|
| **Current milestone** | **M10 (next)** — refinement + rating gate after M8+M9 backend/frontend wire-up |
| **Blocked by** | — |
| **Last build iteration** | Implemented AI adapter boundary (`packages/api/src/ai/*`) with env-gated retries + deterministic fallback; extended Drizzle schema (`memorials` + AI telemetry on `recommendation_logs`) and generated migration; added `POST /v1/memorial` + `/api/v1/memorial`; integrated recommend AI enrichment with validation + fallback metadata; wired death flow frontend to memorial API with fixture fallback; added API unit tests + CI test gate + deploy precheck for AI inputs; updated smoke script + deployment docs. |
| **Next “request to move forward” criteria** | Run production migration + deploy for migration `0001_*`, set Worker secret `AI_GATEWAY_TOKEN` and optional AI vars, and confirm live smoke checks (recommend + memorial + D1 write counts). |

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
| **M8** | AI Gateway + presentation layer | **Shipped:** AI adapter layer behind env flag; deterministic winner remains source of truth; AI enrichment validated with retry + fallback; response metadata includes `sourceType` + fallback status | M6–M7 | Model IDs pinned in code/config (tiers in §18) |
| **M9** | Memorial pipeline | **Shipped:** template-first memorial pipeline + validator + persistence + `POST /api/v1/memorial` with AI optional enrichment and fallback | M8 | Name suggest vs optional (29.5); tone “bullshit death” (29.3) |
| **M10** | Refinement + rating gate | Reroll reasons, “almost right,” post-accept rating | M6–M9 | — |
| **M11** | Share images + OG | Browser Rendering → R2; async UX; Discord/Twitter preview | M2, M7 | — |
| **M12** | Analytics + observability | PostHog events per §21; validation_failed + cost alerts | M7+ | Acceptance stats on cards? (29.8) |
| **M13** | Local memory + polish | localStorage biases; content iteration | M10–M12 | Planning “first HC” signal (29.4) |

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
