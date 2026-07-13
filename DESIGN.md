# DESIGN.md — Everyday Fitness

The design language for Everyday Fitness. This is the source of truth for
styling and design decisions. When a visual choice is ambiguous, this document
wins. Update it when the direction changes — don't let the code drift from it
silently.

---

## 1. Design principles

1. **Warm & human, with presence.** The app should feel personal and
   approachable, not clinical — but it is not shy. It has a clear point of view
   and a recognizable identity. Warmth comes from color and paper; presence
   comes from type.

2. **Identity lives in type and color, not chrome.** We deliberately do *not*
   lean on icon sets, decorative illustration, gradients, or busy chart styling.
   A confident condensed typeface and a warm accent against a cool ink anchor
   carry the brand. Everything else stays quiet.

3. **Refined, not flashy.** Follow platform conventions where they serve the
   user. Take a clear stance on type and color; be conventional everywhere else.
   Polish over novelty.

4. **Different rooms, one house.** Screens are allowed different densities.
   **Log** is calm and spacious — a focused moment. **Dashboard** is dense and
   data-first — the numbers are the hero. They share tokens, type, and color so
   they still feel like one app.

5. **Focused & in control.** The core loop (open → log → see trend → leave) must
   feel fast and unambiguous. Never make the user hunt. No emotional pressure on
   the act of logging.

6. **No judgment on the body.** Weight going up is not "bad" and down is not
   "good." Color communicates *direction relative to the user's goal*, never a
   moral verdict. Red is reserved for destructive UI actions only (see §5).

7. **Local-first discipline extends to design.** No external runtime
   dependencies for the look — fonts are self-hosted and bundled, never fetched
   from a CDN. The app must look correct fully offline, first paint included.

---

## 2. Color

Structure is **cool ink**, background is **warm paper**, the hero accent is a
**warm coral/orange**. This tension — cool text on warm ground with a hot accent
— is the core of the palette. Both light and dark are first-class; neither is an
afterthought.

### Light mode

| Token            | Hex        | Role                                             |
| ---------------- | ---------- | ------------------------------------------------ |
| `--bg`           | `#FBF9F6`  | App background — warm paper, never pure white    |
| `--surface`      | `#F4F0EB`  | Cards, inputs, chips (resting)                   |
| `--surface-2`    | `#EBE5DD`  | Nested / pressed surfaces                        |
| `--border`       | `#E5DFD7`  | Hairlines, dividers, input borders               |
| `--text`         | `#4B4E57`  | Body text (cool gray)                            |
| `--text-h`       | `#1C1E24`  | Headings, numbers, emphasis (cool near-black)    |
| `--text-muted`   | `#8A8B93`  | Captions, secondary labels                       |
| `--accent`       | `#E85A2C`  | Primary warm accent — CTAs, active state, brand  |
| `--accent-press` | `#CC4C22`  | Accent pressed / hover                           |
| `--accent-soft`  | `#FBE6DC`  | Accent-tinted fills (chip bg, subtle highlight)  |
| `--ink`          | `#23262F`  | Cool structural fill (e.g. filled dark elements) |
| `--danger`       | `#C8443C`  | Destructive actions & validation errors ONLY     |

### Dark mode

| Token            | Hex        | Role                                             |
| ---------------- | ---------- | ------------------------------------------------ |
| `--bg`           | `#15171C`  | App background — deep cool charcoal              |
| `--surface`      | `#1E212A`  | Cards, inputs, chips (resting)                   |
| `--surface-2`    | `#282C37`  | Nested / pressed surfaces                        |
| `--border`       | `#2F333E`  | Hairlines, dividers, input borders               |
| `--text`         | `#A2A5AF`  | Body text (cool gray)                            |
| `--text-h`       | `#F4F2EF`  | Headings, numbers, emphasis (warm white)         |
| `--text-muted`   | `#71747E`  | Captions, secondary labels                       |
| `--accent`       | `#FF6F43`  | Primary warm accent — brightened to hold on dark |
| `--accent-press` | `#FF855F`  | Accent pressed / hover                           |
| `--accent-soft`  | `#3A2418`  | Accent-tinted fills                              |
| `--ink`          | `#F4F2EF`  | Inverse structural fill                          |
| `--danger`       | `#E5675E`  | Destructive actions & validation errors ONLY     |

### Rules

- **The accent is precious.** One warm accent per screen state. If everything is
  accent-colored, nothing reads as actionable. Use `--accent-soft` for tints.
- **Backgrounds carry warmth in light mode** (`#FBF9F6`, not `#FFFFFF`) and
  **coolness in dark mode.** Do not flatten to neutral grays.
- **Contrast:** all text meets WCAG AA (≥4.5:1 body, ≥3:1 large/UI). Verify
  `--text` on `--surface`, not just on `--bg`.
- **Semantic direction color:** see §5. Do not introduce green/red for weight.

