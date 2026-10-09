# MerchFrom design tokens

One source of colour, type, space, radius, z, motion and material for both apps (`website-v3/` and `platform/`). Written in WP2b of the Round 9 "Pressroom Terminal" plan (`Documentation/Dev/Website-v3-Round9-Pressroom-Terminal-Plan.md`, sections 3-5). WP21 finishes this README.

## How an app uses it

In the app's `app/globals.css`, in this order:

```css
@layer theme, base, legacy, components, utilities;  /* before any @import */
@import "tailwindcss";
/* platform: tw-animate and shadcn imports here */
@import "../../design-tokens/index.css";
/* website only: legacy partials */
/* then rules: @theme inline { ... } and the rest */
```

Tailwind v4's PostCSS plugin inlines the relative import, so no `turbopack.root` or `outputFileTracingRoot` is needed (verified for website-v3 in `next dev` and `next build`). Deploy caveat and the sync-copy fallback: see the header of `index.css` and `sync.mjs`.

Set the theme on `<html data-theme="ink">`. A paper insert is any element with `data-theme="paper"`. The app's font loader sets `--ff-display`, `--ff-mono`, `--ff-body` on `<html>`.

## Files

| File | Layer | Owner | Contents |
|---|---|---|---|
| `index.css` | - | WP2b | imports, in order; the import route and deploy check record. Never edited again. |
| `primitives.css` | 1 | WP2b | raw `--p-*` values. Components never read these. |
| `semantic.css` | 2 | WP2b | `:root, [data-theme='ink']`, then `[data-theme='paper']` |
| `type.css` | 2/3 | WP2b, values WP4 | per-face metric block, `--t-*` scale, `.t-*` classes |
| `material.css` | 2/3 | WP2b | `.mf-grain`, `.mf-misreg`, `.mf-misreg-outline`, `.mf-outline`, `.mf-halftone-screen`, `.mf-regmark`, `.mf-glass` |
| `base.css` | - | WP2b | focus ring, selection, `.sr-only`, `.skip-link`, forced-colors, more contrast, reduced transparency, reduced motion |
| `components.css` | 3 | WP6a | `.mf-btn`, `.mf-field`, `.mf-chip`, `.mf-card`, `.mf-spec-row` (stub until then) |
| `components-controls.css` | 3 | WP6c | `.mf-toggle`, `.mf-swatch`, `.mf-tab`, `.mf-dialog` (stub) |
| `components-frame.css` | 3 | WP8 | `.mf-appframe` (stub) |
| `stamp.css` | 3 | WP6b | `.mf-stamp` (stub) |
| `tailwind-theme.css` | - | WP2b | `@theme inline` map: `bg-bg`, `text-fg`, `border-rule`, `bg-brand-fill`, `font-display`, ... |
| `contrast-pairs.json` | - | WP2b, appended by any WP | token-name pairs checked by `website-v3/scripts/contrast.mjs` |
| `LICENCES.md` | - | WP3/WP4 | font licences (stub) |
| `sync.mjs` | - | WP2b | fallback only: copy into an app when a deploy cannot see this folder |

## Layers

1. **Primitives** `--p-*`: ink set, paper set, accent (`--p-accent*`, interim monochrome), misregistration and live-dot tones, states, chart, space `--p-s-1..10`, radius `--p-r-0..3`, z `--p-z-*`, motion `--p-dur-*` / `--p-ease-*`.
2. **Semantic**, re-scoped by `data-theme`: `--bg`, `--bg-raised`, `--bg-surface`, `--well`, `--fg`, `--fg-soft`, `--fg-muted`, `--dim`, `--hairline` (decorative), `--rule` (structural, 3:1+), `--brand`, `--brand-fill`, `--on-brand`, `--focus`, `--misreg`, `--live`, `--halftone-dot`, `--halftone-blend`, `--grain-opacity`, `--scrim`, `--danger`, `--warning`, `--success`.
3. **Component** tokens live with their component (`--btn-h-*`, `--field-h`, `--hit`, `--appframe-r`, `--glass-*`, ...).

Rules:

- Brand names are `--brand`, `--brand-fill`, `--on-brand`. Files in this folder never define or read shadcn names (`--accent`, `--muted`, `--border`, `--ring`, `--primary`, `--input`, `--card`, `--popover`, `--secondary`, `--destructive`). The platform maps shadcn names onto these tokens one way, in its own `globals.css`.
- Legacy website names (`--paper`, `--signal`, `--soft`, `--muted`, `--bone`, `--font-condensed`, `data-theme="vintage"`) live only in `website-v3/app/styles/tokens-legacy.css` until WP21.
- Accent colour only flows through `--brand`, `--brand-fill`, `--on-brand`, `--focus`, `--misreg`, `--live` (see "Accent" below). Never hard-code an accent hex or name a colour in a class.
- Every theme block declares every semantic token. A `var()` is resolved where it is declared, so a token declared only on `:root` would not follow a nested theme.
- No raw hex outside this folder and `website-v3/lib/theme-colors.ts` (plus the OG/icon files).

## Accent

The accent is **interim monochrome** (owner decision 9 Oct 2026; the first accent was rejected): `--brand` and `--brand-fill` are bone on ink and ink on paper, `--on-brand` is the opposite, `--focus` is bone on ink and ink on paper. The primary Button is therefore the bone-filled one on ink; the "exactly one primary action per viewport" rule still holds. `--misreg` (the 2px print-offset copy behind `.mf-misreg` / `.mf-misreg-outline` and the fg-tone stamp) is a mid grey that shows against both the letterform and the ground. `--live` is the live-agent dot colour (`.mf-live` adds the pulse); in monochrome it is the full-strength foreground, so state is carried by the pulse and a text label, never colour alone.

To set an accent: edit the `--p-accent*` primitives (ink: `--p-accent-ink`, `--p-accent-ink-fill`, `--p-on-accent-ink`; paper: `--p-accent-paper`, `--p-accent-paper-fill`, `--p-on-accent-paper`) and the `--misreg` / `--live` primitives, and, if the accent is fill-only on paper, point paper `--brand` at a text-safe tone and re-add the `forbid` rules in `contrast-pairs.json`. The semantic lines in `semantic.css` (`--brand`, `--brand-fill`, `--on-brand`, `--focus`, per ground) change only if a ground needs a different mapping. Run `npm run verify:contrast` and `npm run verify:budgets` after. Candidates are compared on `/dev/specimen?c=1&only=accent` (`a=none|lime|cobalt|violet|chrome`); "Copy decision" there prints `accent=<id>`.

## Swap a face (WP4)

1. Change the loader in the app's `lib/fonts.ts` (the only file that imports faces); keep the variable names `--ff-display`, `--ff-mono`, `--ff-body`.
2. Edit only the metric block at the top of `type.css`: `--type-*` stacks, `--display-weight`, `--display-tracking`, `--display-lh`, `--display-pad`, `--display-fit`, `--display-stroke`, `--mono-size`, `--mono-track`.
3. No component file changes. `--font-display` / `--font-mono` / `--font-body` (what components read) point at `--type-*`; Tailwind's `@theme inline` map points at `--type-*` too, so there is never a circular `--font-display: var(--font-display)`.

## Add a token

1. Raw value: add a `--p-*` primitive.
2. Themed meaning: add the semantic token to BOTH blocks in `semantic.css` (and to the `vintage` alias in `website-v3/app/styles/tokens-legacy.css` while it exists).
3. If it is a text or ground colour, append its pairs to `contrast-pairs.json` and run `node website-v3/scripts/contrast.mjs`.
4. Run `node website-v3/scripts/verify/check-tokens.mjs --files <your files>`.
