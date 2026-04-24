# Hermes Design System

Hermes is the modern replacement for ARGUS — an **agentic commercial real estate (CRE) underwriting platform** that turns deal documents into institutional-grade, fully auditable financial analysis in minutes, not days.

This design system defines the visual language, components, and content guidelines for every Hermes surface: the web application, marketing site, exports, and pitch materials.

---

## Product at a Glance

**Who it's for.** Institutional CRE investors, acquisitions analysts, asset managers, private credit teams, developer/operators, and investment‑sales brokers. Sophisticated, time‑pressured, deeply skeptical of tools that trade depth for polish.

**Core promise.** Speed without compromise. Turn messy deal materials (OMs, rent rolls, T‑12s, term sheets, PCAs, market studies) into structured, defensible, institutional‑grade underwriting — with full provenance — in minutes.

**Core surfaces (MVP).**
- **Deal workspace** — upload, extract, review, model, export. The central analyst surface.
- **Gate review** — human‑in‑the‑loop checkpoints (post‑extraction, post‑construction) where the analyst approves/overrides AI outputs.
- **Model outputs** — KPI dashboards (IRR, equity multiple, cap rates, DSCR/LTV/LTC), cash flows, scenario comparison.
- **Excel export packs** — Inputs Pack, Summary Pro Forma, Scenario Comparison, Module Schedules, Capital Budget, Full Monthly Cash Flows.
- **Marketing site** — positioning against ARGUS; "minutes, not days."

---

## Sources Used to Build This System

| Source | Type | Path/Link |
|---|---|---|
| `clintmccoy/hermes` | Codebase (GitHub) | early‑stage Next.js 16 + React 19 + Tailwind v4 + Supabase app |
| `docs/PRD.md` | Product requirements (v0.2) | read |
| `docs/PRODUCT_NOTES.md` | Parking lot, UX principles | read |
| `docs/CLAUDE.md` | Workflow rules | read |
| `src/app/jobs/[jobId]/review/GateReview.tsx` | The one real UI surface that exists — **functional stub** only | read |
| Hermes Design Brief | Product/design prompt from the team | embedded |

> **Note on fidelity:** at the time of authoring, the codebase has one real UI surface — a stub gate‑review table with `system-ui` and inline hex colors. It is explicitly marked "not a designed UI surface." The UI kit in this system therefore establishes the design language rather than mirroring existing production code. Where choices were made, they follow the design brief (deep navy/charcoal surface + burnt amber accent, geometric sans, medium‑high density, minimal motion).

---

## Index

| File / folder | Purpose |
|---|---|
| `README.md` | **You are here.** Overview, content fundamentals, visual foundations, iconography. |
| `SKILL.md` | Agent‑skill entry point. Read this when invoking the skill. |
| `colors_and_type.css` | All CSS variables: palette, semantic colors, type scale, radii, shadows, spacing. Import once at the root. |
| `fonts/` | Web font files (Inter, JetBrains Mono). |
| `assets/` | Logos, icon notes, key brand imagery. |
| `preview/` | Small cards rendered in the Design System tab — palettes, type specimens, components, etc. |
| `ui_kits/app/` | Hermes application UI kit — hi‑fi React mock of the deal workspace with real interactions. |
| `ui_kits/marketing/` | Hermes marketing site UI kit — homepage hero, positioning sections. |

---

## Content Fundamentals

Hermes copy sounds like a **senior analyst talking to a peer**, not a SaaS marketer talking to a lead.

### Voice
- **Precise over friendly.** We name things accurately. "Going‑in cap rate," not "initial yield." "Post‑extraction gate," not "AI check‑in."
- **Confident, not performative.** Declare the outcome; don't hype it. "Underwritten in 4 minutes." — not "⚡️ Lightning‑fast underwriting!"
- **Show the work.** Every number has a source. Copy should reinforce that: "From rent roll, p. 14" > "AI extracted."
- **Plain English for concepts; exact jargon for fields.** Headlines are plain. Table columns, gate names, and output labels use the exact industry term.

