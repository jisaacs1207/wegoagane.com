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

## Validation runs completed

- `apps/web`: `npm run lint` + `npm run build`
- `packages/api`: `npm run typecheck` + `npm test`
