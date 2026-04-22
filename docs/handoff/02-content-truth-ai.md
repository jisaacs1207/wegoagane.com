# Content, truth model & AI

Handbook sections **11–13**, **18**, **27** (from handoff v4).

## Viability & dependencies

- **Highest trust / embarrassment risk:** wrong skills, items, or faction-class pairs. Mitigation: build the **validator before the generator** ([04-engineering-data-ops.md](04-engineering-data-ops.md) §26 items 4–5).
- Schedule risk is **content volume** (§27). Use an MVP archetype slice ([STATUS.md](STATUS.md)) while growing toward 36 archetypes.
- §18 model names are **tier intent**; pin exact provider model IDs in implementation config.

---

## 11. Build tier & naming

Internal taxonomy was originally jargon. Replaced with natural phrasing.

| Internal key | User-facing label | Description |
|---|---|---|
| `safe` | **Safe** | Best-documented survival path. Guide-supported. Fastest to 60. |
| `off_beaten` | **Off the beaten path** | Most guides skip this. It works — requires more knowledge. |
| `high_risk` | **High risk, high story** | Has been done. High skill ceiling. The danger is the feature. |
| `just_fun` | **Just fun** | Fun-per-hour maximized. Still viable. Might be weird. |

Alternative under consideration: drop labels entirely, let description speak. Card reads *"Most guides skip this. It works."* without a tier name. Open decision — Section 29.

---

## 12. Variation system

Users don't need infinite builds. They need meaningful variation.

### 12.1 Content model — 36 structured archetypes
9 classes × up to 4 philosophies. Each includes:
- Canonical class/spec identity
- Pacing profile
- Danger profile
- Mechanical complexity
- Profession fit
- Social value
- Solo value
- Safety mechanism
- Recommended playstyle overlays
- Structured rationale tags
- Content blocks for talent + item summaries

### 12.2 Variation from overlays, not more archetypes
Overlays multiply the 36 into many feeling-different outputs:
- Profession pair variation
- Playstyle mode variation (Section 12.5)
- Social context variation (solo / duo / group-focused)
- Memorial-informed variation (died to patrols → bias toward escape tools)
- Tone variation (wrathful → sharper copy)
- Constraint variation (no pet, self-found, etc.)
- Reroll mutation variation

### 12.3 AI novelty bounds (strict)
AI may vary: framing, naming, rationale, emphasis, profession choice within bounds, overlay pairing within bounds.

AI may NOT freely invent:
- Mechanically unsupported builds
- Wrong faction/class availability (Alliance Shaman, Horde Paladin pre-TBC — instant rejection)
- Incorrect item sources presented as facts
- Unsafe advice presented as safe
- Skills above the level they're actually available

### 12.4 Full class build variance

**Mage:** Frost kite (Safe) · Fire aggressive (Off-beaten) · Frost AoE grinder (High risk) · Arcane Missiles + wand patient (Just fun)

**Hunter:** BM pet-tank (Safe) · MM kite (Off-beaten) · Survival trap focus (High risk) · Melee-skew Survival (Just fun)

**Warlock:** Affliction drain-tank (Safe) · Demonology Voidwalker (Off-beaten) · Destruction burst (High risk) · Imp-only no-swap (Just fun)

**Priest:** Shadow Spirit Tap (Safe) · Disc wand-only (Off-beaten) · Holy offensive Smite (High risk) · Heal-focused group-only (Just fun)

**Druid:** Feral Cat (Safe) · Bear tank leveling (Off-beaten) · Balance kite (High risk) · Resto never-die (Just fun)

**Paladin (Alliance only):** Retribution (Safe) · Holy wand + Consecration (Off-beaten) · Shockadin spell-damage (High risk) · Full Protection slow-kill (Just fun)

**Warrior:** Arms 2H (Safe) · Fury dual-wield (Off-beaten) · Protection green-mobs-only (High risk) · Berserker aggressive Fury (Just fun)

**Rogue:** Combat Swords (Safe) · Subtlety Prep double-Vanish (Off-beaten) · Assassination poisons (High risk) · Ambush-only stealth reset (Just fun)

**Shaman (Horde only):** Enhancement Windfury (Safe) · Elemental burst (Off-beaten) · Warden 1H+shield Enhance (Off-beaten alt) · Resto totem-passive (High risk)

### 12.5 Playstyle modes (optional overlay)
1. **The Stable Method** — run 3-5 chars, rotate when rested
2. **Rested Only** — only play with rested XP
3. **Dungeon Pilgrim** — XP primarily from dungeons
4. **The Purist / Iron Man** — white/grey gear, no talents, no consumables, no AH
5. **The Wanderer** — no route, no guide, exploration
6. **The Social Contract** — duo/trio shared fate
7. **The Pacifist** — gathering + quest XP only (High risk tier only)
8. **Deathwish / Glass Cannon** — max damage, accept fragility