### Tone
- **You / we, never "the user."** First and second person. "We found 3 inputs that need your review."
- **Short sentences. Active voice.** Verbs first.
- **Numbers win.** If a fact is quantitative, lead with the number. "2,847 leases parsed." Not "A large number of leases were parsed."
- **No exclamation points. No emoji.** (See Iconography.)
- **Error messages are honest.** "Couldn't read page 7 — image is too low‑res to OCR." Not "Oops! Something went wrong."

### Casing
- **Sentence case everywhere** — buttons, nav, section titles, table headers, modal titles. (Title Case reads like a 2014 SaaS app.)
- **ALL CAPS** is reserved for category/eyebrow labels (`CAPITAL STACK`, `DEBT METRICS`) and is always tracked out ~0.08em.
- **Monospace** for field names, codes, IDs: `unlevered_irr_pct`, `MMC‑142`, `deal_id: 8b3f…`.

### Copy examples (from brief and spec)

| Good | Bad |
|---|---|
| "Review 24 extracted inputs." | "We found some items you might want to check!" |
| "Confirm to run the model." | "Looks good? Let's keep going 🚀" |
| "Source: rent roll, p. 14." | "AI‑powered extraction ✨" |
| "Hermes replaces ARGUS." | "The next generation of CRE tech." |
| "Couldn't size the debt — DSCR constraint is binding at 1.20×." | "Something went wrong. Please try again." |
| "IRR 14.3%  (unlevered 9.1%)" | "Great returns! 🎯 IRR is 14.3% 📈" |

### Number formatting
- **Percentages:** one decimal by default (`14.3%`), two for cap rates (`5.25%`), zero for big summary metrics where precision is noise.
- **Currency:** `$12.4M`, `$847K`, `$1.2B`. Full precision (`$12,412,506`) only in export packs and line‑item tables.
- **Multiples:** `2.1×` (× not x, no space).
- **Ranges:** `5.0–5.5%` (en dash, no spaces).
- **Negative:** parentheses in tables (`(412,000)`), minus sign inline (`−$412K`).
- **Tabular numerals.** Always. Financial figures must align vertically.

---

## Visual Foundations

### Palette
Two‑mode system. Dark is the default (analysts keep the workspace open all day); light is a first‑class citizen for print‑style exports and daylight environments.

- **Ink (dark mode base):** a deep, slightly‑cool charcoal. Not black — near‑black with a navy bias so white text reads warm and documents have depth. Primary surface is `#0C0F14`; elevated cards `#141821`; borders `#1F2430`.
- **Parchment (light mode base):** off‑white with a warm cast, reminiscent of a well‑typeset financial report. Primary surface `#F7F5F0`; cards `#FFFFFF`; borders `#E4DFD4`.
- **Amber (accent):** burnt, cognac‑leaning orange. Warm and decisive, **not** electric. Core `#C3702A`; hover `#D38236`; press `#A55E22`; tint `#F5E6D3`. Used sparingly — CTAs, active row indicators, key‑figure highlights, selection chrome. Never for decoration.
- **Semantic:**
  - Positive / green `#3E8E5F` (desaturated — this is a financial tool, not a garden)
  - Caution / amber‑yellow `#B88A2A` (distinct from the accent — used for "medium confidence" only)
  - Critical / red `#B8432A` (same warmth family as the accent; no pure red)
  - Info / slate `#5A7390`
- **Data viz scale:** amber anchors the brand hue; complemented by cool navy, slate, and a muted teal. No rainbow palettes.

**Accent discipline.** At any given screen: amber should cover no more than ~5% of pixels. If a screen feels "orange," you've overused it.

