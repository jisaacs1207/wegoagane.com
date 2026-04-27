# Route QA matrix

**Doc index:** [Handbook hub](handoff/README.md) · [STATUS / milestones](handoff/STATUS.md) · [Root README](../README.md)

## Home entry routes

- `/` -> `/lucky-roll/journey?quick=1` (Quick build)
- `/` -> `/draft-a-run/intent` (Detailed build)
- `/` -> `/release-spirit/next` (I died – recover from death)

## Release spirit

- `/release-spirit/next` -> `/release-spirit/journey` (selecting a priority auto-advances)
- `/release-spirit/next` -> `/release-spirit/detail` (optional details)
- `/release-spirit/detail` -> `/release-spirit/journey`
- `/release-spirit/journey` -> `/build/commit/:slug?fresh=1&flow=death` (normal path)
- Fallback if commit row missing: `/release-spirit/journey` -> `/build/:destinyId?fresh=1&flow=death`

## Draft a run

- `/draft-a-run/intent` -> `/draft-a-run/journey` (selecting a goal auto-advances)
- `/draft-a-run/intent` -> `/draft-a-run/freeform` (optional route; direct/open link)
- `/draft-a-run/freeform` -> `/draft-a-run/journey`
- `/draft-a-run/journey` -> `/build/commit/:slug?fresh=1&flow=plan` (normal path)
- Fallback if commit row missing: `/draft-a-run/journey` -> `/build/:destinyId?fresh=1&flow=plan`

## Lucky roll

- `/lucky-roll/journey?quick=1` auto-generates from seeded quick intent
- `/lucky-roll/journey?quick=1` -> `/lucky-roll/journey` (open setup instead)
- `/lucky-roll/journey` -> `/build/commit/:slug?fresh=1&flow=lucky` (normal path)
- Fallback if commit row missing: `/lucky-roll/journey` -> `/build/:destinyId?fresh=1&flow=lucky`

## Commit/build loop

- `/build/commit/:slug` — SPA build artifact (destiny card, plan sheet, **talent level rail**). Optional **`?fresh=1`** after landing from publish: UI keeps polling until the async plan is ready.
- **Plan polling:** `GET /api/v1/build/:destinyId` until JSON `status` is `ready` or `failed`; payload includes `plan.talents` (see API). Second worker pass may add **`plan.talents.levelByLevel`** (51 steps, levels 10-60) and **`plan.talents.buildIntentSummary`**; if missing, the web derives steps from **`plan.talents.path`** when present.
- Worker **SEO shell** for crawlers: `GET /build/commit/:slug` (same host as API/Worker route table) returns OG metadata + redirect into the SPA (see `packages/api` `handleCommitOg`).
- `/build/commit/:slug` retool -> `/draft-a-run/intent`
- `/build/:destinyId` retool -> `/draft-a-run/intent`

## Ops UI (growth / feedback)

- `/ops/feedback` — feedback triage (auth-gated in production)
- `/ops/growth` — growth assignments (auth-gated in production)

## Retool / restart (browser)

- **Build commit page** “Retool from this build” routes to `/draft-a-run/intent` and sets `plan.seedDestinyId` as a soft class/faction hint for the next generation.
- The legacy `/build/:destinyId` wrapper route forwards to `/build/commit/:slug` when possible.
- **Home** entry tiles clear the chosen flow’s `buildIntent`, depth/power-curve aux keys, `generatedDestiny`, and `destinyId` so a new ritual does not reuse the previous card.
- **Stored destiny JSON** for post-generate continuity lives under `plan.generatedDestiny` / `death.generatedDestiny` / `lucky.generatedDestiny` (written via [`flowDestinyState`](../apps/web/src/lib/flowDestinyState.ts), aligned with [`SessionKeys`](../apps/web/src/lib/sessionKeys.ts)).

## SessionStorage keys (browser)

Canonical string literals live in [`apps/web/src/lib/sessionKeys.ts`](../apps/web/src/lib/sessionKeys.ts) (`SessionKeys.home`, `SessionKeys.plan`, `SessionKeys.death`, `SessionKeys.lucky`). Values are stable wire names (not renamed) so existing sessions keep working.

