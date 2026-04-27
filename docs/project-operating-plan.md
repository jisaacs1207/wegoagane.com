# wegoagane Project Operating Plan (Growth-first, AI-first)

This is the active operating plan for rapid growth in a hardcore niche while preserving trust.

This plan assumes:

- high experiment velocity
- aggressive AI usage with strong safety rails
- user-driven correction and cultivation loops
- low-maintenance operations through automation

Core doctrine: **AI is the engine**. Templates are not static product truth; they are evolving artifacts distilled from generated outcomes and corrected by user behavior over time.

Keep `docs/handoff/STATUS.md` as the execution log and this file as strategy.

---

## 1) Planning committee synthesis

This section captures the decisions as if made by a cross-functional committee.

### Product manager lens

- We are not just a recommendation tool; we are a layer in the player's hardcore cycle.
- The product must reduce cycle friction: plan -> run -> death/retool -> recommit -> share.
- Every release must produce a measurable change in behavior, not just UI changes.

### Growth lead lens

- Prioritize loops that compound: reroll feedback, commit outcomes, and share artifacts.
- Optimize for networked discovery through streamer and guild workflows.
- Keep a high risk appetite by running many bounded experiments with clear stop rules.

### Systems lead lens

- AI should handle most synthesis work; deterministic systems enforce boundaries.
- Manual tuning should be the exception; automation should carry lifecycle ops.
- Instrument every critical edge so experiments can be promoted or retired quickly.

### Documentation architect lens

- One source for strategy (`project-operating-plan.md`), one source for execution (`STATUS.md`), one source for route truth (`route-qa-matrix.md`).
- Docs must mirror live behavior after each release wave, not at quarter-end.

---

## 2) Strategic position

## We become part of the HC play system

Target state:

- Players use wegoagane before runs, after deaths, and during rebuild decisions.
- Streamers use it live as a transparent planning and post-death correction layer.
- Guilds use shared build URLs and memorial loops as collective knowledge objects.

Product thesis:

- If we minimize friction and maximize corrective signal quality, we win both trust and growth.

---

## 3) Game theory model (updated)

The game is multi-sided:

- **Player:** wants low-friction, high-confidence recommendations.
- **Audience/stream community:** rewards visible adaptation and teachable outcomes.
- **System:** wants high-quality correction signals to improve global output.

Design rules:

1. Keep reporting cost near zero (single reroll action + optional note).
2. Reward durable outcomes heavily (accept + commit + low reroll severity).
3. Penalize weak candidates quickly (totally_off + low follow-through).
4. Show enough rationale to earn trust without adding decision burden.
5. Let advanced users add detail, never force it on speed users.

Operating objective: optimize *trust-adjusted learning velocity*.

---

## 4) AI-forward automation doctrine

## Default operating mode

- AI handles synthesis, copy adaptation, and freeform parsing.
- Deterministic layers enforce viability and safety constraints.
- Experimental candidates flow directly into normal cycles with explicit labeling.
- Generated outputs are the primary source of evolution; templates are progressively hardened from validated generated patterns.

## Progressive reliance model

1. Start generation-heavy with bounded safety.
2. Observe correction signals and durable outcomes.
3. Promote repeated winners into hardened template strata.
4. Continue regenerating around winners; demote stale templates.

Result: intelligent shift from raw generation to stable, high-confidence guidance without freezing innovation.

## Low-maintenance principle

- Every manual review step must justify itself against automated alternatives.
- Promote/hold/retire logic should run by policy thresholds first, operator override second.
- Health, quality, and rollout state must be queryable from endpoints.

## High-risk appetite with bounded downside

- Run more experiments in parallel, each with strict auto-stop criteria.
- Prefer reversible changes and confidence-tier gates over slow consensus release cycles.

---

## 5) Core growth loops

## Loop A: Recommendation -> reroll correction -> improved recommendation