### Typography
- **Display / UI:** Inter, variable weight. Geometric sans with strong numerals. Default weight 450 for body, 550 for emphasis, 600 for headings.
- **Mono:** JetBrains Mono for codes, field names, IDs, and — crucially — every financial figure where column alignment matters.
- **Tabular numerals on by default** in Inter via `font-variant-numeric: tabular-nums`.
- **Scale** (1.200 minor‑third ratio):
  - `display` 48 / 56, weight 600, tracking −0.02em
  - `h1` 32 / 40, weight 600, tracking −0.015em
  - `h2` 24 / 32, weight 600
  - `h3` 18 / 28, weight 550
  - `body` 14 / 22, weight 450 (default)
  - `body-sm` 13 / 20
  - `caption` 12 / 16, weight 500
  - `eyebrow` 11 / 14, weight 600, `letter-spacing: 0.08em`, uppercase
  - `mono-sm` 12 / 18
  - `mono` 13 / 20
- **Line length:** body copy capped at ~72ch; table cells use the column width.

### Density
Medium‑high. This is a power tool.
- Default row height in dense tables: **32px**. In comfortable tables: **40px**.
- Form field height: **32px** default, **36px** for primary surfaces, **28px** for inline edits in a grid.
- Base spacing unit: **4px**. Common steps: 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Section padding: **24px** small, **32px** medium, **48px** large.

### Backgrounds
- **No gradients** on surfaces. Flat inks only.
- **One exception:** a subtle 0 → 4% opacity vertical wash on the full‑bleed marketing hero, ink → ink. Barely perceptible; adds depth without announcing itself.
- **No illustrations.** No pattern fills. No hand‑drawn anything.
- **Imagery, when used,** is desaturated architectural photography — CRE assets, skylines — treated with a slight cool tint and ~15% warm grain overlay to match the amber accent family. Photo is used rarely: marketing hero, case study cards.

### Motion
Minimal and purposeful. The brief is explicit: "the interface should feel fast."
- **Durations:** 120ms for state changes (hover, focus, press), 180ms for small reveals (menu open, tooltip), 240ms max for anything larger.
- **Easing:** `cubic-bezier(0.2, 0, 0, 1)` (decelerate) for entering; `cubic-bezier(0.4, 0, 1, 1)` (accelerate) for exiting.
- **No bounces, no spring overshoot, no decorative fades.** Skeletons used only when a task exceeds 400ms; otherwise show the result.
- **Number transitions:** when a computed value updates, tween the digits (200ms, linear) — no flash. This reinforces "show the work."

### Interaction states
- **Hover:** background shifts by ~4% luminance (lighter in dark mode, darker in light). No scale transforms.
- **Press / active:** background shifts by ~8% luminance. 1px translateY(0) — no shrink.
- **Focus:** 2px outline in amber at 60% opacity, 2px offset. Never removed.
- **Disabled:** 40% opacity; `cursor: not-allowed`; no pointer events.
- **Selected row in a table:** 2px amber left border + amber tint background (4% opacity). The row stays selected until dismissed.

### Borders & separators
- **Hairline borders** are the workhorse: `1px solid var(--border)` everywhere. Tables, cards, panels, inputs.
- **2px borders** reserved for selection state and active tab underlines.
- **No double borders.** If two bordered surfaces meet, collapse to one.

### Shadows & elevation
Elevation is expressed primarily through **border color and background ink**, not drop shadows. Shadows are reserved for floating surfaces (menus, popovers, modals).
- `shadow-0` — no shadow. Most surfaces.
- `shadow-1` — menus / dropdowns: `0 4px 12px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.08)` (dark mode scales opacity up ~1.5×).
- `shadow-2` — modals / overlays: `0 16px 48px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)`.
- No colored shadows. No glow effects.

### Transparency & blur
- **Modal scrim:** rgba(0,0,0,0.56) + 4px backdrop‑blur. Used for true modals only, not sheets or side panels.
- **Side panels** slide over content without scrim; they use `shadow-2` on their inner edge.
- **Sticky headers** inside scroll regions gain a `rgba(surface, 0.88)` fill with 12px backdrop‑blur so content reads through as it scrolls.

