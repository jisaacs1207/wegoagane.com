# Flows, cards & rating

Handbook sections **5–10** (from handoff v4).

## Viability & dependencies

- UX viability hinges on optional steps and the **"just generate"** death path (§6) producing a strong Memorial.
- Card specs (§10) depend on structured data and the validator in [02-content-truth-ai.md](02-content-truth-ai.md) §13–27; UI can proceed on fixtures first.

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