- Reroll verdicts and notes train both player-specific and global behavior.
- Objective: reduce `totally_off` and shorten time-to-usable-result.

## Loop B: Recommendation -> commit URL -> share/view -> new sessions

- Build URL becomes the viral object.
- Objective: improve share-to-new-session conversion.

## Loop C: Death/memorial -> retool -> recommit

- Turn failure into retention by making recovery immediate and meaningful.
- Objective: increase post-death recommit rate.

## Loop D: Streamer usage -> audience replication -> group correction

- Stream workflows produce visible, repeated correction behavior.
- Objective: grow streamer-origin traffic and audience replay sessions.

---

## 6) Metrics (north stars, growth, guardrails)

## North stars

- Trust-adjusted throughput (accepted or committed builds per active session)
- Time-to-first-usable-result
- Repeat weekly active players

## Growth metrics

- Share/build URL creation rate
- Share-to-new-session conversion
- Streamer-tagged session growth (when tracking is available)

## Learning quality metrics

- Reroll severity mix (`close_but_off` vs `totally_off`)
- Experimental promotion precision and retirement lag
- Candidate confidence-tier distribution

## Guardrails

- Validation failures
- AI fallback/error rate
- latency p95 for recommend/reroll
- no-viable-filter incidence

---

## 7) Next-wave roadmap (incremental, tangible)

## Wave A — Signal quality + trust instrumentation (5-7 days)

Deliverables:

- Candidate threshold policy (promote/hold/retire) encoded and visible.
- Result-page "why this build" trust block (short, consistent, low-noise).
- Per-flow quality snapshots in analytics health (`death`, `plan`, `lucky`).

Exit:

- `totally_off` rerolls trend down vs trailing baseline.
- Experimental lane does not underperform curated trust floor.

## Wave B — Automation-first lifecycle ops (5-7 days)

Deliverables:

- Auto lifecycle policy execution with confidence tiers.
- Weekly auto summary artifact (top promotes, risky live candidates, retire candidates).
- Auto alerts for guardrail breaches.

Exit:

- Fewer manual intervention hours per week.
- Faster promote/retire cycle time.

## Wave C — Viral and creator surfaces (7-10 days)

Deliverables:

- Streamer mode share affordances (on-screen build rationale snippets + replay links).
- Audience-friendly "run evolution" timeline from rerolls/commits.
- Guild-cycle entry points (shared retool queues / reference links).

Exit:

- Higher share-to-session conversion.
- Measurable growth in creator-origin sessions.

## Wave D — Persona-adaptive orchestration (5-7 days)

Deliverables:

- Session persona inference (speedrunner / optimizer / explorer / creator).
- Adaptive defaults for setup depth and explanation density.
- Dynamic onboarding copy by inferred intent.

Exit:

- Faster speedrunner flow completion.
- Higher optimizer commit conversion.

---

## 8) Execution contract (no-drift)

For each wave:

1. Set 7-day baseline.
2. Ship one thin vertical slice in 1-2 days.
3. Soak for 3-5 days under live traffic.
4. Apply keep/adjust/rollback decision.
5. Log outcomes in `docs/handoff/STATUS.md`.

If a change does not move a tracked metric, it is not a finished wave.

---

## 9) Immediate backlog (ordered)

1. Encode lifecycle threshold policy for candidates.
2. Add concise trust explanation block to all result pages.
3. Ship automated weekly quality summary.
4. Improve freeform reroll parser with confidence/fallback taxonomy.
5. Prototype streamer-centric share payload and replay link format.
6. Define persona inference signal set and adaptive defaults.

---

## 10) Decision rights (small team, fast growth)

- Product owner: chooses target metric and acceptable downside per wave.
- Engineering owner: chooses implementation path within guardrails.
- Growth owner: chooses experiment mix and stop rules.
- Docs owner: keeps strategy/execution docs synchronized post-wave.

Rule: no release without a metric hypothesis and rollback condition.

