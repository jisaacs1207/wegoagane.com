# Route QA matrix

**Doc index:** [Handbook hub](handoff/README.md) · [STATUS / milestones](handoff/STATUS.md) · [Root README](../README.md)

## Home entry routes

- `/` -> `/lucky-roll/journey?quick=1` (Quick build)
- `/` -> `/draft-a-run/intent` (Detailed build)
- `/` -> `/release-spirit/next` (I died – recover from death)

## Release spirit

- `/release-spirit/next` -> `/release-spirit/journey` (fast path)
- `/release-spirit/next` -> `/release-spirit/detail` (optional)
- `/release-spirit/detail` -> `/release-spirit/journey`
- `/release-spirit/journey` -> `/release-spirit/result`
- `/release-spirit/result` reroll -> `/reroll/death` -> (`totally_off` => `/release-spirit/next`, `close_but_off` => reroll then `/release-spirit/result`)
- `/release-spirit/result` retool -> `/release-spirit/next`

## Draft a run

- `/draft-a-run/intent` -> `/draft-a-run/journey` (fast path)
- `/draft-a-run/intent` -> `/draft-a-run/freeform` (optional view)
- `/draft-a-run/freeform` -> `/draft-a-run/journey`
- `/draft-a-run/journey` -> `/draft-a-run/result`
- `/draft-a-run/result` reroll -> `/reroll/plan` -> (`totally_off` => `/draft-a-run/intent`, `close_but_off` => reroll then `/draft-a-run/result`)
- `/draft-a-run/result` retool -> `/draft-a-run/intent`

## Lucky roll

- `/lucky-roll/journey` -> `/lucky-roll/result`
- `/lucky-roll/result` reroll -> `/reroll/lucky` -> (`totally_off` => `/lucky-roll/journey`, `close_but_off` => reroll then `/lucky-roll/result`)
- `/lucky-roll/result` retool -> `/lucky-roll/journey`

## Commit/build loop

- `/build/commit/:slug` retool -> `/draft-a-run/intent`
- `/build/:destinyId` retool -> `/draft-a-run/intent`

## Ops UI (growth / feedback)

- `/ops/feedback` — feedback triage (auth-gated in production)
- `/ops/growth` — growth assignments (auth-gated in production)

## Retool / restart (browser)

- **Result pages** “retool” links send the player back to the flow’s intent or journey entry (see route lines above); they do not clear `sessionStorage` by themselves unless the target step’s `useEffect` removes stale destiny rows.
- **Home** entry tiles clear the chosen flow’s `buildIntent`, depth/power-curve aux keys, `generatedDestiny`, and `destinyId` so a new ritual does not reuse the previous card.
- **Stored destiny JSON** for the result page lives under `plan.generatedDestiny` / `death.generatedDestiny` / `lucky.generatedDestiny` (written via [`flowDestinyState`](../apps/web/src/lib/flowDestinyState.ts), aligned with [`SessionKeys`](../apps/web/src/lib/sessionKeys.ts)).

## SessionStorage keys (browser)

Canonical string literals live in [`apps/web/src/lib/sessionKeys.ts`](../apps/web/src/lib/sessionKeys.ts) (`SessionKeys.home`, `SessionKeys.plan`, `SessionKeys.death`, `SessionKeys.lucky`). Values are stable wire names (not renamed) so existing sessions keep working.

| Key | Purpose |
|-----|---------|
| `session.id` | `SessionKeys.home.sessionId` — growth assignment on home + share viewer bootstrap |
| `plan.sessionId` | Recommend / growth session for draft-a-run |
| `plan.intent` | Selected intent label (step 1) |
| `plan.freeform` | Optional note (step 2) |
| `plan.destinyId` | Latest destiny row id for this draft |
| `plan.seedDestinyId` | Seed class/faction from a prior commit when re-drafting |
| `plan.generatedDestiny` | JSON blob: `{ sessionId, destinyId, output, intentSnapshot?, experimentalLane?, experimentalCandidate? }` |
| `plan.buildIntent` | JSON `BuildIntentSignals` |
| `plan.buildIntent.depth` | `quick` \| `balanced` \| `dialed_in` |
| `plan.buildIntent.powerCurve` | Optional power curve id |
| `death.sessionId` | Release spirit recommend session |
| `death.mood` / `death.nextSignal` | Mood + next-run signal ids |
| `death.detail.zone` / `.cause` / `.level` / `.note` | Optional death context |
| `death.destinyId` / `death.generatedDestiny` | Same shape as `plan.generatedDestiny` |
| `death.buildIntent` (+ `.depth`, `.powerCurve`) | Build journey for spirit release |
| `lucky.sessionId` / `lucky.destinyId` / `lucky.generatedDestiny` / `lucky.buildIntent` (+ aux) | Lucky roll (same generatedDestiny shape) |
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
