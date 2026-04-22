# Vision, scope, goals, positioning & personas

Handbook sections **0–4** (from handoff v4).

## Viability & dependencies

- Product and persona framing is viable independent of infra.
- Emotional viability depends on **skip-first** flows (§6–7) and copy quality; not blocked by backend choices.

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