---

## 11) Autonomous "set-and-forget" architecture

Target: the system improves itself with minimal operator touch while users perceive value, not machinery.

### Self-correct

- Use feedback events (`accept`, `almost_right`, `miss`, commit, reroll verdict) as primary correction substrate.
- Run candidate lifecycle automation hourly/daily:
  - auto-promote when confidence + quality thresholds are met
  - auto-hold when uncertain
  - auto-retire on sustained poor severity-weighted outcomes
- Add anomaly detection on critical guardrails (latency/error/validation) with automatic lane dampening.

### Self-grow

- Auto-generate candidate variants from high-performing archetype families.
- Auto-suggest prompt supplements from winning and failing patterns.
- Auto-expand content density where users repeatedly ask similar freeform constraints.

### Self-heal

- If AI lane health degrades, automatically reduce offer percent and prefer curated fallback.
- If a class cluster underperforms, throttle exposure and trigger targeted regeneration.
- If parser confidence drops on freeform notes, fallback to safer coarse taxonomy and continue collecting data.

---

## 12) Crowd-sourced cultivation and correction loop

Users should grow the system while feeling like they are simply playing.

### Low-friction capture

- Keep one-click reroll verdicts and optional note input.
- Keep accept/commit actions primary and effortless.
- Convert freeform notes into structured signals with confidence scores.

### Community-weighted learning

- Weight correction signals by outcome quality and sample size.
- Build reliability profiles for repeated users/segments (without exposing complexity in UI).
- Use stream/guild cohort behavior to prioritize candidate review and generation.

### Anti-noise policy

- Downweight contradictory low-confidence signals.
- Require multi-session consistency before major policy shifts.
- Prevent rapid thrashing with confidence hysteresis.

---

## 13) Deep build catalog spec (beyond vague archetypes)

We must ship operationally useful builds, not inspirational blurbs.

Each build profile should include:

- **Level-band plan:** `1-10`, `11-20`, `21-30`, `31-40`, `41-50`, `51-60`
- **Talent progression path:** explicit point order with safe alternatives
- **Power spike map:** levels/items/talents that change survivability or speed
- **Play pattern guide:** opener, standard pull, danger protocol, escape protocol
- **Itemization priorities:** stats by level band, weapon cadence, must-upgrade slots
- **Profession and consumable plan:** safety-first recommendations and breakpoints
- **Death-risk heuristics:** known wipe patterns, cave/dungeon thresholds, overpull warnings
- **Route strategy:** zone pacing, when to grind greens, when to skip risk
- **Branching variants:** conservative / balanced / aggressive paths by player profile

Data requirement: every template stores normalized structured fields first, then narrative rendering.

---

## 14) Post-commit command center (always-open companion)

Goal: make `/build/commit/:slug` valuable enough to keep open while playing.

### Shipped baseline (partial, 2026-04)

- **Live plan polling** on the commit page (`GET /api/v1/build/:destinyId`) until `ready` / `failed`.
- **Second AI pass** on the worker (after the main build JSON validates) that can populate **`talents.levelByLevel`** (Classic rule: 51 points from level 10 through 60) plus **`talents.buildIntentSummary`**; the web **TalentLevelPathView** reads that rail and falls back to **`talents.path`** when the second pass is absent or rejected.

### Must-have panels

- Next 3 level goals and near-term checklist
- Talent next points and "if unsure, pick this" fallback
- Power spikes timeline (upcoming)
- Itemization and upgrade watchlist by slot
- Rotation/playstyle reminders by context (solo, elite, panic)
- "How to not die on this build" protocol list
- Zone/risk guidance for current level range

### Adaptive behavior

- Update guidance from memorial/reroll/feedback history.
- Highlight adjustments after each correction event.
- Offer "safe mode" toggle that automatically biases conservative decisions.

### Retention hooks

- Session revisit prompts ("you are approaching level-band pivot").
- Quick log buttons for "felt weak here" / "died to X" to improve future guidance.

