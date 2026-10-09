# Verification scripts (Round 9)

Run from `website-v3/`. The dev server is expected at `http://localhost:3004`.

## Stamp and accent budgets (WP6b)

The stamp is the Mornsey word in `components/ui/Stamp.tsx` (plan 4.5). The brand
accent is scarce on purpose. These rules are checked by two scripts.

| Rule | Limit | Checked by |
|---|---|---|
| `<Stamp` JSX reachable from one page (its imports, layouts and templates) | at most 2 | `verify:stamps` (static) |
| `[data-stamp]` elements in one viewport | at most 1 | `verify:budgets` |
| Brand pixel share per viewport (pixels within +-12 per channel of the runtime-resolved `--brand-fill`; skipped with a note while the accent is monochrome) | fail above 6%, warn above 5% | `verify:budgets` |
| `.mf-btn[data-variant='primary']` in one viewport | at most 1 | `verify:budgets` |
| Every glyph of every stamp string, all locales | present in `Assets/Fonts/Mornsey-PUA.ttf` cmap | `verify:stamps` |

**The viewport rule.** A "viewport" is one scroll position of a 1440x900 or a
390x844 window. `check-budgets.mjs` scrolls each route one full viewport height
at a time (no overlap), and measures the elements intersecting that window and
the pixels of that screenshot. An element counts if any part of it is inside
the window. A design that needs two stamps, two primary buttons or a bigger
accent field in one window has to move one of them below the fold, or drop it.

### `verify:stamps`

```
npm run verify:stamps                      # all locales and all pages
npm run verify:stamps -- --text 'ÀÇ¿'      # also check an ad-hoc string (this one fails: no inverted ?)
npm run verify:stamps -- --max 2           # per-page cap (default 2)
```

The script re-executes itself under `tsx` so it can import `lib/stamps.ts`.
Missing glyphs fail the run. Mornsey has no Latin Extended-A and no inverted
punctuation; keep stamp words within Basic Latin + Latin-1. The shipped font
(`app/fonts/Mornsey.woff2`) is a Basic Latin + Latin-1 subset of that TTF.

### `verify:budgets`

```
npm run verify:budgets
npm run verify:budgets -- --routes /,/about --lang de --out .verify/budgets
```

Flags: `--base`, `--routes a,b,c`, `--lang`, `--settle <ms>` (default 700),
`--max-shots`, `--out <dir>` (keeps each step's PNG). Prints one row per route,
viewport and scroll step, then a summary; exits 1 if any row fails.

Mornsey must be requested only on routes that render a Stamp. `Stamp.tsx` is
the sole importer of `components/ui/stamp-font.ts` (`next/font/local`,
`preload: false`).
