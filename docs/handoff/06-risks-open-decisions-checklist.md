# Open decisions, risks & pre-launch checklist

Handbook sections **29**, **32–33** (from handoff v4).

## Viability & dependencies

- Open decisions (§29) are **schedule and rework** risks if deferred too long — triage before M6–M11 in [STATUS.md](STATUS.md).
- §32–33 are operational release gates; keep the checklist visible through beta.

---

## 29. Open decisions (operator preference pending)

1. Exact brand wordmark + typography direction
2. Memorial + Destiny: one combined stacked result (recommended) vs. tabbed pair
3. Tone sharpness in "bullshit death" framing
4. Whether planning mode gets an explicit "this is my first HC character" signal
5. Whether character names are always suggested or always optional
6. Whether first share CTA is combo-first or context-sensitive
7. Tier label treatment: show labels ("Safe / Off the beaten path") vs. drop labels and let description speak
8. Whether to show build acceptance stats on cards (*"87% acceptance rate"*) or keep internal

---

## 32. Risks & mitigations

| Risk | Mitigation |
|---|---|
| AI invents wrong facts | Strict truth model (Section 13), schema validation every output, deterministic ranker |
| Memorial copy reads like AI slop | Hand-authored style anchors in prompt, manual review of first 100 generations |
| Veteran Optimizer bounces on one error | Validator catches faction/level/source errors before display |
| Launch scope slips | Phase 1 boundary enforced; Stable Builder + Chronicle explicitly deferred |
| Cost creep | AI Gateway hard cap, aggressive caching, retrieval before generation |
| Users see repeated results | Local memory, reroll mutation logic, overlay variation, recency avoidance |
| Share cards weak | Treat as core surface not export; mobile-first; test compact layouts pre-launch |
| Tone too dark or theatrical | Planning mode stays clean; memorial language restrained; tone adjusts by state |
| Moderation burden as solo op | User freeform goes into AI prompt as context, not into public output verbatim |
| Runaway AI bill | Hard monthly cap on Gateway; fallback to templates on cap breach |
| Browser Rendering latency blocks UX | Async generation; show React card instantly, swap share URL when image ready |

---

## 33. Pre-launch personal checklist (solo operator, practical)

Things that will embarrass the product if skipped:

- [ ] Every archetype's First 10 Levels list reviewed by an actual HC player (not the AI, not you alone)
- [ ] 50 sample epitaphs generated and manually reviewed — adjust prompt toward the good ones
- [ ] 20 end-to-end death flow tests on a phone, each with different inputs
- [ ] Validator coverage tested — deliberately try to produce Horde Paladin, Mortal Strike at 20, made-up items — confirm rejection + fallback
- [ ] Share-card rendering tested at 320px width (smallest common phone)
- [ ] Monthly AI cap set and alert tested
- [ ] "Lucky Roll" tested 30 times — distribution looks varied, no build dominates
- [ ] Memorial copy for a silly level-3 drowning death does not read like a eulogy for a fallen hero
- [ ] Memorial copy for a level-59 bullshit patrol death does not read like "whoops lol"
- [ ] One real HC player completes the full flow on their phone while being observed
- [ ] Domain has HTTPS, OG tags render correctly in Discord/Twitter previews

---

## 34. M14–M18 trust/ceremony quality gates

Use these as hard gates before marking each milestone complete.

### M14 gate — trust content expansion

- [ ] Every newly added archetype passes a review rubric:
  - [ ] class/faction/spec mechanics are correct
  - [ ] First 10 Levels advice is actionable and HC-safe
  - [ ] source tags exist for key claims
  - [ ] memorial/destiny text is specific (not generic filler)
- [ ] Validation failure rate does not regress above baseline + agreed margin.
- [ ] Reroll rate on top intents does not spike after content merge.
- [ ] AI-generated archetype drafts were produced through versioned prompt packs and diff-reviewed before promotion.

### M15 gate — ceremony language hardening

- [ ] Visible placeholder/dev/stub language removed from user-facing core flow screens.
- [ ] Copy corridor pass complete for death/planning/reroll/post-accept/share.
- [ ] “Subtle memory” posture preserved (no creepy explicit pattern-learning copy).
- [ ] At least one HC player review round confirms tone quality.
- [ ] Ceremony copy rewrites use prompt pack + banned-phrases lint pass (no generic AI-sounding filler).

### M16 gate — share artifact polish

- [ ] Share image readability verified at 320px and common social preview crops.
- [ ] `/share/:runId` UX communicates queued/rendering/ready/failed states clearly.
- [ ] Share action path is obvious and one-tap from ready state.
- [ ] OG/Twitter tags verified on production URL samples.
- [ ] Share-asset generations were screened for brand/style consistency and legal-risk flags before publish.

### M17 gate — modern web hardening

- [ ] Critical interactive controls expose accessible semantics/states (keyboard + SR).
- [ ] Contrast and text hierarchy pass minimum readability standards on mobile.
- [ ] Loading/error states are explicit; fallback behavior is user-comprehensible.
- [ ] Polling/retry paths have bounded behavior and clear failure messaging.

### M18 gate — UAT go/no-go

- [ ] UAT matrix complete (flows + devices + failure modes) with evidence log.
- [ ] Bug burn-down resolved for all release-blocking defects.
- [ ] KPI go/no-go thresholds met:
  - [ ] accept rate floor
  - [ ] rerolls/session ceiling
  - [ ] share completion floor
  - [ ] validation failure ceiling
- [ ] Final decision recorded as go/no-go with owner + date.
- [ ] UAT evidence sheet includes test count, fail count, defect IDs, and owner signoff.

---

## 35. AI prompt-pack governance (solo execution)

Keep prompt-driven generation fast without losing trust quality.

- [ ] Maintain versioned prompt packs for:
  - [ ] archetype draft generation
  - [ ] ceremony/copy corridor rewrites
  - [ ] share-asset generation prompts
- [ ] Every generated batch stores:
  - [ ] prompt pack version
  - [ ] model used
  - [ ] generation timestamp
- [ ] Promotion checklist before merge:
  - [ ] rubric pass (mechanics/tone/specificity)
  - [ ] duplication/style lint pass
  - [ ] human spot review
- [ ] Fast rollback path exists for bad generated batches.

---

## 36. Asset + scraping legal-risk matrix (operational)

| Area | Allowed | Caution | Avoid |
|---|---|---|---|
| Game-adjacent visuals | Original/licensed/generated assets with clear commercial terms | Style reference that could be confused with protected asset sets | Direct copy/redistribution of protected game assets |
| Screenshots | Fan-policy-compatible use with required notices | Commercial use where policy scope is unclear | Use outside policy or without required notices |
| Web data ingestion | Public factual data for internal ranking/analysis | ToS-sensitive crawling requiring case-by-case review | Auth/paywall bypass, protected creative republishing, aggressive crawling |

Operational safeguards:
- [ ] robots.txt + ToS review logged before ingestion jobs run
- [ ] conservative rate limit/backoff defaults set
- [ ] no protected creative content republished from scraped sources
- [ ] high-risk sources require explicit manual approval before use

---

