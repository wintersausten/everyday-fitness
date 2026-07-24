# Logo proposals

Seven logo directions built from the tokens already in `DESIGN.md` (Barlow
Condensed, Inter, the coral accent, `--r-lg`/pill shapes) — no new icon set,
illustration, or gradient, per Principle 2 ("identity lives in type and color,
not chrome"), with three deliberate exceptions (E, F, G) built as new glyphs.

Open `preview.html` in a browser to see all seven on both light-paper and
dark-charcoal grounds.

## Starting point

`public/favicon.svg` and the PWA icons are a generic purple/violet gradient
mark (`#863bff` / `#7e14ff` / `#47bfff`) that shares no color, shape, or type
with DESIGN.md — it reads as a leftover scaffold placeholder, not a designed
mark. None of the proposals build on it.

## Concepts

- **A — Wordmark, full stop.** `Everyday Fitness.` in Barlow Condensed 600,
  accent on the period only. The plainest expression of "type and color carry
  the brand."
- **B — Eyebrow / headline lockup.** `EVERYDAY` (overline) over `Fitness`
  (h1) — the same label-over-value pairing already used for every stat card
  and screen title, reused as the logo itself.
- **C — "EF" monogram badge.** Rounded-square badge, accent fill, condensed
  capitals. The one mark built for small sizes — browser tab, home-screen
  icon — where a wordmark doesn't work.
- **D — Daily-check wordmark.** Wordmark paired with the exact checkmark path
  from the Save-confirmation animation (`src/screens/LogScreen.tsx`) — stands
  for "you showed up today," not a verdict on the number, so it stays clear of
  the no-judgment rule in DESIGN.md §5/§6.
- **E — Cycle-to-chart mark.** A near-full circular loop (the daily repeat)
  breaks its own circumference and continues as a straight rising line ending
  in a small chart-arrow tip — "every day," but with progress — drawn as one
  continuous single-weight stroke. It stays abstract (a mark about the
  product's premise, not a plot of anyone's actual weight) so it doesn't run
  into the no-judgment rule either.
- **F — "Every Day" arrow-letterform wordmark.** The `E`'s spine is an upward
  arrow, the `D`'s spine a downward one — the exact ↑ / ↓ glyphs
  `StatCards.tsx` already draws for weight direction, built directly into the
  logotype (custom-drawn letters for `E`/`D`, real Barlow Condensed 600 for
  the rest). Both arrows share the same weight and color: up in "Every," down
  in "Day," neither singled out — the wordmark enacts §5/§6's no-judgment
  rule in its own structure, not just its copy.
- **G — Sun-in-repeat icon.** A repeat/cycle ring (every) wrapped around a sun
  (day) — the app's own name compressed into one square glyph. The sun's core
  is a rounded square rather than a circle, tying it to `--r-lg` and the
  Concept C badge language instead of reading as a generic weather icon.
  Verified legible down to a 28px favicon.

## Starting recommendation

**G for the icon, F for the wordmark.** Together they tell the same idea two
ways: G compresses "every" (the repeat ring) and "day" (the sun) into one
square glyph for favicon/home-screen use; F spells the same duality out as a
wordmark, using the app's own ↑/↓ direction glyphs as the E and D's spines.
Neither borrows an existing UI element wholesale — both are original marks
built from the system's shapes, type, and color. A, B, C, D, and E remain
viable alternates.

Nothing here has been wired into the app — this is proposals only. Adopting a
direction means replacing `public/favicon.svg` and regenerating
`public/pwa-192.png`, `public/pwa-512.png`, and `public/pwa-512-maskable.png`
from whichever mark is chosen.