---

## 15) Dual-surface template model (public + personal)

We support two parallel surfaces from one build intelligence core.

## Surface A — Guest indexed template pages (SEO + acquisition)

Purpose: attract players through search and convert them into active generators/committers.

Characteristics:

- Public, indexable build pages with high-content depth.
- Multiple entry pathways:
  - "Start generating from this style"
  - "Adopt and commit this build now"
- Clear CTAs into core product loops:
  - generate fresh
  - commit personalized variant
  - open full refinement workflow

Conversion design:

- Use public pages as launch pads into individualized sessions.
- Keep public content authoritative but non-final; invite adaptation.

## Surface B — Individual player report (private-by-default, shareable permalink)

Purpose: be the player's living companion during play and archive outcomes.

Characteristics:

- Highly granular and personalized based on user selections, rerolls, and outcomes.
- Rich post-commit command center with tactical guidance.
- On death report submission:
  - report state is locked (immutable historical artifact)
  - permalink remains accessible for sharing/reference
  - death report page is eligible for web discovery per policy

Lifecycle:

- Active build report -> iterative refinement -> death lock/archive -> shareable artifact -> discovery loop back to acquisition.

---

## 16) SEO and discoverability autopilot

Growth should not depend on manual content publishing.

- Auto-generate static/public pages from validated build templates:
  - class x level-band x safety profile
  - build timeline pages with structured metadata
- Use schema markup and internal linking from build pages to commit/share artifacts.
- Auto-refresh pages when template confidence tier changes.
- Gate indexability to confidence thresholds to prevent low-quality SEO bleed.
- Index policy by surface:
  - Surface A: indexed by default once confidence threshold met.
  - Surface B: indexed only after explicit lock/archive states (death report or equivalent), with privacy-safe redaction rules.

---

## 17) Community signal scan (Reddit + WoW forums) summary

The latest scan aligns on practical expectations:

- Players want explicit talent order, weapon cadence, and level-band pivots.
- Survival-first guidance beats pure DPS optimization in Hardcore context.
- "Always have an out" and known-risk surfaces (caves/dungeons/respawns) are recurring themes.
- Many players already rely on second-screen addons/guides; an always-open build companion matches existing behavior.
- Players accept experimentation if defaults are safe and failures are quickly corrected.

Representative sources scanned:

- Blizzard forums Hardcore leveling thread: `20 Tips for HC Levelling`
- Reddit talent-build discussion: `r/classicwowtbc` Prot/Ret leveling thread
- Class-leveling guide ecosystems (hcguides and related HC guide sites) for depth expectations

---

## 18) 30-60 day incremental delivery plan (committee-approved)

### Days 1-10: Foundation for autonomy

- Encode lifecycle thresholds and confidence tiers.
- Add per-flow quality and severity dashboards.
- Ship trust explanation block on all result pages.
- Define dual-surface information architecture and index policy contract.

### Days 11-25: Build-depth expansion

- Implement structured build-profile schema for level bands, talents, power spikes, itemization.
- Generate deep profiles for first class cluster and deploy post-commit command center v1.
- Add "safe mode" and panic protocol rendering.
- Ship Surface A page templates + CTA routing into generation/commit flows.

### Days 26-40: Viral + creator fit

- Launch companion-facing share/replay enhancements for stream workflows.
- Add audience-friendly run-evolution snapshots.
- Introduce cohort-level adaptation reports.
- Ship Surface B lock-on-death lifecycle and permalink sharing UX.

### Days 41-60: Full autopilot hardening

- Turn on SEO autopilot for confidence-qualified templates.
- Enable automatic lane dampening + recovery policies.
- Reduce operator intervention to policy updates and periodic review only.
- Enable selective indexing for locked player report artifacts with quality/privacy gates.

Success condition: week-over-week growth with stable guardrails and declining manual ops time.

