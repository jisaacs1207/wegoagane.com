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

