# Trust, legal, monetization & roadmap

Handbook sections **22–25** (from handoff v4).

## Viability & dependencies

- Legal/trust posture (§22–24) is proportionate for a fan tool; stay consistent with no Blizzard assets and no trademark claims.
- Resolve **§29** UI-affecting items before locking major product surfaces ([06-risks-open-decisions-checklist.md](06-risks-open-decisions-checklist.md)).

---

## 22. Safety, privacy & trust

### 22.1 Trust rules
- No creepy messaging about user behavior ("you always die to…")
- No manipulative upsells
- No overclaiming AI understanding
- No pretending uncertain facts are certain

### 22.2 Privacy
- No accounts required at launch
- Lightweight explanation of local-memory use
- Server-side analytics pseudonymous (session UUID, no identifying info)
- Freeform text never logged with session identifier in training-ready form

### 22.3 Abuse guardrails
- Profanity filter on user-generated memorial notes (light touch — allow swearing that fits HC culture, block slurs)
- Prompt injection detection on freeform fields
- Short field limits (80 char freeform, 32 char character name)
- Simple sanitization on all freeform input

### Senior-dev note on moderation
You're operating solo. You won't be online to moderate memorial text 24/7. Either never show user-authored text on public share pages (render it as the epitaph only after AI transformation), or accept that some memorials will have slurs in them briefly and prepare a simple takedown path. Safer path at launch: user freeform text goes into the AI prompt as context, not into the final output verbatim.

---

## 23. Legal & IP

### 23.1 Visual assets
- Original SVG icons only
- No Blizzard files, no tracing, no recolored official art
- Class colors (canonical hex) safe — community-documented 20+ years

### 23.2 Data references
- Classic item names: factual — safe
- Talent names + mechanics: documented game data — safe
- Zone / mob names: factual — safe
- Quest text: paraphrase only, never quote

### 23.3 Naming
- Domain (wegoagane.com) clean of WoW trademark — good
- No Blizzard trademarks in branding or interface

### 23.4 Blizzard API rule
If any feature uses Blizzard Developer APIs, it must remain free to users per Blizzard's Developer API Terms. No paywalling API-derived data.

### 23.5 Deathlog data
- Deathlog is in-game Lua addon with 1M+ death records
- Lua file freely licensed — historical data can be imported once
- No public web API
- `hc.aotc.gg` armory private (403)
- Blizzard Battle.net API: can confirm death via 404 on character query, no zone/cause

### Senior-dev note on legal
Blizzard has not sued fan sites in 20 years of Classic-era community tooling, but their policy exists. Stay below the radar: no trademark in domain, no asset use, no paywalling API data, no "affiliated with Blizzard" language anywhere. You're fine.

---

## 24. Monetization & trust

### 24.1 Principle
Self-sustaining operation without breaking trust.

### 24.2 Phase 1 goal
**Lower cost before maximizing revenue.** Don't ship monetization at launch.

### 24.3 Recommended order
- **Phase 1:** voluntary support link (Buy Me a Coffee equivalent), unobtrusive
- **Phase 2:** tasteful creator/guild utilities (branded memorials for Discord servers, premium exports IF core remains free)
- **Phase 3:** carefully matched sponsorships (HC-relevant only, editorial control)

### 24.4 Non-recommendations (don't do these)
- Boosting / carry affiliates
- Paywalled recommendations
- Premium builds
- Intrusive ads
- Manipulative email capture
- Newsletter gates on share

Trust-damaging, culturally misaligned.

---

## 25. Phase plan

### 25.1 Phase 1 (launch)
- Landing page (3 entry options)
- Death flow
- Planning flow
- Lucky Roll
- Memorial generation
- Destiny generation
- Reroll + refinement with rating gate
- Share-card generation (memorial / destiny / combo)
- Local memory
- Analytics + LLM observability
- 36 structured archetypes

### 25.2 Phase 2 (only if Phase 1 validates)
- Stable Builder
- Lightweight run tracking (Chronicle card)
- Public or personal history page
- Expanded build detail (full 51-point talent walkthroughs)
- Creator / guild utility features

### 25.3 Phase 3
- Addon-assisted sync
- Full Chronicle timeline
- Victory rituals (full flow)
- Richer social + archive surfaces

---

