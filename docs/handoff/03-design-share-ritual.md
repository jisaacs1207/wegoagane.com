# Design system, share cards & ritual

Handbook sections **14–16**, **31** (from handoff v4).

## Viability & dependencies

- Share cards (§15) are **launch-critical**: plan **async** image generation (senior note §15) so UI never blocks on Browser Rendering latency.
- Cloudflare Browser Rendering + R2 is coherent; monitor **cost and p95 latency** per card.
- Principles in §31 are release gates — especially validation-before-display and mobile-first cards.

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

