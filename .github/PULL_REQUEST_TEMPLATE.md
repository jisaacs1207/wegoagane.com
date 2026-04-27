## Summary

<!-- What changed and why (1–3 short sentences). -->

## Change type

<!-- Check all that apply. -->

- [ ] Documentation only (`docs/`, handbook, setup guides)
- [ ] CI / automation (`.github/`, scripts that affect checks)
- [ ] Content / data (archetypes, fixtures, validators — when they exist)
- [ ] App / UI (React, styles, routing — when they exist)
- [ ] Infra / config (Wrangler, env examples, deployment)

## Handoff & process

<!-- For anything that affects product behavior or milestones, tie it to the handbook. -->

- [ ] N/A — mechanical / typo / dependency bump only
- [ ] Relevant handbook section(s) updated (under [`docs/handoff/`](../docs/handoff/README.md)) or **explain below** why the handoff does not need a doc change yet
- [ ] If this PR completes a milestone, [`docs/handoff/STATUS.md`](../docs/handoff/STATUS.md) will be updated in this PR or a fast-follow (say which)

**Handbook / STATUS notes (optional):**

<!-- Links or section numbers, e.g. "§26 — implementation order". -->

## CI & branch rules (Profile B)

<!-- `main` is merge-only; checks must pass before merge. -->

- [ ] I expect **CI** to be green on this PR (or I’ve noted why it’s intentionally draft / failing below)
- [ ] If I added or renamed a **required** workflow job (`name:` in [`.github/workflows/ci.yml`](workflows/ci.yml)), I will add that job to the branch ruleset **`wegoagane-main-ci`** after this PR (or used [`scripts/ruleset_add_required_check.py`](../scripts/ruleset_add_required_check.py)) — see [`docs/github-setup.md`](../docs/github-setup.md) (“Profile B + new CI jobs”)

<!-- If a new check is required, paste the reminder line for reviewers: -->
<!--
RULESET: add required check `Exact Job Name`
-->

## Testing

<!-- How you verified it; delete sections that don’t apply. -->

**Docs / CI**

- [ ] N/A or: read-through / `npm` scripts as applicable

**App (when applicable)**

- [ ] `npm run lint` / `npm run test` / `npm run build` (list what you ran)
- [ ] Smoke-tested in browser (note viewport if UI: e.g. 375px width)

## Screenshots / references

<!-- Optional: before/after, Figma, Discord context, issue link. -->

## Risks & rollout

<!-- Anything deploy-sensitive, feature flags, or follow-ups. -->

None / see below:

<!-- --- -->

<!-- **Reviewer:** default branch is PR-only; merge when checks are green. -->