---

## 3. Typography

A **condensed athletic display** face for headings and numbers gives the app its
presence; a **clean humanist body** face keeps everything legible. This pairing
is the single strongest expression of the brand.

### Faces

- **Display — condensed athletic. → Barlow Condensed (decided).** Humanist
  warmth + athletic condensation. Used for: screen titles, the hero weight
  number, stat values, nav labels. Ship weights 500/600 (700 for rare emphasis).
- **Body — clean humanist sans. → Inter (decided).** Excellent tabular figures,
  neutral, reliable. Used for: paragraphs, list rows, form labels, helper text,
  buttons.

Fallback stack for both: `system-ui, 'Segoe UI', Roboto, sans-serif`.

> **Offline requirement:** self-host and bundle the chosen fonts (subset to the
> Latin glyphs we use). Never `@import` from Google Fonts or any CDN — it breaks
> the offline-first guarantee and adds a network request. Use
> `font-display: swap` with the system fallback so first paint is instant.

### Type scale

| Token        | Font    | Size / line | Weight | Notes                                   |
| ------------ | ------- | ----------- | ------ | --------------------------------------- |
| `hero`       | Display | 64 / 1.0    | 600    | The big weight number on Log            |
| `stat`       | Display | 30 / 1.05   | 600    | Dashboard stat-card values              |
| `h1`         | Display | 28 / 1.1    | 600    | Screen titles                           |
| `h2`         | Display | 20 / 1.15   | 600    | Sheet / section titles                  |
| `body`       | Body    | 16 / 1.5    | 400    | Default text                            |
| `body-strong`| Body    | 16 / 1.5    | 600    | Emphasis, list weights                  |
| `label`      | Body    | 13 / 1.3    | 500    | Form labels, helper text                |
| `overline`   | Display | 12 / 1.2    | 600    | Stat labels & nav — UPPERCASE, +0.06em  |

### Rules

- **Numbers are always tabular:** `font-variant-numeric: tabular-nums` on every
  weight, stat, delta, and axis value. Non-negotiable — data must not jitter.
- **The athletic touch = the overline.** Stat labels and nav labels are the one
  place we go UPPERCASE with letter-spacing. This is how we get "sporty" without
  icons or loud color. Do not uppercase body text or titles.
- **Headings use display, sentence case** (not uppercase). Reserve uppercase for
  `overline`.
- Never fake bold/condensed with `transform: scale`. Ship the real weights.

---

## 4. Space, shape & elevation

Density is **contextual** (Principle 4). One spacing scale, applied loosely on
Log and tightly on Dashboard.

### Spacing scale (4px base)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`

- **Log (calm):** section gaps `24–32`, generous input padding, room to breathe.
- **Dashboard (dense):** card gaps `8–12`, tighter padding — fit the data.

### Radius

| Token          | Value   | Use                                          |
| -------------- | ------- | -------------------------------------------- |
| `--r-pill`     | `999px` | Chips, toggles, unit selector, pill buttons  |
| `--r-lg`       | `20px`  | Log surfaces, bottom sheets, calm cards      |
| `--r-md`       | `14px`  | Dashboard cards, dialogs, inputs             |
| `--r-sm`       | `10px`  | Small controls, steppers                     |

Log leans on `--r-lg` + pills (soft, human). Dashboard leans on `--r-md`
(efficient). Consistent within a screen.

### Elevation

- **Log & sheets:** prefer a **soft shadow** over borders — warmer, more
  physical. `--shadow-soft: 0 6px 24px rgba(30,20,10,0.08)` (light) /
  `0 6px 24px rgba(0,0,0,0.4)` (dark).
- **Dashboard:** prefer **hairline borders** (`--border`) over shadows — keeps
  dense layouts crisp and flat.
- Bottom sheet & modal overlays: `rgba(0,0,0,0.45)` scrim, content on `--bg`.
- Never mix a heavy shadow *and* a strong border on the same element.

### Layout

- Single centered column, `max-width: 480px` (unchanged — mobile-first PWA).
- Respect `env(safe-area-inset-*)` top and bottom (notch + home indicator).
- Minimum touch target **44×44px** for every interactive element.

---

## 5. Semantic color for weight change

This encodes Principle 6. Implement it as tokens, not ad-hoc colors.

| Situation                         | Treatment                                             |
| --------------------------------- | ----------------------------------------------------- |
| Moving **toward** the user's goal | `--accent` (warm) + directional arrow — reads positive|
| Moving **away** from the goal     | `--text-muted` (neutral) + directional arrow — no red |
| No goal set                       | `--text` neutral + arrow showing direction only       |
| **Destructive action / error**   | `--danger` — the ONLY place red appears               |

- Direction is shown with an arrow/glyph **and** color, never color alone
  (accessibility + the no-judgment rule).
- "Toward goal" requires knowing the user's goal direction (lose/gain/maintain).
  If unknown, fall back to neutral. Do **not** assume down = good.