### Corner radii
Restrained — this is a terminal, not a consumer app.
- `radius-none` — 0. Tables, data grids, full‑bleed panels.
- `radius-sm` — 4px. Inputs, small buttons, chips, badges.
- `radius-md` — 6px. Cards, menus, modals, primary buttons.
- `radius-lg` — 10px. Marketing hero cards, feature blocks.
- **Never** above 12px. No pill buttons except for compact filter chips.

### Card anatomy
- Background: `--surface-2` in dark, `--surface-1` in light (white).
- Border: `1px solid var(--border)`.
- Radius: 6px.
- Padding: 16px compact, 24px default.
- No shadow by default. Shadow only when the card is floating (e.g. dragged).
- Header: eyebrow label (11/14, uppercase, tracked) + h3 title + optional `—` subtitle in `--fg-2`.

### Layout rules
- **12‑column grid** on marketing. On the app, a three‑region shell: **left nav (56px or 240px collapsed/expanded) / main / right inspector panel (360px, collapsible)**.
- **Fixed top chrome** — 48px app bar with deal picker and user menu. Never scrolls.
- **Breakpoints (app):** 1280 / 1440 / 1680 / 1920 wide workstation first. Minimum supported 1200.
- **Content max‑width** on marketing: 1200px (1280 with gutters).

### Iconography vibe
Neutral, functional, 1.5px stroke, 20px default. See Iconography section below.

---

## Iconography

**System:** **Lucide** (1.5px stroke, geometric, matches Inter's proportions and the restrained visual tone). Loaded from CDN — `https://unpkg.com/lucide@latest`. Sized at **16px** (dense UI), **20px** (default), **24px** (marketing).

Why Lucide: open source, comprehensive, stroke‑weight matches brand, and it's what the Next.js 16 + React 19 ecosystem already reaches for. No custom icon system exists in the repo yet — this substitution is **intentional, not a compromise**.

### Rules
- **Stroke only.** No filled icons except for state indicators (selected row marker, filled dot for active status).
- **Color follows text color** by default. Amber only when the icon indicates an action or active state — not decoratively.
- **Alignment:** icons sit optically centered with text. Add `vertical-align: -2px` inline; in flex rows use `align-items: center`.
- **Never decorative.** Every icon should replace or clarify a label. Don't add an icon to every heading.
- **No emoji. No unicode glyphs as icons.** (The brief rules these out, and the audience is finance professionals.)
- **State indicators:** the three‑tier confidence flag system uses colored dots (●), not emoji or traffic lights.

### Key icons in the app
- File upload: `upload-cloud`
- Document: `file-text` (generic), `file-spreadsheet` (Excel), `file-image` (scans)
- Deal / property: `building-2`
- Financial: `trending-up`, `percent`, `dollar-sign`, `coins`
- Actions: `chevron-down`, `arrow-right`, `search`, `filter`, `more-horizontal`
- States: `check`, `x`, `alert-triangle`, `info`, `circle` (filled for status dots)
- Nav: `layout-grid`, `folder`, `settings`, `book-open`

### Logo
A wordmark logo is provided in `assets/hermes-logomark.svg` and `assets/hermes-wordmark.svg`. The wordmark is Inter Display at 600 weight, tracked −0.04em, with a minimal amber "H" glyph as the mark. Minimum size: 20px tall for the mark, 80px wide for the wordmark. Always on either `--surface-1` or `--surface-2` — never on amber.

---

## Caveats & Flags

- **Font substitution:** Inter is the primary — `.woff2` files included for local loading plus a Google Fonts fallback. JetBrains Mono likewise. If the brand wants a more editorial face (e.g. GT America, Söhne), swap via `colors_and_type.css` variables.
- **Icon substitution:** Lucide is chosen as a reasonable default (see above). If the team has a custom set planned, swap in assets and I'll update the kit.
- **The codebase has effectively no UI yet** — the one real surface is a marked‑as‑temporary stub. This design system is the **first committed visual direction**, grounded in the design brief rather than mirroring existing production code.