### 12.6 Goal taxonomy — underserved HC niches
Most guides over-cover Engineering / Alchemy / First Aid. Underserved goals the site emphasizes:

- **Fishing + Cooking system** — Oily Blackmouth at 30 (underwater breathing), Deviate Fish Well Fed from 10, Sagefish for Strong Troll's Blood
- **Enchanting as wand factory** — self-crafted wand progression 5-30, reduces vulnerable caster phase
- **Tailoring for bag independence** — 4→6→8→10 slot Mooncloth progression
- **Leatherworking Tribal specialization** — BiS for Feral Druid, Salt Shaker cooldown craft
- **Mining for Sharpening Stones** — free weapon damage buffs from level 1
- **Skinning for early gold** — 2-3x raw mob gold in levels 10-30, zero investment
- **Enchanting + Tailoring self-sufficiency loop** — craft → DE → enchant own gear

When user selects "Profession-first" intent, offer these as first-class goal options.

### Senior-dev / HC-player note on build variance
Some of these "Just fun" builds exist because the community has done them *once*, on stream, and it was memorable. That is enough for "Just fun" tier if the mechanics work. Not enough for "Safe." Label honestly. Every build in the dataset needs a linked example of someone who completed it (guide link, stream VOD, Reddit post) — this goes in the build's metadata and is NOT surfaced to users, but exists as our proof-of-viability backstop if anyone challenges a recommendation.

---

## 13. Truth model (structured vs AI — enforced)

The most important architectural rule in this doc. Violate it and users lose trust instantly.

### 13.1 Structured (always from JSON/DB, never AI-invented)
- Class availability by faction (Horde / Alliance)
- Archetype definitions (36 base builds)
- Build risk labels
- Profession compatibility
- Talent path skeletons (actual spec distribution + prerequisites)
- Talent availability by level (tier unlocks at 10/15/20/25/...)
- Skill availability by class + level + source (trainer/talent/quest)
- Item recommendations + sources + slot + stats
- Safety mechanism facts (Frost Nova CD, Blink range, etc.)
- Playstyle overlays and allowed pairings
- Death cause buckets
- Zone level ranges and common hazards
- Question taxonomy

### 13.2 AI-generated at launch (creative, player-specific)
- Character names (3 options with brief lore meanings)
- Archetype titles (*"The Glacial Architect"*)
- Epitaphs (zone + cause specific)
- Short post-mortem lines
- "Why this fits you" paragraphs
- Refinement mutations within constraints
- Tone adjustments by user emotional state

### 13.3 Hybrid (structured facts, AI presentation)
- Talent progression summaries
- Profession explanations
- Quick-start notes (including First 10 Levels copy)
- Why-not-X comparisons
- Addon recommendations
- Gear reasoning (HC-specific justification wrapping structured item data)

### 13.4 Output validation — every AI output schema-checked before display
Validation layer runs before any AI output reaches the user. Checks:

**Structural:**
- Required fields present
- Output length within bounds
- No malformed markup

**Factual:**
- Class + race + faction combination legal (no Horde Paladin, no Alliance Shaman)
- Every skill name referenced exists in the structured skill dataset for that class
- Every skill reference is at or above its minimum level (e.g. Mortal Strike requires Arms talent + level 40)
- Every item mentioned exists in the structured item dataset with a valid source (Trainer / Talent / Quest / Drop / Craft)
- Every talent reference matches the structured talent tree for the class
- Every zone mentioned exists and matches level-range expectations

**Safety:**
- Build has a documented safety mechanism in structured data
- Safety mechanism is accessible within the recommended playstyle
- If playstyle is Iron Man / Purist, no consumables/trainers/talents referenced

### 13.5 Validation failure handling
On validation failure:
1. Retry once with tightened prompt that includes the specific failure reason
2. If still failing, fall back to pre-written template for that archetype
3. Log `validation_failed` event with reason
4. Never display an unvalidated output

### 13.6 Content quality rule
Every recommendation must answer four questions well:
1. What am I playing?
2. Why this?
3. What keeps me alive?
4. What will this feel like?

If a content block doesn't improve one of those, it isn't Phase 1 critical.

### Senior-dev note on validation
Build the validator before the generator. It takes half a day and saves fifty embarrassing outputs. The first time an AI tells a user to go get Mortal Strike at level 20, the site's credibility in that player's eyes drops to zero and they tell their guild.

