# Engineering, data & implementation order

Handbook sections **17**, **19–21**, **26** (from handoff v4).

## Viability & dependencies

- Stack (Workers + Hono + D1 + KV + R2 + **OpenRouter** for LLM + PostHog) is **solo-operable**; risks are **AI spend caps**, **validation_failed rate**, and **schema creep** — keep tables minimal per §19 senior note.
- Implementation order §26 is the reliability backbone: deterministic path and validator **before** relying on models.
- **CI from day one** (§17.4): low-cost structure checks now; extend the same workflow with lint/typecheck/tests when packages land — keeps “testing live” on every push without fighting markdown rules on imported prose.
- **CD for solo** (§17.5): default to **auto-deploy on `main`** (Pages Git connection or workflow); use branch previews so `.com` stays trusted.

---

## 17. Technical stack

### 17.1 Final stack (operator-confirmed)

**Frontend: React SPA** (Vite + React Router)
- Mobile-first CSS, custom properties for theming
- Deployed to Cloudflare Pages (free, GitHub Actions auto-deploy)
- SPA serves share landing pages via Worker-generated OG meta

**API runtime: Cloudflare Workers + Hono**
- Edge-friendly, lightweight, good DX
- Routes: question ingestion, recommendation generation, run tracking, share-card render trigger

**Storage — split by role:**
- **D1** — relational + analytics events needing SQL (sessions, questions, builds, ratings, runs, recommendation_logs)
- **KV** — hot lookup (archetype JSON, class/faction rules, feature flags)
- **R2** — generated share-card images + static assets