- Never use green. Progress is expressed in the brand's warm accent, which keeps
  "good" on-brand rather than importing a generic success color.

---

## 6. Motion

Purposeful and subtle. Motion clarifies; it never performs.

- **Durations:** 150ms (micro: press, toggle), 200–250ms (transitions: sheets,
  fades). Easing: `ease-out` for entrances, `ease-in` for exits.
- **Save confirmation:** a gentle, satisfying acknowledgement (e.g. the existing
  fade-in flash, refined) — reassuring, not celebratory. No confetti.
- **Chart:** line may draw/fade in once on mount. No looping or bouncing.
- **Sheets:** slide up from bottom; dialogs fade + subtle scale.
- **Always** honor `@media (prefers-reduced-motion: reduce)` — drop to instant
  or a plain fade.

---

## 7. Charts (Recharts)

Restrained and precise — the data is the identity, not the styling.

- **Line:** `--accent`, ~2px. **No gradient area fill** under the line.
- **Raw dots:** faint / small (`--text-muted` at low opacity) so the trend line
  reads as primary.
- **Trend / smoothed line:** `--accent` solid; raw series recedes behind it.
- **Goal line:** dashed `<ReferenceLine strokeDasharray>` in `--ink` /
  `--text-h` — clearly a target, not a data series. (Per stack: goal lines via
  dashed reference lines.)
- **Grid & axes:** minimal — muted `--border`, few ticks, tabular-nums labels.
- **Tooltip:** a small `--surface` card with `--r-sm`, hairline border, tabular
  numbers. No heavy drop shadow.
- Colors come from CSS variables so charts track light/dark automatically.

---

## 8. Components

Concrete intent per component. Exact values derive from the tokens above.

- **Screen title (`h1`):** display, `--text-h`, sentence case.
- **Hero weight input (Log):** `hero` display number, centered, tabular. The
  calm focal point — lots of surrounding space, soft surface, `--r-lg`.
- **Unit toggle / range chips:** pill group (`--r-pill`). Inactive =
  `--surface` + `--text`; active = `--accent` fill + white text. One active at a
  time.
- **Day picker:** quiet steppers (`--r-sm`), `--surface`. Disabled at 35%
  opacity.
- **Primary button (Save):** `--accent` fill, white text, `body-strong`,
  `--r-md`/pill, ≥44px tall, generous horizontal padding. Pressed = `--accent-press`.
- **Stat cards (Dashboard):** `--surface` + hairline `--border`, `--r-md`,
  tight. `overline` label (UPPERCASE) above a `stat` display value. Grid of 3.
- **History row:** `--surface`, `--r-md`, hairline border. Date in `--text`,
  weight in `body-strong` + `--text-h`, tabular. Initiative tag = small pill in
  `--accent` on `--accent-soft`.
- **Bottom sheet:** `--bg`, `--r-lg` top corners, `--shadow-soft`, slide-up,
  safe-area padding. `h2` centered title.
- **Confirm dialog:** centered, `--bg`, `--r-md`. Destructive confirm uses
  `--danger`; cancel is quiet (`--surface`).
- **Tab bar:** fixed bottom, `--surface`, top hairline. **Text-only, no icons.**
  Labels in `overline` (UPPERCASE, tracked) — this is where nav gets athletic
  presence. Active = `--accent`; inactive = `--text`.
- **Empty states:** brief, warm, human copy. Action word in `--accent`. Never a
  dead-end — always offer the next step (e.g. "Log your first weight").

---

## 9. Do / Don't

**Do**
- Let type and color do the branding work.
- Keep Log calm and spacious; keep Dashboard dense and legible.
- Use tabular numerals for every number.
- Self-host fonts; verify the look fully offline.
- Reserve the warm accent for what's actionable or on-goal.

**Don't**
- Introduce icon sets, illustrations, or gradient chart fills to "add life."
- Use green/red to judge weight direction. Red = destructive only.
- Use pure white backgrounds in light mode.
- Treat dark mode as a second-class recolor.
- Fake condensed/bold type with CSS transforms.
- Add motion that doesn't help the user understand something.

---

## 10. Decisions & open items

Locked:

- [x] **Display font: Barlow Condensed** (weights 500/600, 700 for rare
      emphasis). Chosen for humanist warmth + athletic condensation.
- [x] **Primary accent: Coral orange** — `#E85A2C` (light) / `#FF6F43` (dark),
      confirmed against the Log mock in both the accent and font swatch review.
- [x] **Body font: Inter** (chosen for reliable tabular figures + neutral
      legibility).

Still open:

- [ ] Fine-tune accent stops (`--accent-press`, `--accent-soft`) against real
      screens once implemented; the base accent is settled.
- [ ] Whether nav stays purely text or gets an optional minimal icon later
      (default per this doc: text-only).