### Sample validator JSON shape (illustrative)
```json
{
  "skill_availability": {
    "mortal_strike": { "class": "warrior", "type": "talent", "talent_tree": "arms", "min_level": 40 },
    "polymorph":     { "class": "mage",    "type": "trainer", "min_level": 8 },
    "lay_on_hands":  { "class": "paladin", "type": "trainer", "min_level": 10, "faction": "alliance" },
    "bloodlust":     { "class": "shaman",  "type": "talent", "talent_tree": "enhancement", "min_level": 40, "faction": "horde" }
  },
  "class_race_faction": {
    "paladin": { "races": ["human","dwarf"], "faction": "alliance" },
    "shaman":  { "races": ["orc","troll","tauren"], "faction": "horde" }
  }
}
```

---

## 18. AI routing policy

### 18.1 Provider approach
- Start single-provider (Anthropic) behind AI Gateway
- Gateway makes swap or multi-provider routing trivial in Phase 2
- Never call a model directly from code — always route through gateway

### 18.2 Three logical model tiers

**Tier A — cheap/fast (Claude Haiku 4.5)**
- Names, taglines, short rationale drafts
- Cheap rerolls, simple memorial variants, epitaphs

**Tier B — balanced (Claude Sonnet 4.6)**
- Final Destiny "why this fits you"
- Memorial post-mortem text
- Constraint-aware refinement
- Used ONLY when user answered 5+ questions

**Tier C — best (ad-hoc, internal)**
- Content QA, rare ambiguous cases, authoring support
- Not normal production traffic

### 18.3 AI role definition (strict)
**AI is not the system of record. AI is the presentation and adaptation layer over structured content and ranking.**

### 18.4 Prompt caching
Aggressive caching on system prompts + structured data. ~90% cost reduction on cached portions.

### 18.5 Cost projections
- Full engaged user: ~$0.01-0.015
- 500 daily users, all AI: ~$150-210/month
- 500 daily users, 50% cache hit: ~$75-100/month
- 500 daily users, 80% cache hit: ~$25-45/month
- Mature product: flat regardless of traffic

### 18.6 Phase evolution
1. Launch — pure AI, building dataset (~$30-50/month)
2. ~500 interactions — hybrid, 50% cache hit (~$15-25/month)
3. ~5,000 interactions — DB-first, 80% cache hit (~$5-15/month)
4. Mature — DB feeds statistics into Tier B prompt context

### Senior-dev note on cost
Set a hard monthly cap on AI Gateway. Pick a number you can absorb out of pocket (e.g., $100/month for launch). If traffic spikes past that, serve cached outputs or fall back to templates. A runaway bill from a Reddit hug-of-death will ruin your month.

---

## 27. Content dataset prep

~1 week focused work. Runs parallel with scaffolding (#1-3 above).

### 27.1 Structured archetype library (36 archetypes)
- Per archetype: class/race rules, spec, talent skeleton, risk label, pacing, safety mechanism, profession fit, overlays allowed
- Estimate: 1-2 days

### 27.2 Talent chunks (not full 51-point walkthroughs)
- 3-5 brackets per archetype at key decision points
- HC-specific annotations per bracket
- Why-not-X alternatives at meaningful forks
- Estimate: 2-3 days

### 27.3 Item targets (with source tagging — required)
- 3-6 items per archetype across early/mid/late
- Each item: name, source tag (Trainer/Talent/Quest/Drop/Craft), slot, stats, HC note, priority label
- ~200 HC-relevant items total
- **Source tag is schema-required — validator rejects output missing it**
- Estimate: 1 day

### 27.4 Macro library
- 1-3 macros per archetype (copy-pasteable + usage note)
- ~60-100 macros total
- Estimate: 0.5-1 day

### 27.5 Addon stack
- 3-5 addons per archetype
- Must-have / situational groupings
- Estimate: 0.5 day

### 27.6 Death cause + zone data
- ~20 zones with common causes
- 5-8 famous killers per zone
- Zone danger flavor seeds for memorial copy
- Estimate: 0.5 day

### 27.7 Skill availability JSON (validator input)
- Per class: every skill with type (trainer/talent/quest), min_level, faction if restricted
- ~350 entries total (9 classes × ~40 skills)
- This is the single most important data file for preventing embarrassment
- Estimate: 1 day

### 27.8 First 10 Levels checklists
- Per archetype: 5-8 concrete, actionable steps
- Each validated against skill/item/quest data
- Human-reviewed by an actual HC player before launch
- Estimate: 0.5-1 day (leveraging archetype data already built)

### 27.9 Minimum viable content rule
Phase 1 needs enough content to support all 36 archetypes with the Section 13.6 quality rule met. Supporting detail can be shallow where needed. Don't write an encyclopedia first.

---

