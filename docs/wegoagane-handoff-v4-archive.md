> **Archived single-file copy (v4).** Canonical handbook: [`docs/handoff/README.md`](handoff/README.md). Iteration tracker: [`docs/handoff/STATUS.md`](handoff/STATUS.md).

---

# wegoagane.com — Complete Design & Build Handoff (v4)

**Status:** Design complete. Two widget demos rendered in original session (Section 30). No production code written yet.
**Domain:** wegoagane.com (owned)
**Date:** April 22, 2026
**Audience:** Another Claude session, Cursor, or a developer picking this up cold.
**Changes from v2/v3:** Gemini additions integrated (level-gated skills validation, source tagging, First 10 Levels checklist, "Release Spirit" / "Draft a Run" language, defensive-check validation pass). Then a full senior-solo-dev / 40-year-old-HC-player refinement pass applied inline — scope guardrails tightened, embarrassment-prone failure modes flagged, operational realism added throughout.

---

## 0. Executive decision

wegoagane launches as a **focused web product** that turns a WoW Classic Hardcore death — or a stalled planning moment — into a fast, emotionally resonant next-character decision. **It does not launch as a platform.**

The core launch promise: a player arrives in one of two states (*I just died* or *I'm planning a run*), completes a short flow, and leaves with a high-quality memorial (if relevant), a personalized Destiny recommendation, a shareable card, and a reroll loop that feels useful rather than random.

**Launch principle:** the product is **a tool that becomes a ritual**. Phase 1 must feel beneficial and emotionally sticky, not just technically functional.

**Product thesis:** most HC resources are author-first (class guides, tier lists, best-builds). wegoagane is organized around the player's immediate need: reduce paralysis after death, reduce research time before rerolling, make players feel seen rather than instructed, create a shareable identity moment native to HC culture.

**What will embarrass us if we get it wrong:**
- Factually wrong build advice that gets a character killed (Section 13)
- Memorial copy that reads like a Hallmark card or a Reddit bot (Section 16)
- Share cards that look corporate or AI-slop when screenshotted into a Discord channel (Section 15)
- Anything that feels like it was designed by someone who's never died at level 47 in Stranglethorn

---

## 1. Phase 1 scope (hard boundaries)

### Phase 1 IS
- Landing page — two entry paths + Lucky Roll
- Death flow (optional details → Memorial + Destiny in one combined result view)
- Planning flow (light goal signals → Destiny)
- Memorial card
- Destiny card
- Reroll / refinement loop with structured feedback capture
- Share-image generation (Memorial / Destiny / combo — mobile-first)
- Local pattern memory (localStorage)
- Anonymous server-side analytics + recommendation logging
- 36 structured archetypes (9 classes × 4 philosophies) with depth per Section 13

### Phase 1 IS NOT
- Stable Builder (multi-character planner) — Phase 2
- Chronicle as a live timeline — Phase 2
- Victory as a full flow — deferred (card auto-generates on self-report 60, no flow around it)
- Accounts or OAuth
- Addon sync or companion desktop app
- Broad run-tracking dashboard
- Full 51-point talent walkthroughs (chunks only at launch)
- Public death wall / leaderboard
- SEO-heavy database pages
- Any form of "premium" anything

### Why this boundary
Phase 1 validates four questions:
1. Do players complete the flow?
2. Do they accept or reroll in meaningful ways?
3. Do they share outputs?
4. Do they come back after another death or planning moment?

If those are strong, the product earns Phase 2. If they're weak, more features won't save it.

### Senior-dev note on scope
Solo operators fail on scope, not skill. Every feature past this boundary must pass: *"does shipping this three months later materially change whether Phase 1 succeeds?"* If no, it's Phase 2.

---

## 2. Product goals

### User goals
The product helps a HC player do at least one of these better than existing sites:
- Recover emotionally after a death
- Get unstuck choosing the next character
- Discover a build that feels personally appropriate
- Feel excited about rerolling instead of exhausted
- Share death and next intent in a way native to HC culture

### Operator goals
- Self-sustaining cost structure for a solo operator
- Structured content + retrieval reducing AI spend over time
- Voluntary funding / tasteful later monetization
- Avoid anti-HC monetization (boosting affiliates, premium builds, paywalls, intrusive ads)

### Success conditions at launch
- Completion rate tracked and healthy
- Reroll reasons interpretable and useful
- Share rate non-trivial (>5% of accepts, measured)
- Repeat users show improved fit from local + aggregate learning
- Per-session cost low enough that growth doesn't cause financial pain

---

## 3. Positioning & emotional contract

**wegoagane is a Hardcore reroll and remembrance engine.** Not a guide site, not a database, not a run tracker, not a leaderboard. Launch positioning stays narrow.

### Emotional contract (non-negotiable)
The product must never make the user feel judged. It can be honest, direct, sharp. It must never be mocking, condescending, or generic. Memorial tone: specific, restrained, memorable. Never melodramatic. Preserve dignity even for silly deaths (especially for silly deaths).

### The ritual insight
Death → Memorial → next Destiny turns loss into narrative momentum. A death activates HC identity strongly — the sequence capitalizes on that moment while it's warm.

### Viral mechanism — be honest about what this means
Niche virality inside HC community, not mass virality. HC is a low-thousands active-player scene. Reference comps: Letterboxd (for logging/rating identity expression), LichKing.com deathclips, existing HC Discord meme culture. A "successful" share is someone pasting a card into a guild Discord and getting reactions — not a viral tweet.

### Senior-dev note on expectations
HC Classic has maybe 5-10K concurrent active players across all servers. If this product saturates the entire niche, traffic is hundreds of daily users, not thousands. Design cost and infra for that reality. Viral upside exists but don't pre-optimize for it.

---

## 4. Personas

### Primary personas for Phase 1
1. **Wrathful Fresh Death** — just died in last 10 minutes, furious, needs to channel
2. **Curious First-Timer** — new to HC, overwhelmed by choice
3. **Perpetual Restarter** — dies frequently, reroll is already a ritual
4. **Veteran Optimizer** — knows the meta, will bounce if facts are wrong
5. **Burnout-Adjacent** — played a lot, wants freshness

### Secondary personas for Phase 1
6. **Flavor-Seeker / Roleplayer** — cares about character identity over efficiency
7. **Challenge Runner** — deliberately picks hard paths

### Deferred to Phase 2
8. **Stable Builder** — persona documented, flow comes later

Internal engineering labels can use HC-native phrasing (`fresh_ghost_run`, `veteran_optimizer`, etc.) — not user-facing. No persona label ever appears in the UI.

### Senior-dev / HC-player note on the Veteran Optimizer
This persona churns fastest on a single bad fact. One hallucinated item source, one wrong talent prerequisite, one Horde Paladin, and they close the tab and post about it in a Discord. They are also the most likely to share a card that's actually right. Optimize correctness for them; the other personas benefit automatically.

---

## 5. Landing page & entry paths

### Landing question
> **What brings you here?**
> - **Release Spirit** — *I just died*
> - **Draft a Run** — *I'm planning*
> - **Lucky Roll** — *Surprise me*

"Release Spirit" is the literal in-game phrase when a player dies. Classic players see it and immediately know the product speaks their language. "Draft a Run" uses theorycrafting vocabulary ("drafting a build"). "Lucky Roll" maps to `/random` dice rolls in-game.

Stable Builder is NOT on the Phase 1 landing page.

### Lucky Roll behavior
Skips the question stack, generates a Destiny immediately. Not uniformly random — weighted toward high-satisfaction archetypes with enough variety. Still produces a complete, shareable card.

### Senior-dev note on entry buttons
Three buttons max. Don't let designers talk you into a fourth "learn more" option at the bottom. The landing is a fork in the road, not a menu.

---

## 6. Death flow

### Step 1 — Emotional framing (fast, skippable)
Mood/cause chip selector:
- My fault
- Bullshit death
- First time
- Long time coming
- Just generate

### Step 2 — One practical signal
> What do you want next?
- Safer
- Faster
- Different
- Social
- Strange
- No pet class
- Surprise me

### Step 3 — Optional death detail (all optional, all skippable)
- Zone (tap zone map with hot zones highlighted)
- Cause bucket (Section 8)
- Level reached
- Class lost
- Short freeform note (80 char cap)

Minimal input must produce a good Memorial. No field is required.

### Step 4 — Generate
**Show Memorial first, Destiny immediately beneath it, same screen.** The combined view is the primary share artifact (Section 15).

### Step 5 — Refinement
- **Accept this fate** (commits, unlocks share)
- **Reroll** (triggers Rating Gate — Section 9)
- **Almost right** (triggers refinement, not full reroll)
- **Change the energy** (mutates pacing/risk, preserves class candidate)
- **Change the class** (swaps class, preserves intent)
- **Safer** / **Stranger** (directional nudges)

All choices captured as structured feedback.

### Senior-dev / HC-player note on tone
A player who died 45 seconds ago doesn't want to fill out a form. Step 1-3 must be genuinely skippable without degrading the output. Test the "just generate" path end-to-end regularly — if that path produces a bad Memorial, the product fails for the angriest users who need it most.

---

## 7. Planning flow

### Step 1 — Intent (pick 1-2)
- Safest path to 60
- Something new
- Profession-first
- Social / group value
- Solo comfort
- Fast and aggressive
- Just fun

### Step 2 — Optional constraint
- Horde / Alliance
- Avoid pet management
- Want caster / want melee
- Want dungeon invites
- Self-found mindset

### Step 3 — Optional freeform (80 chars)
*"Anything else? e.g. 'hate pet management' or 'already tried this'"*

### Step 4 — Generate Destiny
Same refinement options as death flow. No Memorial in planning flow.

### Tone
Planning mode is cleaner, less ceremonial. Avoid death/spirit language here. A first-time HC player drafting their very first character should not be greeted with funeral copy.

---

## 8. Death cause reporting

Two-tap flow, zero typing required:

1. **Zone map** — tap zone (visual map, common hot zones highlighted)
2. **Famous killer cards** — top 5-8 things that kill players in that zone. Tap one OR "Something else" with simple categorization.

### Cause buckets
- Environmental (fall, drown, lava)
- Mob combat (standard)
- Patrol (unexpected mob)
- Technical (DC, bug, crash)
- PvP chosen (Mak'gora duel)
- PvP accidental (NPC flag, Singer exploit, guards)
- Behavioral (pushed too hard, greed)
- Unknown (always available)

### Famous killers (curated seed dataset)
- Son of Arugal (Silverpine) — patrol, notorious
- Stitches (Duskwood) — patrol between towns
- Lashtail Raptor packs (Stranglethorn Vale)
- Defias Pillager, Kobold Miner, Voidwalker, Wendigo, Defias Trapper
- Plaguehound Runners (WPL/EPL)

### Epitaph generation
Tier A model (cheap/fast). Zone- and cause-specific. Examples:
- Patrol: *"She saw the patrol. She thought she was faster."*
- Kobold at level 10: *"Kobolds. Level 10. A kobold. At level 10."*
- Voidwalker: *"The voidwalker held. The warlock didn't."*

Tone: specific, restrained, memorable. Dignified even for silly deaths. Four template variants: first death / high-level death / bullshit death / acceptance framing.

### Senior-dev / HC-player note on famous killers
The "famous killer" card UI is culturally huge. These deaths are *known by name* in the community. Getting the roster right — and keeping it current — is worth more than most of the other content work. Missing Stitches or Son of Arugal reads as "this site doesn't know HC." Include the whole canon.

---

## 9. Rating, reroll & refinement

### Rating gate before reroll (required)
Reroll button transforms into:
> *"Before we try again — what felt off?"*

Five tap options (icon + label, no heavy text):
- Wrong class
- Wrong energy
- Wrong goals
- Almost right
- Just curious

Optional 80-char text field: *"What specifically? e.g. 'hate pet management' or 'already tried this'"*

Then new/refined result generates.

### Reroll mutation logic (NOT "full random try again")
Reroll reason mutates only the right dimensions:
- **Wrong class** → change class first, preserve goal/intent
- **Wrong energy** → change pacing/risk, preserve class candidate
- **Wrong goals** → restart from goal selection, suppress previous class signal
- **Almost right** → preserve core identity, mutate overlay or presentation (low-temperature AI pass)
- **Just curious** → explore nearby/high-confidence alternates with variety bias

### "Almost right" = refinement, not regeneration
Cheapest AI path. Model gets original build + rating + feedback + profile → generates a *variation* (same class maybe, different spec/profession/overlay). Stored as linked build in DB. Higher satisfaction, lower cost.

Implementation hint: use lower temperature on this pass (0.3-0.5) vs. the initial generation (0.7-0.9). Small mutations, not fresh creativity.

### Post-accept rating (non-blocking)
After "Accept my fate," soft prompt with 5 icons:
- Not this / It'll do / Good pick / This is it / Perfect

Happens after commitment, doesn't block flow. Most players tap because it feels like a ritual beat.

### Signal weight
Run outcome (level reached, death cause, days alive) > post-accept rating > reroll reason. Outcome data is ~10x any rating signal.

### Senior-dev note on rating gates
Rating gates feel like friction until you realize every tap captures training data for free. Don't let yourself be talked out of this by a UX argument about "frictionless rerolls." The friction is the point. Two taps gets them to a better result, not a worse one.

---

## 10. Four card states

Every run cycles through some or all. All cards must be readable and effective on a phone first.

### 10.1 Memorial card (death result)
**Purpose:** acknowledgment, tone-setting, shareability, transition from loss to next intent.

Required elements:
- Character name (provided or AI-inferred)
- Class / race / faction if known
- Server if known
- Level reached (prominent)
- Zone + cause if known
- Short epitaph (AI, zone+cause specific)
- Short post-mortem line (factual, brief)
- Continuation into Destiny

Visual: desaturated class stripe (grey, ~50% opacity), muted name (#A89870), large dim level number, epitaph italic, quiet stats row, gold-border post-mortem block.

### 10.2 Destiny card (next-run result)
**Purpose:** deliver the next action, feel personal, feel trustworthy, be worth sharing.

Required elements:
- Class
- Race (with faction)
- Spec / build archetype
- Professions
- Risk profile label (Section 11)
- **Safety mechanism** — one clear line (Section 13.4 validation required)
- **"Why this fits you"** — one short AI paragraph (references user answers)
- **"What this will feel like"** — one short description
- **First 10 Levels checklist** — concrete numbered steps (see below)
- Reroll / Accept / Share CTA

Optional expandable elements at launch:
- Talent path chunks (3-5 brackets, not 51 points)
- Key gear goals by phase (3-6 items, each with source tag)
- Macro suggestions (1-3, copy-pasteable)
- Addon suggestions (3-5, grouped must-have vs situational)

Visual: class-color stripe accent, dark card, gold CTA accents, class icon top-left, faction badge top-right, pills row for meta, gold-border safety mechanism block, blue-border "why this fits you" block.

### 10.3 First 10 Levels checklist (NEW — Gemini addition, expanded)
Every Destiny card includes a literal numbered checklist of 5-8 concrete actions for the first 10 levels. Each item:
- References a specific skill / item / quest by name
- Is actionable in one short sentence
- Is validated against structured data (Section 13.4) — no invented skill names, no quests the class can't start
- Is appropriate to the chosen build and professions

**Example (Orc Frost Mage, Engineering/Mining):**
1. At level 4, buy rank 2 Frostbolt from your mage trainer in Orgrimmar.
2. Save 5-10 silver for a 6-slot Small Red Pouch from the general vendor.
3. Complete the starting zone quest chain through Razor Hill — do not skip.
4. Pick up Mining from the profession trainer in Razor Hill; ignore Engineering until level 10.
5. At level 8, purchase Polymorph and Frost Nova from the trainer — both are non-negotiable.
6. Do not enter the Wailing Caverns entrance zone (the Barrens southern area) until at least level 15.
7. Craft a Greater Magic Wand as soon as you reach Enchanting 35 (coordinate with a guildmate or friend with the profession).
8. Log out in Orgrimmar inn any time you stop playing — rested XP only accumulates in rest zones.

This is the highest-trust element on the card. Every bullet must be factually correct or the Veteran Optimizer bounces.

### 10.4 Chronicle card (Phase 2 — not built at launch)
Live milestone update variant. Mentioned for architectural continuity.

### 10.5 Victory card (auto-generated on self-reported 60)
No full flow built around it. Gold stripe, crown SVG, bright gold name, 4 stats (days/deaths/dungeons/gold), italic quote, "what made the difference" block.

**HC-specific note for Victory copy:** HC does NOT progress to TBC. Anniversary HC characters are stuck at 60 with no expansion path. Victory copy should acknowledge this — reaching 60 is the end, not a beginning. Do not write "now you're ready for Karazhan" or similar. The run ends here, by design.

### Senior-dev / HC-player note on First 10 Levels
This list is what converts skeptical veterans. Anyone can write "play a Frost Mage, it's safe." Very few tools tell you to *not enter the Wailing Caverns entrance zone until 15* — that's the lived-experience detail that earns trust. Make these lists pass review by an actual HC player before launch.

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

## 14. Visual & interaction direction

### 14.1 Design ratio
- **70% modern product UI** — dark app shell, strong hierarchy, generous spacing, card-based
- **20% WoW material language** — class-color accents, tactile cues, original class-inspired icons
- **10% memorial atmosphere** — Memorial cards specifically lean into stone/parchment warmth

### 14.2 Do not build
- Parchment-heavy fantasy scrapbook
- Generic SaaS dashboard
- Wowhead clone
- "In-game addon" skin — reads cramped and alienates non-optimizer personas

### 14.3 Mobile-first (launch requirement)
Every critical card must read and work on a phone first. Discord/Reddit discovery drives phone visits. Grief/reaction behavior happens away from the desktop session.

### 14.4 Icon system
Original SVG for classes, professions, factions, risk indicators, playstyle modes, memorial cause types.

Rules:
- No emoji in cards (icons only)
- No Blizzard files
- No traced or recolored official art
- All icons legible at ~16px

### 14.5 Color tokens

**Class colors (canonical Classic, safe — community-documented 20+ years):**
```css
--mage:    #69CCF0;
--hunter:  #ABD473;
--warrior: #C79C6E;
--warlock: #9482C9;
--priest:  #F0EBE0;
--rogue:   #FFF569;
--druid:   #FF7D0A;
--paladin: #F58CBA;
--shaman:  #0070DE;
```

**Core palette:**
```css
--s1: #161412; /* darkest bg */
--s2: #1E1B18; /* card bg */
--s3: #262220; /* inner surface */
--s4: #2E2A26; /* hover */
--s5: #38332D; /* active */
--bm: #3D3428; /* main border */
--ba: #5A4A2A; /* accent border */
--gold:        #C4A35A;
--gold-bright: #E8C97A;
--gold-dim:    #8A6F3A;
--tp: #E8DCC8; /* text primary */
--ts: #A89870; /* text secondary */
--td: #6A5F48; /* text dim */
--tx: #4A4030; /* text very dim */
--horde:    #C41F3B;
--alliance: #1A78C2;
```

### 14.6 Typography
- Stack: `-apple-system, 'Segoe UI', sans-serif`
- Mono: `'SF Mono', 'Fira Code', monospace`
- Sizes: 9px uppercase labels, 10-11px meta, 12-13px body, 14-16px headings, 21-28px hero
- Weights: 400 body, 500 emphasized, 600 labels, 700 hero
- Uppercase labels: 0.04-0.25em letter-spacing

### 14.7 Spacing & radii
- Card padding: 14-20px
- Section gap: 10-16px
- Border radius: 4px (pills), 6px (buttons/rows), 8-10px (cards)
- Border: 1px solid `--bm` always

---

## 15. Share-card architecture (launch-critical)

Share cards ARE the growth mechanism. Not export garnish.

### 15.1 Required share outputs
- Memorial image (standalone)
- Destiny image (standalone)
- **Memorial + Destiny combo** — centerpiece for death flow

Default share CTA for death flow is the combo. It packages loss → next intent into one social artifact.

### 15.2 Technical approach
- React component renders card at a dedicated route (`/share/:runId.png`)
- Cloudflare Browser Rendering captures final image
- Store in **R2** (public URL, cacheable)
- Reuse URL for Open Graph tags + direct share
- Cache indefinitely by runId hash; regenerate on content change

### 15.3 Design rules
- Readable at mobile sizes (primary test: does level + cause read clearly at 200px wide?)
- Strong title hierarchy
- Class color sparingly (one accent, not everywhere)
- Cause / level / next destiny visible within first glance
- Same icon system as the product
- Site watermark (`wegoagane.com`) in corner, restrained

### 15.4 Open Graph / social meta
- `og:image` → R2-generated card
- `twitter:card` → summary_large_image
- `og:title` templated per card type (*"[Name] fell at level 47 to a patrol in Stranglethorn"*)
- `og:description` uses epitaph line

### Senior-dev note on share cards
Browser Rendering is not free and not always fast. Budget 2-5 seconds of latency on first generation per card. Design around that — show the card in-browser instantly from the same React component, generate the image async in the background, and only swap the share URL when the image is ready. Don't block user flow waiting for an image render.

---

## 16. Ritual design

### 16.1 Intentional ritual beats
1. Death acknowledgment
2. Epitaph reveal
3. Destiny reveal
4. Reroll judgment (rating gate)
5. Share or vow moment

### 16.2 Ritual rules
- Keep each beat short
- Consistent language patterns across copy
- Skip is never punished
- Avoid irony overload
- Avoid faux-poetic language unless it specifically fits the death
- Preserve dignity even for silly deaths
- Tone adjusts by emotional state signal

### Senior-dev / HC-player note on copy tone
There is a narrow corridor between "genuinely moving" and "AI slop fantasy writing." Memorial copy written by a language model defaulting to its training distribution will land on the slop side every time. Prompt engineering for the epitaph model matters more than model choice. Write 20 hand-authored epitaph examples across tone variants and pin them in the system prompt as style anchors. Review the first 100 generated epitaphs before going public and yank the system prompt back toward the good ones.

---

## 17. Technical stack

### 17.1 Final stack (operator-confirmed)

**Frontend: React SPA** (Vite + React Router)
- Mobile-first CSS, custom properties for theming
- Deployed to Cloudflare Pages (free, GitHub Actions auto-deploy)
- SPA serves share landing pages via Worker-generated OG meta

**API runtime: Cloudflare Workers + Hono**
- Edge-friendly, lightweight, good DX
- Routes: question ingestion, recommendation generation, run tracking, share-card render trigger

**Storage — split by role:**
- **D1** — relational + analytics events needing SQL (sessions, questions, builds, ratings, runs, recommendation_logs)
- **KV** — hot lookup (archetype JSON, class/faction rules, feature flags)
- **R2** — generated share-card images + static assets

**AI routing: Cloudflare AI Gateway** in front of Anthropic (primary provider)
- Abstraction, caching, rate limiting, retries, analytics
- Single-provider at launch via gateway = trivially swappable later
- Token + latency telemetry per model built in

**Analytics: PostHog**
- Product analytics + session replay
- LLM observability support
- Feature flags for safe rollout
- Free tier adequate for launch

**Error tracking: PostHog error tracking** (consolidated) or Sentry if preferred

### 17.2 Why React SPA (not Astro)
Operator preference: familiar from itch.io game dev, simpler to ship. Astro + islands is a fine alternative but adds complexity without clear Phase 1 payoff. Share landing pages handled via Worker routes serving static HTML + OG meta — no full SSR needed.

Revisit SSR only if SEO becomes a Phase 2+ priority.

### 17.3 Why D1 (not Postgres)
Valid alternatives exist (Supabase, Neon). For Phase 1:
- Edge delivery > deep Postgres ergonomics
- Cost control + simple deployment > backend flexibility
- Share-card flow fits Cloudflare R2 especially well
- Revisit if analytics or user systems outgrow D1

### Senior-dev note on stack
This stack is genuinely operable by one person. Cloudflare's billing consolidates — one dashboard shows infra cost. PostHog free tier covers early traffic. AI Gateway gives you a single chokepoint for cost/provider/caching changes without touching code. Don't let anyone convince you to add Kubernetes, microservices, or a message queue.

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

## 19. Data model

### 19.1 Core entities

**`sessions`**
```sql
id TEXT PRIMARY KEY,
created_at DATETIME,
device_fingerprint TEXT,
entry_path TEXT -- 'release_spirit' | 'draft_a_run' | 'lucky_roll'
```

**`question_answers`**
```sql
session_id TEXT,
question_key TEXT,
answer_value TEXT,
skipped BOOLEAN,
timestamp DATETIME,
freeform_text TEXT
```

**`memorials`**
```sql
id TEXT PRIMARY KEY,
session_id TEXT,
generated_at DATETIME,
character_name TEXT,
class TEXT, race TEXT, faction TEXT,
server TEXT, level_reached INTEGER,
death_zone TEXT, death_cause_bucket TEXT, death_cause_detail TEXT,
epitaph_text TEXT, post_mortem_text TEXT,
share_image_r2_key TEXT,
ai_model_used TEXT
```

**`destinies`**
```sql
id TEXT PRIMARY KEY,
session_id TEXT,
memorial_id TEXT,             -- nullable (planning flow)
generated_at DATETIME,
class TEXT, race TEXT, faction TEXT,
spec TEXT, archetype_key TEXT, -- references structured archetype
playstyle_overlays TEXT,       -- JSON array
profession_1 TEXT, profession_2 TEXT,
risk_profile TEXT,
fingerprint TEXT,              -- hash for cache lookup
content_json TEXT,             -- full rendered content
source_type TEXT,              -- 'ai_generated'|'cache_hit'|'template'
source_destiny_id TEXT,        -- if refinement, reference to original
ai_model_used TEXT,
share_image_r2_key TEXT
```

**`refinements`**
```sql
destiny_id TEXT,
refinement_type TEXT,
reroll_reason TEXT,
reroll_feedback_text TEXT,
resulting_destiny_id TEXT,
timestamp DATETIME
```

**`ratings`**
```sql
destiny_id TEXT,
score INTEGER,
feedback_text TEXT,
timestamp DATETIME
```

**`share_events`**
```sql
target_type TEXT,
target_id TEXT,
session_id TEXT,
channel TEXT,
timestamp DATETIME
```

**`archetypes`** (KV, not D1)
36 structured archetypes as JSON. Edge-loaded.

**`archetype_overlays`** (KV)
Profession pairs, playstyle modes, tone variations, allowed pairings.

**`recommendation_logs`** (D1)
```sql
destiny_id TEXT,
selected_archetype TEXT,
overlays_applied TEXT,
ranking_score REAL,
confidence_score REAL,
source TEXT,
model_used TEXT,
tokens_input INTEGER, tokens_output INTEGER,
cache_hit BOOLEAN,
retries INTEGER,
validation_failures INTEGER,  -- new: track validator triggers
timestamp DATETIME
```

### 19.2 Fingerprinting for cache
Hash: `class + spec + playstyle_mode + goal_type + profession_1 + profession_2`

On new session: query D1 for destinies with same fingerprint, `accept_rate ≥ 0.6`, `reroll_rate ≤ 0.3`, `sample_n ≥ 10`. Hit → serve cached. Miss → generate + store.

### 19.3 Local storage (browser)
- Rejected classes, accepted classes
- Reroll reasons across sessions
- Preferred tone patterns
- Repeated constraints
- Run IDs for return visits

### 19.4 Do not surface pattern learning aggressively
**Never:** *"You tend to die from X"*

**Do:** quietly bias recommendations. Use subtle explanation like *"this gives you more room to recover from overpulls"* if prior behavior suggests it.

### 19.5 Server-side learning (anonymous)
- Aggregate accept rate by archetype
- Reroll rate by archetype
- Reroll reason distribution by profile cluster
- Archetype fit by profile cluster
- Share rate by output type
- Repeated refinement paths

### Senior-dev note on data model
Don't over-engineer the schema. What's listed above is good. Resist adding "user profiles" or "preferences" tables until Phase 2 at the earliest. Every table is a migration and a bug surface.

---

## 20. Recommendation engine

### 20.1 Decision pipeline (deterministic first, AI last)
1. Collect user state + local-memory hints
2. Map signals into a profile vector
3. Rank eligible archetypes with deterministic rules + weights
4. Apply overlays (profession, playstyle, tone) via rules
5. Check cache for similar successful outputs (fingerprint + stats threshold)
6. Cache miss → generate AI presentation layer
7. Validate output against schema (Section 13.4)
8. On validation failure: retry tightened, then fall back to template
9. Render result
10. Log decision + outcome

### 20.2 Deterministic ranking inputs
- Stated goal
- Death mood
- Previous rejected classes (local memory)
- Pace preference
- Safety preference
- Social preference
- Novelty preference
- Faction preference
- Local repeated cause tendencies
- Constraints

### 20.3 Why deterministic-first
AI is good at variation + presentation, bad at consistent ranking + factual constraint satisfaction. Deterministic ranker surfaces candidates; AI polishes the one that wins. Cheaper, more reliable, easier to debug.

### Senior-dev note on the ranker
Start dumb. A weighted sum of tag-overlap scores is fine for launch. Don't build an ML model. Don't use embeddings. Don't vectorize anything. The moment you can't explain why a given recommendation won over another in plain English, you've over-engineered.

---

## 21. Analytics & observability

### 21.1 Launch metrics
- Completion rate (flow starts vs. destiny accepts)
- Accepted Destiny rate
- Average rerolls per session
- Reroll reason distribution
- Share rate by card type
- Share click-through to completed share
- Local repeat usage rate
- Cost per completed session
- Cost per accepted Destiny
- **Validation failure rate** (new — critical health metric)

### 21.2 Event taxonomy
- `landing_viewed`
- `flow_started` (entry_path)
- `question_answered`
- `question_skipped`
- `memorial_generated`
- `destiny_generated`
- `refinement_requested` (reroll_reason)
- `destiny_accepted`
- `post_accept_rated` (score)
- `share_clicked` (target_type)
- `share_completed`
- `generation_failed`
- `validation_failed` (with reason)
- `fallback_triggered`

### 21.3 LLM observability (first-class)
Per AI call:
- Tokens input / output
- Latency
- Provider / model
- Retry count
- Fallback triggered
- Cache hit
- Prompt template version
- Output passed validation
- Downstream acceptance

Surface in PostHog dashboards + AI Gateway dashboards.

### Senior-dev note on monitoring
Set two alerts at launch: (1) validation_failed spikes above 10% of generations, (2) daily AI spend exceeds cap. Everything else can wait until you have real traffic. Don't build a dashboard until you have questions to ask it.

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

## 26. Implementation order

1. App shell + routing
2. Icon system (original SVG)
3. Card component system (Memorial / Destiny / share variants)
4. Structured archetype schema + JSON content (Section 27)
5. **Output validator (build before generator)**
6. Deterministic ranking engine (Section 20)
7. AI Gateway integration
8. Destiny generation pipeline (rank → cache → AI → validate → render)
9. Memorial generation pipeline
10. Refinement loop with rating capture
11. Share-card generation (Browser Rendering → R2)
12. Analytics + observability wiring
13. Local memory tuning
14. Content iteration based on early user data

### Senior-dev note on order
Build #1-5 before touching AI. Get a working deterministic pipeline that produces a usable Destiny from pre-written templates end-to-end. *Then* plug AI in as a presentation layer. This is boring advice and it's why solo products ship.

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

## 28. HC mechanics reference (April 2026 state)

### Active servers
- **NA Era:** Defias Pillager, Skull Rock, Doomhowl Era (low pop)
- **NA Anniversary:** Doomhowl
- **EU Era:** Nek'Rosh, Stitches
- **EU Anniversary:** Soulseeker
- **TW:** Hogger

Total HC population ~low thousands across all servers as of Feb 2026.

### Critical rules
- HC does NOT progress to TBC (Anniversary HC stuck at 60, no expansion path)
- PvP fully opt-in via `/pvp`
- Attacking enemy faction NPCs auto-flags
- Mak'gora `/makgora` = consent-required duel to death
- Wargames exist, Battlegrounds disabled
- Self-Found official mode available since Feb 29 2024
- Each dungeon runnable ONCE per character within its level range
- Duos/trios share fate
- No resurrection abilities work (Druid Rebirth, Warlock/Shaman soulstone all disabled)

### Top death causes (order)
1. Fall damage
2. Kobold Miner
3. Voidwalker
4. Defias Trapper
5. Wendigo
6. Defias Pillager
7. Other players (Mak'gora + exploits)
8. Drowning

### Notorious patrols
- Son of Arugal (Silverpine)
- Stitches (Duskwood, Darkshire ↔ Raven Hill)
- Lashtail Raptor packs (STV)
- Plaguehound Runners (WPL/EPL)

### Grief vectors
- Singer mind-control exploit in Arathi
- Mob kiting across zones (incomplete fix)
- Accidental flag via enemy NPC attack / guards

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

## 30. Widget demos completed (reference)

Two widgets rendered in original design session:

1. **Four-card state demo** — tabs showing Destiny / Chronicle / Memorial / Victory with minimal content
2. **Full Mireska destiny buildout** — complete talent path, gear, macros, addons, safety blocks. Orc Frost Mage, 31/0/20 Shatter build, Engineering + Mining, The Stable Method overlay

Source: transcript `/mnt/transcripts/2026-04-22-20-29-06-wegoagane-site-planning.txt`, tool calls `wegoagane_destiny_card` and `wegoagane_full_destiny_build`.

---

## 31. Non-negotiable design principles

1. Every depth level produces a complete, usable, shareable result. No half-cards.
2. Skip is signal, not absence.
3. Rating before reroll is required (gate, not optional).
4. "Almost right" triggers refinement, not full reroll.
5. Run outcome weights ~10x any rating signal.
6. AI handles three things forever: epitaphs, names, personalization paragraphs.
7. Everything structural becomes DB-served over time.
8. No Blizzard assets ever. Custom SVG only.
9. Memorial + Destiny combo is the primary share object.
10. Mobile-first on every card.
11. Class colors are the signature accent (canonical hex).
12. Every build must be viable in HC. "Just fun" tier has completion evidence.
13. HC-specific context on every piece of advice.
14. Natural-language naming over internal taxonomy.
15. AI is presentation, never system of record.
16. Output validation before display, always.
17. Share-card generation is a launch surface, not an export.
18. Every skill / item / quest reference comes from structured data with a source tag.
19. First 10 Levels checklist is the highest-trust element on the card — human-reviewed.
20. Build the validator before the generator.

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

*End of handoff v4. Design is stable. Implementation is next.*
