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
- **G — Sun in a sync arrow (5 iterations).** A sync arrow (every) circling a
  sun (day): the app's own name as one square glyph. All five share a 64-unit
  grid, stroke weight and arrowhead geometry:
  - `icon-g1-as-sketched.svg`: one arrow, rounded-square core, eight rays.
  - `icon-g2-round-sun.svg`: same, with a circular core.
  - `icon-g3-two-arrow-sync.svg`: two chasing half-loops (the standard sync glyph).
  - `icon-g4-solid-core.svg`: filled core, alternating ray lengths.
  - `icon-g5-favicon-cut.svg`: four rays and a heavier core, for 16–32px.

- **G2, refined: round sun, single arrow (5 iterations).** Fixes G2's
  off-centre arrowhead. Its head pointed along the circle's tangent at the
  tip, while the line feeding it was still curving, so the head sat about 6°
  outward and the line met the side of the "V". Now the line ends in the
  middle of the head's base and the head continues in the line's direction.
  - `icon-g2-r1-chevron-centred.svg`: chevron rebuilt to sit evenly across the ring.
  - `icon-g2-r2-solid-head.svg`: solid head, arrow on the right as sketched.
  - `icon-g2-r3-solid-head-gap-at-top.svg`: gap moved to 12 o'clock, balanced left-to-right.
  - `icon-g2-r4-solid-sun-solid-head.svg`: as R3 with a filled sun.
  - `icon-g2-r5-small-size-cut.svg`: six rays and a bigger sun, for 16–32px.

## Starting recommendation

**R4 for the icon, R5 as its small-size version, F for the wordmark.** The
solid head hides the join between line and arrowhead, the gap at 12 o'clock
keeps the glyph balanced, and the filled sun stops the head from being the
only heavy shape. Eight rays blur below about 32px, so R5 is the browser-tab
version. R2 is the same fix with the arrow on the right, as in the original
sketch. Everything else stays as an alternate.

Nothing here has been wired into the app — this is proposals only. Adopting a
direction means replacing `public/favicon.svg` and regenerating
`public/pwa-192.png`, `public/pwa-512.png`, and `public/pwa-512-maskable.png`
from whichever mark is chosen.
