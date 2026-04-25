# Route QA matrix

## Home entry routes

- `/` -> `/release-spirit/mood`
- `/` -> `/draft-a-run/intent`
- `/` -> `/lucky-roll/journey`

## Release spirit

- `/release-spirit/mood` -> `/release-spirit/next`
- `/release-spirit/next` -> `/release-spirit/detail`
- `/release-spirit/detail` -> `/release-spirit/journey`
- `/release-spirit/journey` -> `/release-spirit/result`
- `/release-spirit/result` retool -> `/release-spirit/mood`

## Draft a run

- `/draft-a-run/intent` -> `/draft-a-run/freeform`
- `/draft-a-run/freeform` -> `/draft-a-run/journey`
- `/draft-a-run/journey` -> `/draft-a-run/result`
- `/draft-a-run/result` retool -> `/draft-a-run/intent`

## Lucky roll

- `/lucky-roll/journey` -> `/lucky-roll/result`
- `/lucky-roll/result` retool -> `/lucky-roll/journey`

## Commit/build loop

- `/build/commit/:slug` retool -> `/draft-a-run/intent`
- `/build/:destinyId` retool -> `/draft-a-run/intent`

## SessionStorage keys (browser)

| Key / prefix | Flow |
|--------------|------|
| `session.id` | Home + growth UI assignment |
| `death.*` | Release spirit (`death.sessionId`, `death.destinyId`, `death.buildIntent`, `death.buildIntent.depth`, `death.buildIntent.powerCurve`, `death.detail.*`, …) |
| `plan.*` | Draft a run (`plan.sessionId`, `plan.intent`, `plan.freeform`, `plan.destinyId`, `plan.buildIntent*`, `plan.seedDestinyId`, …) |
| `lucky.*` | Lucky roll |
| `wegoagane.memory.v1` | `localStorage` — recommend bias (see `memoryProfile.ts`) |

Clearing rules: entry buttons on **Home** clear stale flow keys when starting a ritual; some intent steps clear downstream keys when restarting.

## API error → user copy (web)

Client throws `label:status:error` (e.g. `journey_commit:404:destiny_not_found`). UI maps via `flowApiErrorHint` / `destinyRecommendErrorHint` in [`apps/web/src/lib/recommendClient.ts`](../apps/web/src/lib/recommendClient.ts). Common API `error` strings:

| `error` | Typical HTTP | Flow |
|---------|----------------|------|
| `invalid_json` / `invalid_input` | 400 | Malformed or schema-failed body |
| `destiny_not_found` | 404 | Journey commit — destiny/session mismatch |
| `no_viable_build` / `no_eligible_archetypes` | 400 | Recommend — filters too tight |
| `recommend_internal_error` | 503 | Recommend — retry client-side (limited) |
| `build_commit_not_found` | 404 | GET commit / memorial on bad slug |

## Validation runs completed

- `apps/web`: `npm run lint` + `npm run test` + `npm run build`
- `packages/api`: `npm run typecheck` + `npm test`