| Key | Purpose |
|-----|---------|
| `session.id` | `SessionKeys.home.sessionId` — growth assignment on home + share viewer bootstrap |
| `wega.lastBuildFlow` | Last flow (`plan`/`death`/`lucky`) used to mint a commit URL; helps `/build/commit/:slug` recover attribution when `?flow=` is absent |
| `plan.sessionId` | Recommend / growth session for draft-a-run |
| `plan.intent` | Selected intent label (step 1) |
| `plan.intentGoalId` | Stable id for selected intent tile (separate from API-facing label text) |
| `plan.identityPriority` | `class_first` \| `race_first` signal |
| `plan.freeform` | Optional note (step 2) |
| `plan.destinyId` | Latest destiny row id for this draft |
| `plan.seedDestinyId` | Seed class/faction from a prior commit when re-drafting |
| `plan.generatedDestiny` | JSON blob: `{ sessionId, destinyId, output, intentSnapshot?, experimentalLane?, experimentalCandidate? }` |
| `plan.buildIntent` | JSON `BuildIntentSignals` |
| `plan.buildIntent.depth` | `quick` \| `balanced` \| `dialed_in` |
| `plan.buildIntent.powerCurve` | Optional power curve id |
| `plan.recommendRelaxBanner` | One-shot UI marker when API relaxed filters for AI |
| `death.sessionId` | Release spirit recommend session |
| `death.mood` / `death.nextSignal` | Mood + next-run signal ids |
| `death.detail.zone` / `.cause` / `.level` / `.note` | Optional death context |
| `death.destinyId` / `death.generatedDestiny` | Same shape as `plan.generatedDestiny` |
| `death.buildIntent` (+ `.depth`, `.powerCurve`) | Build journey for spirit release |
| `death.recommendRelaxBanner` | One-shot UI marker when API relaxed filters for AI |
| `lucky.sessionId` / `lucky.destinyId` / `lucky.generatedDestiny` / `lucky.buildIntent` (+ aux) | Lucky roll (same generatedDestiny shape) |
| `lucky.recommendRelaxBanner` | One-shot UI marker when API relaxed filters for AI |
| `last.acceptedClassId` | Last accepted class for post-accept memory updates |
| `wegoagane.memory.v1` | `localStorage` — recommend bias (see `memoryProfile.ts`) |

Clearing rules: **Home** clears the flow being entered; **plan intent** clears build intent + destiny when picking a new intent; **death mood / next / detail** clear downstream keys per step comments in those components.

## API error → user copy (web)

Client throws `label:status:error` (e.g. `journey_commit:404:destiny_not_found`). UI maps via `flowApiErrorHint` / `destinyRecommendErrorHint` in [`apps/web/src/lib/recommendClient.ts`](../apps/web/src/lib/recommendClient.ts). Common API `error` strings:

| `error` | Typical HTTP | Flow |
|---------|----------------|------|
| `invalid_json` / `invalid_input` | 400 | Malformed JSON or schema-failed body (`/v1/recommend`, `/v1/feedback`, `/v1/memorial`, `/v1/share`, …) |
| `validation_failed` | 422 | Memorial output failed safety checks |
| `destiny_not_found` | 404 | Journey commit — destiny/session mismatch |
| `no_viable_build` / `no_eligible_archetypes` | 400 | Recommend — filters too tight (web: “Soften one filter”). **Production with AI enabled:** API may widen class eligibility once, rank a template, then run `enrichDestiny` instead of returning `no_viable_build` (response includes `filterRelaxedForAi` when that path runs). |
| `experimental_requires_ai` | 400 | Client sent `signals.recommendLane: "experimental"` but AI gateway is not configured. |
| `experimental_archetype_failed` | 503 | Experimental lane AI draft failed validation twice — retry or use curated. |
| `recommendLane` | body | Optional `curated` (default) or `experimental` — experimental drafts a new archetype-shaped row via AI, then normal destiny enrich. Cohort UI driven by `EXPERIMENTAL_LANE_OFFER_PERCENT` in analytics config. |
| `recommend_internal_error` | 503 | Recommend — retry client-side (limited) |
| `build_commit_not_found` | 404 | GET commit / memorial on bad slug |
| `share_run_not_found` | 404 | Share poll GET by unknown `runId` |

## Validation runs completed

- `apps/web`: `npm run lint` + `npm run test` + `npm run build` + `npx playwright install chromium` + `npm run test:e2e` (CI runs E2E after build; [`playwright.config.ts`](../apps/web/playwright.config.ts) starts `vite preview` on port 4173)
- `packages/api`: `npm run typecheck` + `npm test`