**AI routing (implemented): OpenRouter** — `POST https://openrouter.ai/api/v1/chat/completions` with env-pinned models; defaults **`openrouter/auto`** ([Auto Router](https://openrouter.ai/docs/features/model-routing)) until cost/quality policy pins per-lane `provider/model` ids.
- **Validator-first:** deterministic ranker + templates stay authoritative; AI only enriches presentation copy with retry + JSON validation + template fallback.
- **Response surface:** **`aiMeta`** on recommend/memorial includes gate status, request `modelId`, OpenRouter **`resolvedModelId`** when Auto (or router) chooses a concrete model, and parse/provider errors for ops.
- **Original plan** (handbook): Cloudflare AI Gateway in front of a primary provider remains a valid later consolidation layer; current code paths go straight to OpenRouter with Bearer token.

**Analytics: PostHog**
- Product analytics + session replay
- LLM observability support
- Feature flags for safe rollout
- Free tier adequate for launch

**Error tracking: PostHog error tracking** (consolidated) or Sentry if preferred

### 17.2 Why React SPA (not Astro)
Operator preference: familiar from itch.io game dev, simpler to ship. Astro + islands is a fine alternative but adds complexity without clear Phase 1 payoff. Share landing pages handled via Worker routes serving static HTML + OG meta — no full SSR needed.

Revisit SSR only if SEO becomes a Phase 2+ priority.

### 17.3 Why D1 (not Postgres)
Valid alternatives exist (Supabase, Neon). For Phase 1:
- Edge delivery > deep Postgres ergonomics
- Cost control + simple deployment > backend flexibility
- Share-card flow fits Cloudflare R2 especially well
- Revisit if analytics or user systems outgrow D1

### Senior-dev note on stack
This stack is genuinely operable by one person. Cloudflare's billing consolidates — one dashboard shows infra cost. PostHog free tier covers early traffic. **OpenRouter** is the current LLM chokepoint (swap models in env); optional Cloudflare AI Gateway later if you want provider-agnostic caching/rate limits in front of the same adapter. Don't let anyone convince you to add Kubernetes, microservices, or a message queue.

### 17.4 Continuous integration (from day one)

**Yes — add CI immediately**, even before the app shell: it gives a **live green/red signal on every push** (and on PRs). To gate **`main`**, use GitHub **repository rulesets** (**Settings → Rules → Rulesets**), not only the legacy branch protection screen — see [GitHub setup — Step 4](../github-setup.md#step-4-protect-main-with-a-branch-ruleset).

**Principles for a solo repo**

- **Keep the first pipeline cheap** — one workflow, fast runners, no paid third-party gates until you need them.
- **Separate “docs integrity” from “product quality”** — imported handbook prose is not worth strict Markdown style rules; validate **structure and presence** of canonical files instead, then tighten linting on authored code (`apps/web`, `packages/api`, etc.) once those directories exist.
- **Evolve the same workflow file** — when Vite/Workers land, add `npm ci`, `npm run lint`, `npm test`, `wrangler deploy --dry-run` or typecheck steps in the same job or a parallel job so the habit is already there.

**Suggested stages**

| Stage | When | CI should do |
|--------|------|----------------|
| **Now** | Docs-only repo | Assert `docs/handoff/` index + nine topic files + pointer/archive exist (see repo `.github/workflows/ci.yml`). |
| **M1–M2** | Frontend added | `npm ci` + ESLint + TypeScript `tsc --noEmit` + unit tests (Vitest) on PRs. |
| **M7+** | Workers package | `wrangler` dry-run or `tsc` for worker; optional integration tests behind a label or nightly if they’re slow. |
| **Deploy** | Pages + Workers | Keep deploy as its own workflow or Cloudflare Git integration; **CI** answers “does it build and test?” — deploy answers “ship it.” |

**Rulesets (optional):** on **Settings → Rules → Rulesets**, add a **branch ruleset** targeting `main` and require the **CI** job(s) once they appear in the picker (they must have run on `main` at least once). Solo: you can allow direct pushes to `main` and still require checks, or require PRs — your choice. Step-by-step: [../github-setup.md](../github-setup.md).

### 17.5 Continuous deployment (solo default)

For a **solo** operator, **push to `main` → live on wegoagane.com** is usually the least friction: treat `main` as production, let Cloudflare Pages build from Git (or a small deploy workflow after CI passes). You still get **preview URLs** for other branches/PRs so you do not have to test everything on the public domain.

Tradeoff: a bad push to `main` ships broken UI until the next fix — mitigate with **green CI before merge**, preview deploys for risky work, and one-click rollback in the Cloudflare dashboard. You do not need a manual “release day” process until the product complexity justifies it.

---

## 19. Data model

### 19.1 Core entities

**`sessions`**
```sql
id TEXT PRIMARY KEY,
created_at DATETIME,
device_fingerprint TEXT,
entry_path TEXT -- 'release_spirit' | 'draft_a_run' | 'lucky_roll'
```

**`question_answers`**
```sql
session_id TEXT,
question_key TEXT,
answer_value TEXT,
skipped BOOLEAN,
timestamp DATETIME,
freeform_text TEXT
```

**`memorials`**
```sql
id TEXT PRIMARY KEY,
session_id TEXT,
generated_at DATETIME,
character_name TEXT,
class TEXT, race TEXT, faction TEXT,
server TEXT, level_reached INTEGER,
death_zone TEXT, death_cause_bucket TEXT, death_cause_detail TEXT,
epitaph_text TEXT, post_mortem_text TEXT,
share_image_r2_key TEXT,
ai_model_used TEXT
```

**`destinies`**
```sql
id TEXT PRIMARY KEY,
session_id TEXT,
memorial_id TEXT,             -- nullable (planning flow)
generated_at DATETIME,
class TEXT, race TEXT, faction TEXT,
spec TEXT, archetype_key TEXT, -- references structured archetype
playstyle_overlays TEXT,       -- JSON array
profession_1 TEXT, profession_2 TEXT,
risk_profile TEXT,
fingerprint TEXT,              -- hash for cache lookup
content_json TEXT,             -- full rendered content
source_type TEXT,              -- 'ai_generated'|'cache_hit'|'template'
source_destiny_id TEXT,        -- if refinement, reference to original
ai_model_used TEXT,
share_image_r2_key TEXT
```

**`refinements`**
```sql
destiny_id TEXT,
refinement_type TEXT,
reroll_reason TEXT,
reroll_feedback_text TEXT,
resulting_destiny_id TEXT,
timestamp DATETIME
```

**`ratings`**
```sql
destiny_id TEXT,
score INTEGER,
feedback_text TEXT,
timestamp DATETIME
```

**`share_events`**
```sql
target_type TEXT,
target_id TEXT,
session_id TEXT,
channel TEXT,
timestamp DATETIME
```

**`archetypes`** (KV, not D1)
36 structured archetypes as JSON. Edge-loaded.

**`archetype_overlays`** (KV)
Profession pairs, playstyle modes, tone variations, allowed pairings.

**`recommendation_logs`** (D1)
```sql
destiny_id TEXT,
selected_archetype TEXT,
overlays_applied TEXT,
ranking_score REAL,
confidence_score REAL,
source TEXT,
model_used TEXT,
tokens_input INTEGER, tokens_output INTEGER,
cache_hit BOOLEAN,
retries INTEGER,
validation_failures INTEGER,  -- new: track validator triggers
timestamp DATETIME
```

### 19.2 Fingerprinting for cache
Hash: `class + spec + playstyle_mode + goal_type + profession_1 + profession_2`

On new session: query D1 for destinies with same fingerprint, `accept_rate ≥ 0.6`, `reroll_rate ≤ 0.3`, `sample_n ≥ 10`. Hit → serve cached. Miss → generate + store.

### 19.3 Local storage (browser)
- Rejected classes, accepted classes
- Reroll reasons across sessions
- Preferred tone patterns
- Repeated constraints
- Run IDs for return visits

### 19.4 Do not surface pattern learning aggressively
**Never:** *"You tend to die from X"*

**Do:** quietly bias recommendations. Use subtle explanation like *"this gives you more room to recover from overpulls"* if prior behavior suggests it.

### 19.5 Server-side learning (anonymous)
- Aggregate accept rate by archetype
- Reroll rate by archetype
- Reroll reason distribution by profile cluster
- Archetype fit by profile cluster
- Share rate by output type
- Repeated refinement paths

### Senior-dev note on data model
Don't over-engineer the schema. What's listed above is good. Resist adding "user profiles" or "preferences" tables until Phase 2 at the earliest. Every table is a migration and a bug surface.

## 20. Recommendation engine

### 20.1 Decision pipeline (deterministic first, AI last)
1. Collect user state + local-memory hints
2. Map signals into a profile vector
3. Rank eligible archetypes with deterministic rules + weights
4. Apply overlays (profession, playstyle, tone) via rules
5. Check cache for similar successful outputs (fingerprint + stats threshold)
6. Cache miss → generate AI presentation layer
7. Validate output against schema (Section 13.4)
8. On validation failure: retry tightened, then fall back to template
9. Render result
10. Log decision + outcome

### 20.2 Deterministic ranking inputs
- Stated goal
- Death mood
- Previous rejected classes (local memory)
- Pace preference
- Safety preference
- Social preference
- Novelty preference
- Faction preference
- Local repeated cause tendencies
- Constraints

### 20.3 Why deterministic-first
AI is good at variation + presentation, bad at consistent ranking + factual constraint satisfaction. Deterministic ranker surfaces candidates; AI polishes the one that wins. Cheaper, more reliable, easier to debug.

### Senior-dev note on the ranker
Start dumb. A weighted sum of tag-overlap scores is fine for launch. Don't build an ML model. Don't use embeddings. Don't vectorize anything. The moment you can't explain why a given recommendation won over another in plain English, you've over-engineered.

## 21. Analytics & observability

### 21.1 Launch metrics
- Completion rate (flow starts vs. destiny accepts)
- Accepted Destiny rate
- Average rerolls per session
- Reroll reason distribution
- Share rate by card type
- Share click-through to completed share
- Local repeat usage rate
- Cost per completed session
- Cost per accepted Destiny
- **Validation failure rate** (new — critical health metric)

### 21.2 Event taxonomy
- `landing_viewed`
- `flow_started` (entry_path)
- `question_answered`
- `question_skipped`
- `memorial_generated`
- `destiny_generated`
- `refinement_requested` (reroll_reason)
- `destiny_accepted`
- `post_accept_rated` (score)
- `share_clicked` (target_type)
- `share_completed`
- `generation_failed`
- `validation_failed` (with reason)
- `fallback_triggered`

### 21.3 LLM observability (first-class)
Per AI call:
- Tokens input / output
- Latency
- Provider / model
- Retry count
- Fallback triggered
- Cache hit
- Prompt template version
- Output passed validation
- Downstream acceptance

Surface in PostHog dashboards + Workers Logs + OpenRouter usage/cost (dashboard or export).

### Senior-dev note on monitoring
Set two alerts at launch: (1) validation_failed spikes above 10% of generations, (2) daily AI spend exceeds cap. Everything else can wait until you have real traffic. Don't build a dashboard until you have questions to ask it.

## 26. Implementation order

1. App shell + routing
2. Icon system (original SVG)
3. Card component system (Memorial / Destiny / share variants)
4. Structured archetype schema + JSON content (Section 27)
5. **Output validator (build before generator)**
6. Deterministic ranking engine (Section 20)
7. OpenRouter-backed AI enrichment (env-gated; validator-first)
8. Destiny generation pipeline (rank → cache → AI → validate → render)
9. Memorial generation pipeline
10. Refinement loop with rating capture
11. Share-card generation (Browser Rendering → R2)
12. Analytics + observability wiring
13. Local memory tuning
14. Content iteration based on early user data

### Senior-dev note on order
Build #1-5 before touching AI. Get a working deterministic pipeline that produces a usable Destiny from pre-written templates end-to-end. *Then* plug AI in as a presentation layer. This is boring advice and it's why solo products ship.

