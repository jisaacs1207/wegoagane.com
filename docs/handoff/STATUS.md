# Build status & iteration contract

**Last updated:** 2026-04-22 (docs; see changelog at bottom of this file)

---

## Workflow (current)

| Field | Value |
|--------|--------|
| **Current milestone** | **M1 (in PR)** — usable Vite SPA + deploy doc; merge `feat/m1-spa-usable` → `main` then connect Pages |
| **Blocked by** | — |
| **Last build iteration** | `apps/web` — landing, Release Spirit (4 steps), Draft a Run (3), Lucky Roll, share stub; CI job **Web**; [deploy-wegoagane-com.md](../deploy-wegoagane-com.md) |
| **Next “request to move forward” criteria** | Merge PR → add ruleset required check **`Web`** (see PR body) → Cloudflare Pages per [deploy doc](../deploy-wegoagane-com.md) → **M2** icons + card shells ([04-engineering-data-ops.md](04-engineering-data-ops.md) §26). |

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
| **M1** | App shell + routing | **Shipped (this PR):** `apps/web` Vite SPA — `/`, `/release-spirit/*`, `/draft-a-run/*`, `/lucky-roll`, `/share/:runId`; CI job **Web** (`lint` + `build`); [deploy-wegoagane-com.md](../deploy-wegoagane-com.md) for **wegoagane.com** | M0 | Wordmark/typography (29.1) partial OK with tokens |
| **M2** | Icons + card UI shell | Original SVG icon set; Memorial / Destiny / share-layout components render static fixtures | M1 | Tier labels vs prose-only (29.7) |
| **M3** | Archetype schema + fixture JSON | Schema + **small** MVP archetype set in repo; loads in app | M0 | **MVP archetype count** |
| **M4** | **Output validator** | Validator runs on fixture + rejects bad outputs; no generator without it | M3 | — |
| **M5** | Deterministic ranker | Tag overlap / weighted ranker picks archetype from signals; explainable in plain English | M3–M4 | — |
| **M6** | Template-only Destiny pipeline | Rank → template render → validate → show card (no AI) | M4–M5 | Combined vs tabbed result (29.2); share CTA (29.6) |
| **M7** | Workers + D1 + session persistence | API persists session, questions, destinies per [04-engineering-data-ops.md](04-engineering-data-ops.md) §19 | M6 | — |
| **M8** | AI Gateway + presentation layer | Tier A/B behind gateway; AI never inventing structured facts | M6–M7 | Model IDs pinned in code/config (tiers in §18) |
| **M9** | Memorial pipeline | Epitaph + post-mortem with validation + fallbacks | M8 | Name suggest vs optional (29.5); tone “bullshit death” (29.3) |
| **M10** | Refinement + rating gate | Reroll reasons, “almost right,” post-accept rating | M6–M9 | — |
| **M11** | Share images + OG | Browser Rendering → R2; async UX; Discord/Twitter preview | M2, M7 | — |
| **M12** | Analytics + observability | PostHog events per §21; validation_failed + cost alerts | M7+ | Acceptance stats on cards? (29.8) |
| **M13** | Local memory + polish | localStorage biases; content iteration | M10–M12 | Planning “first HC” signal (29.4) |

**Test notes (recurring):** phone-first flows; “just generate” death path; validator abuse cases ([06-risks-open-decisions-checklist.md](06-risks-open-decisions-checklist.md) §33); 320px share width; Lucky Roll distribution.

---

## Review gates (before first code milestone)

Complete these with the operator before treating **M1** as unlocked:

1. **§29 — Open decisions:** Record choices in [06-risks-open-decisions-checklist.md](06-risks-open-decisions-checklist.md) (or append an `ADR-*.md` in this folder if you prefer short decision logs). Minimum before heavy UI: **29.2** (combined vs tabbed), **29.6** (share CTA), **29.7** (tier labels).  
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

When done, set **Current milestone** to M1 and clear **Blocked by**.

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
