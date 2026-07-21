# Logo proposals

Four logo directions built from the tokens already in `DESIGN.md` (Barlow
Condensed, Inter, the coral accent, `--r-lg`/pill shapes) — no new icon set,
illustration, or gradient, per Principle 2 ("identity lives in type and color,
not chrome").

Open `preview.html` in a browser to see all four on both light-paper and
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

## Starting recommendation

**B for the wordmark, C for the icon.** B costs nothing to learn since it
reuses a pattern the app already teaches; C exists because something square
and legible at 16–32px is a real, separate requirement a wordmark can't meet.
A and D remain viable alternates.

Nothing here has been wired into the app — this is proposals only. Adopting a
direction means replacing `public/favicon.svg` and regenerating
`public/pwa-192.png`, `public/pwa-512.png`, and `public/pwa-512-maskable.png`
from whichever mark is chosen.
