# wegoagane.com — product & engineering handbook

This folder is the **canonical** design and build specification for wegoagane.com, split from the original single-file handoff for easier navigation and incremental delivery.

**Original monolith (archived):** [wegoagane-handoff-v4-archive.md](../wegoagane-handoff-v4-archive.md)

**Iteration tracker:** [STATUS.md](STATUS.md) — current milestone, gates, MVP content slice, and open decisions.

---

## Reading order

1. [00-vision-scope-personas.md](00-vision-scope-personas.md) — Sections **0–4**: executive decision, Phase 1 scope, goals, positioning, personas  
2. [01-flows-cards-rating.md](01-flows-cards-rating.md) — Sections **5–10**: landing, death/planning flows, causes, rating/refinement, card states  
3. [02-content-truth-ai.md](02-content-truth-ai.md) — Sections **11–13**, **18**, **27**: build tier, variation, truth model, AI routing, content dataset prep  
4. [03-design-share-ritual.md](03-design-share-ritual.md) — Sections **14–16**, **31**: visual system, share architecture, ritual design, non-negotiable principles  
5. [04-engineering-data-ops.md](04-engineering-data-ops.md) — Sections **17**, **19–21**, **26**: stack, data model, recommendation, analytics, implementation order  
6. [05-trust-legal-monetization-roadmap.md](05-trust-legal-monetization-roadmap.md) — Sections **22–25**: safety/privacy, legal/IP, monetization, phase roadmap  
7. [06-risks-open-decisions-checklist.md](06-risks-open-decisions-checklist.md) — Sections **29**, **32–33**: open decisions, risks, pre-launch checklist  
8. [07-reference-hc-mechanics.md](07-reference-hc-mechanics.md) — Section **28**: HC mechanics snapshot (dated)  
9. [08-reference-widget-demos.md](08-reference-widget-demos.md) — Section **30**: widget demo reference  

---

## How we work (incremental delivery)

1. **You** request to move forward on the next milestone.  
2. **We** update [STATUS.md](STATUS.md): mark the previous milestone done (or *Adjusted* with a one-line reason), refresh blockers and criteria.  
3. **We** confirm any open product decisions ([06-risks-open-decisions-checklist.md](06-risks-open-decisions-checklist.md) §29) before UI- or data-locking work.  
4. **We** implement the milestone in code, refine, and test against the Definition of done in STATUS.  
5. Repeat.

Each milestone should leave something **usable and tangible** (not a pile of blocked WIP). Cross-links between files use relative paths; original **“Section N”** references in prose still map to the same numbered headings inside these files.

**CI:** GitHub Actions — **Handbook layout** (docs integrity) + **Web** (`apps/web` lint + build) + **API** (`packages/api` typecheck + migration-drift + **`npm test`**) on push/PR ([04-engineering-data-ops.md](04-engineering-data-ops.md) §17.4). If **`main`** is ruleset-protected, add required checks for **Web** and **API** by exact job name ([GitHub setup — Step 5](../github-setup.md#step-5-day-to-day-after-the-ruleset-exists)).

**GitHub (remote, rulesets, deploy prep):** [../github-setup.md](../github-setup.md) — includes **Step 4** using current **Rules → Rulesets** UI.

**Live site:** **https://wegoagane.com** — Cloudflare Pages from **`main`** ([deploy doc](../deploy-wegoagane-com.md): root **`apps/web`**, output **`dist`**, DNS + custom domains). In-app **M2** card/icon QA: **`/design/cards`**.

**API foundation (live):** `packages/api` — Cloudflare Worker with Hono + Drizzle + D1 on **`wegoagane.com/api/*`**: **`POST /api/v1/recommend`** (deterministic rank → template → optional **OpenRouter** enrichment) and **`POST /api/v1/memorial`** (template-first + optional AI). **M8–M9 shipped:** truthy **`AI_ENABLED`**, defaults **`openrouter/auto`**, response **`aiMeta`** (incl. **`resolvedModelId`**), JSON extraction for fenced model output, `npm run smoke:production`. See [STATUS.md](STATUS.md) and [deploy runbook](../deploy-wegoagane-com.md).

---

*Handbook derived from handoff v4 (April 22, 2026). Section numbers preserved for traceability.*
