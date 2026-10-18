# Round 9: Pressroom Terminal design system and redesign (6 Oct 2026, rev. 2)

Status: plan, not yet executed. Supersedes Rounds 3-8 where they conflict on palette, accent, type and motion. The shipped tree at tag `pre-pressroom` (created in WP0) is the baseline.

Repo: `/path/to/blackout-merchandise`. Apps: `website-v3/` (Next 16, Tailwind v4, GSAP + Lenis, six locales) and `platform/` (Next, shadcn, AI Elements chat). App-page template chosen by the owner: `aurora-dashboard/index.html` (structure reference only).

Rule zero for every agent: `website-v3/AGENTS.md` says "This is NOT the Next.js you know". Read `node_modules/next/dist/docs` (next/font, metadata files, `pageExtensions`, CSS imports, Turbopack root) before touching any of them. Agents never type credentials or create accounts (see 11.12 for how platform pages are captured).

---

## 1. Why, and what survives

Diagnosis from the verified design review (`Documentation/Dev/Website-v3-Design-Review.md`):

- **It reads as a fashion magazine, not a platform.** Warm paper ground, light 300 weights, giant sentence-case type, a lifestyle photo on the fold and a luxury motion vocabulary hide the fact that this is an agent-run production platform. The hero has no product and no composer; the app (`platform/`) is never shown anywhere on the site.
- **Site and app are two products.** The platform forks the palette (`--paper #221f1c`), uses Helvetica, has no display face, 999/32/16/20/12px radii, and `--chart-1..5` all equal `var(--signal)`. There is no accent, so live/agent state has no signal.
- **No system under the pages.** About six button shapes, three forked input specs, four chip/selection treatments, about 210 inline style sites (GridView 55, ProductModal 52, SiteHeader 18, FilterDrawer 23), a 1327-line `globals.css` with a single `--well` defined three times, and no radius/space/z/motion tokens.
- **Critical a11y bug.** The cover brief input and the Apply email field have no focus indicator (`globals.css` ~646-652, an unlayered `outline: none` beating the global `:focus-visible`). Also 36px header targets, 1.3:1 hairlines, 2.44:1 disabled buttons, opacity-based dimming.
- **Density and tempo.** The same giant-word device is used on about eight bands, vertical padding is 96-120px, Lenis is 2.2s plus scrub 0.8, a 0.55s paper-sweep page transition, a cursor loop that never sleeps. The statement paragraph is scroll-scrubbed to grey with a low-contrast tail. Copy is polished/restrained ("premium", "eco-friendly", "Issue 01") and the strongest line ("Printed for the ones who play loud.") is not on the hero.

What survives from V3 (do not rebuild): Barlow as body/UI face; the Set List walkthrough; the squeegee wipe, outline-to-ink fill and halftone-to-tone metaphors; Halftone dot screen; the fitted BLACKOUT MERCHANDISE masthead device (cover and footer only); six-locale i18n structure; `lib/catalog-stats.ts` as the only source of numbers; the Round 8 approved copy lines; the dev-time rule "no placeholders on the live site"; the platform chat hooks (`useConversation`, `useVoice`, `lib/agent/*`, `lib/tools/*`), which this plan never edits.

---

## 2. Decisions table

Status key: **locked** (owner, 2026-10-06), **default** (adopted now, owner may override), **gate** (blocks work until the owner acts).

| # | Topic | Decision | Status |
|---|---|---|---|
| 1 | Art direction | PRESSROOM TERMINAL. Ink-first, product-first. Near-black ground `#0b0b0c` default; paper only as an insert for packshot grids, catalog, gallery tiles, product modal. App composer on the hero (fitted BLACKOUT MERCHANDISE masthead, one-sentence promise, 2-line composer, artist-specific chips). Framed app window showing chat > mockup > quote > proof approved. Mono spec metadata on cards, registration marks, halftone + grain + 2px misregistration. References (Linear, teenage engineering, Nothing) are principles only. | locked |
| 2 | Accent | HAZARD ORANGE, palette "P-A Hazard Press". On ink `#ff5a2c` (6.32:1, text-safe). On paper `#ff4a1c` is FILL ONLY (2.72:1); `#0b0b0c` text on it is 5.85:1; about `#e63a0c` for large text on paper. Budget 3-5% of a viewport. Used by site and app for primary CTA, live/agent state, focus (ink theme), selection. Reverses the Rounds 6-8 "no accent colour" rule. | locked |
| 3 | Display + mono face | NOT locked. WP3 specimen board is gate G1. Display: GC Grind, Anton (OFL), Big Shoulders Display 800/900 (OFL; loaded as `Big_Shoulders`, see 4.6). Mono: JetBrains Mono, Space Mono, Martian Mono, IBM Plex Mono (control). Everything swaps through ONE token pair (`--font-display`, `--font-mono`) plus a per-face metric block. Body/UI stays Barlow 400/500 (no 300) unless the specimen says otherwise. The specimen uses the real `FittedWord` and real `.t-*` classes but its own scoped sample markup for buttons, composer, card and spec row (G1 judges faces, not the production primitives). | gate |
| 4 | GC Grind licence | Zip has no licence file; name table says "(c) 2025 Glyphonic, all rights reserved"; no Latin Extended-A. Owner supplies receipt + webfont licence with a pageview tier, or the plan uses the runner-up. The file is excluded from production builds until the licence is recorded in `design-tokens/LICENCES.md`. | gate |
| 5 | Mornsey stamp layer | Owner confirms it is licensed. Capped stamp: max 1 per viewport, 2 per page, 64-160px, rotated -3 to -6deg, never in sentences, nav, buttons or labels; fixed EN-safe words or per-locale glyph-verified strings; WOFF2 via `next/font/local` only where used. Keys: `approved`, `proof`, `void`. | locked |
| 6 | Paper tone | Cooler newsprint `#e9e7e1` as an insert, not the ground. Header, footer, home, about, contact, waitlist, 404 are ink. Catalog grid, gallery tiles, product modal, home blanks teaser are paper inserts. | default |
| 7 | Platform theme | Dark (ink) only, same tokens as the site ink theme. Paper only for packshot/mockup surfaces inside the app. | default |
| 8 | Glass | CSS-only "ink glass" (`rgba(20,20,20,.72)`, 8px blur, hairline, 8% inset sheen) on composer and popovers only. No liquidGL in v1. Reject Aurora strands/beam, Arial, gradient text, Logoipsum, lil-gui, 24px radius. | default |
| 9 | Scroll feel | Lenis about 1.1 (fine pointer, 1024px+ only), scrub 0.2, page transition a hard ~200ms cut. Machine layer (stepped type-on, ticking counters, 160-240ms hard clip cuts) over kept print metaphors. Statement text never scrubs below `--fg-soft` (the grey scrub is deleted; statements reveal by hard clip cut). | default |
| 10 | Shared tokens | One source at `/design-tokens`, imported by relative CSS `@import` from both apps (no workspace package yet). Three layers: primitive, semantic (re-scoped by `data-theme`), component. next/font variables are `--ff-*`; semantic tokens are `--font-*`/`--type-*`; never write `--font-display: var(--font-display)`. Cascade-layer order is declared in each app's `globals.css` BEFORE any `@import` (see 3.1). Fallback if Turbopack refuses an out-of-root import: `turbopack.root`, then a prebuild sync script whose output is COMMITTED (not gitignored) so deploys with a per-app Root Directory still work. | default |
| 11 | Token naming | Canonical text-grey names `--fg`, `--fg-soft`, `--fg-muted`, `--dim`. The brand colour is **`--brand`** (text/large per theme), **`--brand-fill`**, **`--on-brand`**; these never collide with shadcn. Shared token files and shared CSS (`design-tokens/**`) must never define or read shadcn names (`--accent`, `--muted`, `--border`, `--ring`, `--primary`, `--input`, `--card`, `--popover`, `--secondary`, `--destructive`); `check-tokens` enforces it. The platform's `globals.css` maps shadcn names onto shared tokens one way (3.6). Legacy site names (`--paper`, `--signal`, `--soft`, `--muted`, `--bone`, `--scrim`, `--well`, `--font-condensed`, and `--accent` if the site uses it) live ONLY in `website-v3/app/styles/tokens-legacy.css` as aliases until WP21, so the platform never inherits them. | default |
| 12 | Theme model | `:root, [data-theme='ink']` is ink. `[data-theme='paper']` is the insert. `[data-theme='vintage']` is temporarily aliased to paper in `tokens-legacy.css` (so the catalog shows paper from WP2b), removed in WP21. | default |
| 13 | CTA grammar | Exactly ONE brand-filled action (Button `primary`) per viewport, enforced by a script check. Header Apply is Button `secondary` (outline) so the page's primary (hero composer send, product CTA, Apply band, form submit) owns the accent. One verb per context: composer "Start your brief", forms "Apply", catalog "Start with this blank". Brand state dots/labels (live agent) are state, not actions, and count only toward the pixel budget. | default |
| 14 | Hero composer | Client-side miniature of the app composer: 2-line textarea, square send, 4 artist chips. Keeps the current client-only BriefCard behaviour (no network submit) until the owner decides where briefs go. Enter sends, Shift+Enter newline. | default |
| 15 | Hero scene | The cover clip-path photo scene is retired from the fold. The cover photo becomes a static Halftone plate beside the composer. `ScrollScenes` cover block is null-guarded. The ProductBand's top edge peeks above 900px on desktop, so the page is product-first from the fold. | default |
| 16 | MCP "Soon" | Replace with an honest dated roadmap line. `lib/site.ts` exports one constant: `MCP_TARGET: string \| null` (ISO date or null). Row hidden if null; promise tied to the live brief flow. (No `SITE_FACTS.mcpTarget`.) | default |
| 17 | Copy voice | Blunt run/spec voice; no "premium", "eco-friendly", "Issue 01". Run and catalogue labels (`RUN 0042`, `MF-0001`) are FORMAT examples only: any rendered run number, city or SKU is built from `lib/site.ts` / `PRODUCTS` data, never typed into i18n strings (strings carry templates with params). Round 8 lines kept; "Printed for the ones who play loud." moves to the hero. All six locales; GOTS and OEKO-TEX stay as proof rows. | default |
| 18 | Proof content | Real artist names, price-from, MOQ, lead times, team, runs, city, MCP date render only when set in `lib/site.ts`; hidden otherwise. Numbers come from `lib/catalog-stats.ts`. The app-frame carries an EXAMPLE tag. No rendered placeholders. | default |
| 19 | Platform rail | Lists only routes that exist when WP18 runs. Projects, Designs, Orders, Shop, Agent become follow-up tickets, not stubs. | default |
| 20 | Fabric textures | `Assets/FABRIC TEXTURE` PNGs (25-33MB) never ship. Material is SVG grain only. A derived ~80KB weave WebP waits for owner licence/provenance confirmation. | gate |
| 21 | Radius | Site 0 by default; chips/fields 4px max; app window, ink glass, composer 8px max. Platform base 0.25rem; no pills. | default |
| 22 | Checkpoint | Before any code, owner approves committing current work on `feat/mainpage-redesign` (separate website-v3 and platform commits), or explicitly says to proceed on a dirty tree. Tag `pre-pressroom`. | gate |
| 23 | G2 direction gate | After wave 5 the owner reviews ONLY the listed slice surfaces (see G2). Outcomes: go / adjust (WP9p patch) / change direction. Waves 6+ do not start without it. | gate |
| 24 | Provisional face | If G1 is not answered, WP4 may lock provisional Anton + JetBrains Mono so the chain is not blocked; the real pick is then a one-token swap plus a re-shoot. | default |
| 25 | Gallery title | H1 "Printed work" (replaces "Work"); nav label "Gallery" stays and joins desktop nav. | default |
| 26 | Non-Latin-1 locales | pl/tr/cs not on the roadmap; replacement faces still load `latin-ext` for artist names. | default |
| 27 | Deploy of shared tokens | Import route recorded by WP2b (8 Oct): plain relative `@import "../../design-tokens/index.css"` right after `@import "tailwindcss"`; Tailwind v4 inlines it, so website-v3 needs no `turbopack.root`/`outputFileTracingRoot` (dev + build verified). Platform expected to behave the same (verify in WP11). Still open: owner confirms each app's Vercel Root Directory and "include files outside the root"; if that is off, run `design-tokens/sync.mjs` and commit its output. | gate |
| 28 | Platform capture | Platform pages need a session. Agents use only (a) routes reachable unauthenticated, (b) a dev-only fixture that already exists in the repo (`AGENT_MOCK=1`, any dev auth bypass `preflight.mjs` finds), or (c) a Playwright `storageState` file the owner places at a named scratchpad path. If none, platform shots are owner-captured and attached to the WP. | default |

---

## 3. Design tokens

### 3.1 Location and import

New folder `/path/to/blackout-merchandise/design-tokens/` (repo root; not in the root workspaces list).

| File | Layer | Owner WP | Contents |
|---|---|---|---|
| `index.css` | - | WP2b | imports of everything below, in order (no `@layer` order statement; see below) |
| `primitives.css` | 1 | WP2b | Raw `--p-*` values only; never used by components |
| `semantic.css` | 2 | WP2b | `:root, [data-theme='ink']`, then `[data-theme='paper']`; NO legacy aliases (those live in website-v3 `tokens-legacy.css`) |
| `base.css` | - | WP2b | focus ring, selection, forced-colors, prefers-contrast, reduced-transparency, reduced-motion (in `@layer base`) |
| `material.css` | 2/3 | WP2b | grain, misregistration, outline text, halftone dot, reg marks, ink glass |
| `type.css` | 2/3 | WP2b writes interim metric block (Barlow Condensed 700) and the FULL `.t-*` class set; WP4 only edits values | per-face metric block, scale, `.t-*` classes |
| `components.css` | 3 | WP6a | `.mf-btn`, `.mf-field`, `.mf-chip`, `.mf-card`, `.mf-spec-row` |
| `components-controls.css` | 3 | WP6c | `.mf-toggle`, `.mf-swatch`, `.mf-tab`, `.mf-dialog` |
| `components-frame.css` | 3 | WP8 | `.mf-appframe` |
| `stamp.css` | 3 | WP6b | `.mf-stamp` |
| `tailwind-theme.css` | - | WP2b | optional `@theme` mapping of semantic tokens |
| `contrast-pairs.json` | - | WP2b (append by any WP adding a pair) | fg/bg token-name pairs with minimum ratio |
| `LICENCES.md` | - | WP3/WP4 | font licence record (Mornsey, GC Grind status, OFL notices) |
| `README.md` | - | WP2b, WP21 | layers, how to swap a face, how to add a token |

WP2b creates every file above as a documented stub so later WPs own disjoint files and nobody edits `index.css` again.

**Import order and layers (corrected).** Tailwind v4 fixes `theme, base, components, utilities` when `@import "tailwindcss"` is processed, and every `@import` must precede other rules. So each app's `globals.css` is, in this order:

1. `@layer theme, base, legacy, components, utilities;` (an `@layer` statement may precede `@import`, and it fixes the order including `legacy` below `components` and `utilities`).
2. `@import "tailwindcss";` (platform: then tw-animate and shadcn imports).
3. `@import "../../design-tokens/index.css";`
4. (website only) `@import "./styles/<partial>.css" layer(legacy);` for each legacy partial, in original cascade order (A1 imports them unlayered; A2 adds `layer(legacy)`).
5. Only then rules: `@theme inline { ... }` and anything else.

New token files put rules in `base` or `components` layers. The global focus rule additionally carries `!important` on `outline`, with a documented opt-out attribute `[data-ring="custom"]` for primitives that draw their own ring. WP2a/WP2b verify with a built CSS inspection (the compiled layer order printed in the PR) that `legacy` sits below `components` and `utilities`.

### 3.2 Layer 1 primitives (`--p-*`)

Ink set: ink `#0b0b0c`, raised `#141414`, surface `#1e1e1e`, well `#050505`, bone `#f2efe8`, bone-soft `#d7d3ca`, bone-muted `#a8a49c`, bone-dim `#8a867e`, ink hairline `rgba(242,239,232,.14)`, ink rule `rgba(242,239,232,.42)`.

Paper set: paper `#e9e7e1`, paper-raised `#f2f0ea`, paper-surface `#dedcd4`, paper-well `#d3d1c9`, paper-ink `#0b0b0c`, paper-soft `#2b2926`, paper-muted `#5c5852` (5.71:1), paper hairline `rgba(11,11,12,.14)`, paper rule `rgba(11,11,12,.55)`.

Brand set: orange-on-ink `#ff5a2c`, orange-fill `#ff4a1c`, orange-large `#e63a0c`, on-orange `#0b0b0c`.

State colours: danger ink `#ff7a66` / paper `#b3261e`; warning `#d9a441` / `#8a5a00`; success `#7fae7a` / `#2f6b2a`.

Chart (platform): `#ff5a2c`, `#f2efe8`, `#8a867e`, `#5a5750`, `#ffb199`.

Space `--p-s-1..10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Radius `--p-r-0:0`, `--p-r-1:2px`, `--p-r-2:4px`, `--p-r-3:8px`. Z: base 0, grain 1, content 2, sticky 20, header 40, drawer 60, modal 80, cursor 90, skip 100, toast 110.

Motion: durations `cut 160ms`, `fast 200ms`, `base 240ms`, `reveal 480ms`, `scene 600ms`; eases `out cubic-bezier(.2,.8,.2,1)`, `step steps(8,end)`, `cut cubic-bezier(.7,0,.2,1)`.

### 3.3 Layer 2 semantic tokens

Selector order in `semantic.css`: `:root, [data-theme='ink'] { ... }` first, then `[data-theme='paper'] { ... }`. Nested re-scoping (`<div data-theme='paper'>` inside `<html data-theme='ink'>`) works because the inner element declares its own values; source order only matters when both land on the same element (for example `<html data-theme='paper'>`), which is why paper comes second.

| Token | Ink | Paper |
|---|---|---|
| `--bg` | `#0b0b0c` | `#e9e7e1` |
| `--bg-raised` | `#141414` | `#f2f0ea` |
| `--bg-surface` | `#1e1e1e` | `#dedcd4` |
| `--well` (one value) | `#050505` | `#d3d1c9` |
| `--fg` | `#f2efe8` | `#0b0b0c` |
| `--fg-soft` | `#d7d3ca` | `#2b2926` |
| `--fg-muted` | `#a8a49c` | `#5c5852` |
| `--dim` (replaces all opacity dimming; at least 4.5:1 on `--bg` and `--bg-raised` only) | `#8a867e` | `#5c5852` |
| `--hairline` (decorative only) | `rgba(242,239,232,.14)` | `rgba(11,11,12,.14)` |
| `--rule` (structural: controls, tiles, spec rows; 3:1+) | `rgba(242,239,232,.42)` | `rgba(11,11,12,.55)` |
| `--brand` (text-safe use only on ink; on paper large text only) | `#ff5a2c` | `#e63a0c` |
| `--brand-fill` | `#ff5a2c` | `#ff4a1c` |
| `--on-brand` | `#0b0b0c` | `#0b0b0c` |
| `--focus` | `var(--brand)` | `#0b0b0c` (brand fails 3:1 on paper; ring is 2px fg with 2px paper offset) |
| `--halftone-dot` | `rgba(242,239,232,.16)` (screen) | `rgba(11,11,12,.55)` (multiply) |
| `--grain-opacity` | `.06` | `.05` |
| `--scrim` (flat caption bar only, no gradient) | `rgba(11,11,12,.78)` | `rgba(233,231,225,.92)` |
| `--danger/--warning/--success` | per primitives | per primitives |

Legacy aliases (website only, in `website-v3/app/styles/tokens-legacy.css`, until WP21): `--paper:var(--bg)`, `--signal:var(--fg)`, `--soft:var(--fg-soft)`, `--muted:var(--fg-muted)`, `--bone:#f2efe8` (fixed, does not flip), `--font-condensed:var(--font-display)`, `--accent:var(--brand)` only if grep shows the site uses it, and `[data-theme='vintage']` aliased to the paper values. Map `--bone`, `--scrim`, `--font-condensed` in `@theme` (used but unmapped today).

### 3.4 Layer 3 component tokens (defined with the component)

`--btn-h-sm:40px`, `--btn-h-md:48px`, `--btn-h-lg:56px`, `--btn-h-xl:64px`, `--field-h:48px`, `--field-h-lg:56px`, `--hit:44px`, `--header-h:64px` (56px mobile), `--gutter:clamp(16px,4vw,48px)`, `--section-y:clamp(48px,5.5vw,72px)` (halves today's 96-120px), `--appframe-r:8px`.

### 3.5 Material layer

- **Grain**: inline SVG feTurbulence tile (160x160, `baseFrequency .9`, `numOctaves 2`, `stitchTiles stitch`) on `.mf-grain::after`, `position:absolute; inset:0; pointer-events:none; opacity:var(--grain-opacity); mix-blend-mode:overlay`. Applied per band (cover, ink bands, app-frame backing, paper inserts), never as a fixed full-viewport layer.
- **Misregistration**: `.mf-misreg` = `text-shadow: 2px 2px 0 var(--brand)` for filled display text; `.mf-misreg-outline` draws a `::after` copy via `attr(data-text)` offset 2px in brand while the main layer uses `-webkit-text-stroke: var(--display-stroke) var(--fg)`. No `paint-order`. Offset collapses under forced-colors. Used on at most the cover word and the APPLY word (plus the 404 headline).
- **Halftone**: `Halftone.tsx` and the CSS dot screen stay; dot colour from `--halftone-dot`, so it no longer vanishes on ink.
- **Registration marks**: `RegMarks` (four 14px CSS crosshairs, `--fg-muted`) on app-frame, cover composer frame, paper-insert corners.
- **Ink glass**: `.mf-glass`; falls back to opaque `--bg-raised` under `prefers-reduced-transparency` and forced-colors.

### 3.6 Platform mapping (`platform/app/globals.css`)

One-way map from shadcn names onto shared tokens. Because shared files only read `--brand*`, `--fg*`, `--hairline`, `--rule`, `--focus`, redefining shadcn's `--accent`/`--muted`/`--border`/`--ring` here cannot change the shared focus ring, live-agent dot, selection or `.mf-btn`.

| shadcn variable | Value |
|---|---|
| `--background` | `var(--bg)` |
| `--foreground` | `var(--fg)` |
| `--card`, `--popover` | `var(--bg-raised)` |
| `--primary` / `--primary-foreground` | `var(--brand-fill)` / `var(--on-brand)` |
| `--secondary`, `--muted`, `--accent` (shadcn's hover surface) | `var(--bg-surface)` (grep `bg-accent` call sites to confirm hover surfaces do not turn orange) |
| `--muted-foreground` | `var(--fg-muted)` |
| `--border` | `var(--hairline)` |
| `--input` | `var(--rule)` |
| `--ring` | `var(--focus)` |
| `--destructive` | `var(--danger)` |
| `--radius` | `0.25rem` |
| `--chart-1..5` | chart set above |
| `--sidebar-*` | bg-raised / fg / brand |

Verification (WP11): in the built `/chat` DOM, `getComputedStyle` of a focused control's outline colour equals `#ff5a2c` and the live-agent dot equals `#ff5a2c`, not grey.

Delete the `:root` fork in `platform/components/chat/tokens.css` (`--paper #221f1c`, Helvetica, `--hairline` as a border shorthand; rename leftover shorthands `--bd-hairline`/`--bd-strong`). Unify the mono variable to `--ff-mono`.

### 3.7 Colour rules and contrast pairs

Brand appears on: the primary CTA (one per viewport), live/agent state dots and labels, focus ring (ink), selection, the misregistration offset, the selected-chip underline on ink. Never for body text, section backgrounds or large fills. On paper, brand is fill only and focus is ink.

`design-tokens/contrast-pairs.json` lists pairs by token name (checked by `scripts/contrast.mjs`):

| Pair | Min |
|---|---|
| fg/bg, both themes | 7 |
| fg-soft/bg, fg-muted/bg, dim/bg (both themes) | 4.5 |
| fg, fg-soft, fg-muted on bg-raised and bg-surface (both themes) | 4.5 |
| dim/bg-raised (both themes) | 4.5 |
| dim/bg-surface | 4.5 (expect about 4.6, borderline; if it fails, text on surface grounds uses `--fg-muted` and `--dim` is restricted to `--bg` and `--bg-raised`) |
| brand/bg, brand/bg-raised, brand/bg-surface on ink | 4.5 (expect 6.32 on bg; AppFrame and cards use raised and surface as text grounds) |
| on-brand/brand-fill (both themes) | 4.5 (expect 5.85) |
| brand (`#e63a0c`)/bg on paper | 3, **large text only** |
| rule/bg, both themes | 3 |
| focus/bg: ink theme (brand on ink) | 3 |
| focus/bg: paper theme (ink on paper) | 3 |
| danger/warning/success on their ground | 4.5 |

The script must FAIL any registered text use of brand-fill `#ff4a1c` on paper, and any use of `--brand` as body-size text on paper (static grep of `color: var(--brand)` inside `[data-theme='paper']` scopes and `.t-*` classes below 24px).

### 3.8 Type scale tokens (desktop / mobile px, as `clamp()`)

`--t-poster` fitted; `--t-display-xl` 120/64; `--t-display-l` 72/44; `--t-display-m` 44/30; `--t-lead` 24/20; `--t-body` 17/16; `--t-ui` 14; `--t-label` 12.5/12; `--t-stat` 96/56. WP3 may adjust; WP4 writes the final numbers (edits values in the `type.css` WP2b created).

### 3.9 Theme colour constants

`website-v3/lib/theme-colors.ts` exports `INK`, `PAPER` for `viewport.themeColor` (the only TS file allowed literal hex besides the OG/icon files). Only the ROOT `layout.tsx` sets `viewport.themeColor` (INK). The header is always ink, so no route needs a per-route override; there are no per-route `viewport` exports.

---

## 4. Type system

### 4.1 Roles

| Role | Class | Face | Notes |
|---|---|---|---|
| Poster (fitted) | `.t-poster`, `FittedWord` | `--font-display` | Only BLACKOUT MERCHANDISE (cover, footer) and APPLY (and the 404 headline) |
| Display XL / L / M | `.t-display-xl/l/m` | display | h1 / h2 / h3, caps |
| Lead | `.t-lead` | Barlow 500 | left aligned, max 52ch |
| Statement | `.t-statement` | Barlow 500 | left aligned, never centred long copy; colour is `--fg-soft` or `--fg` at all times, never scrubbed or dimmed below `--fg-soft` |
| Body | `.t-body` | Barlow 400 | weight 300 banned |
| UI | `.t-ui` | Barlow 500 | never tracked caps |
| UI caps | `.t-ui-caps` | display at +0.04em | nav, buttons |
| Label | `.t-label` | `--font-mono`, caps | 12.5px desktop |
| Mono prose | `.t-mono` | mono, sentence case | prompts, tool status, agent text |
| Stat | `.t-stat` | display or mono | `font-variant-numeric: tabular-nums` |
| Stamp | `Stamp` only | Mornsey | see 4.5 |

### 4.2 One-token face swap

Per-face metric block (the only CSS edit when a face changes), in `design-tokens/type.css`:

- `--font-display: var(--ff-display), Impact, 'Arial Narrow', sans-serif`
- `--font-mono: var(--ff-mono), ui-monospace, monospace`
- `--font-body: var(--ff-body), system-ui, sans-serif`
- `--display-weight`, `--display-tracking` (default -0.01em, never below -0.025em), `--display-lh` (about .9), `--display-pad` (.12em; FittedWord padding so umlauts/tildes do not clip), `--display-fit` (em per char; used ONLY by the pre-hydration CSS fallback size for `.t-poster`, which replaces the hard-coded 0.5em/char fallback near `globals.css` ~1132), `--display-stroke` (2.5px), `--mono-size` (12.5px), `--mono-track` (.05em).

`FittedWord.tsx` already measures a hidden clone at `MEASURE_PX = 100` and scales, so it has no per-char constant to replace; see WP4 step 4.

Interim values (Barlow Condensed 700, written by WP2b): weight 700, tracking -0.01em, lh .9, fit .5, stroke 2.5px, pad .12em. Provisional Anton: weight 400, lh .9. Big Shoulders 800/900: lh .9, tracking -0.005em. GC Grind: weight 400, lh .88, tracking 0.

### 4.3 Rules

- Display caps tracking -0.01 to -0.02em. UI caps use the display face at +0.04em. No tracked Barlow caps. Mono only in mono.
- Statements weight 500, left aligned. No centred long copy. Key claims in display caps 40-56px.
- Outline stroke 2-3px at poster size (2.5px token); no `paint-order`.
- No inline `fontFamily`, `fontSize`, `letterSpacing` anywhere; classes only (`scripts/verify/no-inline-type.sh`).
- Tabular figures on all counters and prices.

### 4.4 Specimen gate process (G1)

1. WP3 builds `/dev/specimen`, dev-only (see WP3). The orchestrator runs `npm run dev` on port 3004 and sends the owner the link plus a contact sheet (ink EN, paper EN, ink DE, and a sheet of pt/es/fr/nl) and the metrics table.
2. The owner replies with a code such as `display=anton mono=jetbrains` (and for GC Grind a licence confirmation). The URL state (`?d=&m=&g=&l=`) makes any view linkable.
3. WP4 applies the pick. If GC Grind wins without a recorded licence, WP4 uses the runner-up and leaves a one-line swap.
4. Swap test (WP4 acceptance): on a scratch branch change to the runner-up using only `lib/fonts.ts` and the metric block; rebuild; confirm no component file changed.

### 4.5 Mornsey stamp rules

- Component `website-v3/components/ui/Stamp.tsx`; font `website-v3/app/fonts/Mornsey.woff2` (OWNED BY WP6b) converted from `/path/to/blackout-merchandise/Assets/Fonts/Mornsey-PUA.ttf` (fonttools, subset); loaded via `next/font/local` in `components/ui/stamp-font.ts`, imported only by `Stamp.tsx`, `preload:false`. The specimen (WP3) uses its own dev-only copy under `app/dev/specimen/` and never touches `app/fonts/`.
- Props: `word` (a key of `lib/stamps.ts`: `approved`, `proof`, `void`; no free text), `size` clamped 64-160, `tilt` clamped -3..-6, `tone` `'brand' | 'fg'`. Renders `aria-hidden`.
- `lib/stamps.ts` maps key to per-locale strings; `scripts/verify/stamps.mjs` checks each string against the TTF cmap (opentype.js; known holes: Latin Extended-A, inverted question/exclamation marks) and fails on any missing glyph; failing locales fall back to the EN word.
- Budget: max 2 `<Stamp` per page (script counts statically by walking imports with the TypeScript compiler API, see WP6b), max 1 per viewport (checked in screenshots and `check-budgets.mjs`).
- Planned uses only: `approved` on the AppFrame, `void` on the 404, optionally `proof` on the waitlist success state or an end card (still within budget).
- Never on buttons, nav, labels, sentences. Under reduced motion no stamp-in animation.

### 4.6 Font loading

- `website-v3/lib/fonts.ts` is the only file importing faces; exports `display`, `mono`, `body` with `variable: '--ff-display' | '--ff-mono' | '--ff-body'`, `subsets: ['latin','latin-ext']`, `display:'swap'`, explicit weights (Anton `weight:'400'`; GC Grind via `next/font/local` WOFF2). **Big Shoulders Display is imported as `Big_Shoulders` from `next/font/google`** (Next 16's font data lists only "Big Shoulders", "Big Shoulders Inline" and "Big Shoulders Stencil"; verified in `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`). It is a variable font: pass a weight range or omit `weight`, and use 800/900 through `--display-weight`. Copy and the decision table keep the name "Big Shoulders Display".
- `layout.tsx` applies the three variable classes on `<html className={...}>` (not `<body>`), so `:root { --font-display: var(--ff-display) }` resolves. Scoped specimen faces (`--sp-*`) apply on the specimen wrapper only. `platform/lib/fonts.ts` (owned by WP11) mirrors the names and removes `--font-plex-mono`/`--font-barlow`.
- GC Grind and its WOFF2 never appear in a production build unless `design-tokens/LICENCES.md` records the licence. Mornsey ships only through `Stamp`.
- OG/icon TTFs: `opengraph-image.tsx`, `twitter-image.tsx`, `icon.tsx`, `apple-icon.tsx` bake static TTFs from `website-v3/scripts/fonts` (next/og does not accept WOFF2); WP17 replaces them with the chosen faces and confirms the baked strings' glyphs exist.
- `website-v3/scripts/measure-face.mjs` (fontkit) measures average caps advance per em, cap height and diacritic overshoot of the chosen display file and writes the metric block values.

---

## 5. Components (primitive specs)

Site primitives live in `website-v3/components/ui/*.tsx`; the shared look lives in `design-tokens/components*.css` (`.mf-*`) so the platform reuses it. All: semantic tokens only, no raw hex, visible `:focus-visible` (2px `--focus`, offset 2-3px), 44px minimum hit area, hover/focus/disabled states, disabled = `--dim` text + dashed rule (never opacity), forced-colors safe, reduced-motion safe.

| Primitive | Variants / sizes | Rules | Replaces | Built in |
|---|---|---|---|---|
| **Button** | `primary` (brand-fill, on-brand text, one per viewport), `ink` (fg fill), `secondary` (rule outline), `link` (draw underline). Sizes 40/48/56/64; polymorphic (`href` -> next/link) | Squeegee-wipe hover via clip-path 200-240ms (`--p-ease-cut`); 40px gets a 44px hit pseudo; loading state | `.btn-ink`, PRIMARY_BTN, SECONDARY_BTN, MORE_LINK, header applyButton, FilterDrawer button, WaitlistForm 64px override | WP6a |
| **Field** | `input`, `textarea`, `composer`; 48 default, 56 waitlist | label always present (sr-only ok), `aria-invalid`, `aria-describedby`; focus = 2px `--focus` outline offset 2 plus 2px bottom rule (no layout shift); paper focus is fg; invalid = brand rule on ink / ink rule + icon on paper | cover/apply input, waitlist 56/22px, catalog search 140px | WP6a |
| **Chip** | `suggest`, `filter` (aria-pressed), `role` | 4px radius, hairline, mono caps, optional number prefix; selected = fg fill + bg text + check glyph (not colour alone); 32 visible, 44 hit | RolePicker options, filter chips, suggestion chips | WP6a |
| **SpecCard / Card** | `product`, `plain` | packshot on `--bg-raised`, flat caption bar (`--scrim`), 12-13px mono; price-from, MOQ, lead props render only if defined | catalog tile captions, GridView scrim | WP6a |
| **SpecRow** | label/value `<dl>` | mono, `--rule` between rows, tabular figures, hides entirely when value is null | Agents table rows, modal specs | WP6a |
| **PaperInsert** | wraps `data-theme='paper'` + grain + 1px `--rule` edge + mono tab label (e.g. `INSERT 01 / BLANKS`) | ink-to-paper cut is a hard 160ms clip | `data-theme='vintage'` wrappers | WP6a |
| **RegMarks** | corner crosshairs | decorative, aria-hidden | - | WP6a |
| **Toggle / Swatch / Tabs** | switch/checkbox, colour dot, tablist | 44px hit over 14-24px visual; swatch selected = ring in `--focus`; Tabs roving tabindex + arrow keys | FilterDrawer 14px checkboxes, 8-16px swatches, modal tabs | **WP6c** |
| **Dialog** | `modal`, `drawer`, `menu` | native `<dialog>` + `showModal()`, Esc, backdrop click, `inert` background, focus return, Lenis scroll lock via `lib/motion/scrollLock.ts`; publishes open state via `lib/motion/dialogState.ts` so the custom Cursor yields to the native cursor (top-layer dialogs render above any z-index); 160ms cut open/close | ProductModal and FilterDrawer shells, mobile nav menu | **WP6c** |
| **Stamp** | see 4.5 | | - | WP6b |
| **AppFrame** | static semantic markup; 8px radius | mac-less titlebar, mono breadcrumb `PROJECT / RUN` (run label only when set in `lib/site.ts`), 64px rail (inline SVG; lucide-react only if preflight confirms), chat column, mockup card on a PaperInsert, quote as SpecRows, proof-approved state with a Stamp, ink-glass composer line, RegMarks corners, EXAMPLE tag. Brand marks the live agent state only. All text from i18n; figures only from catalog-stats/`lib/site.ts`; the mockup caption is composed from `PRODUCTS` (SKU code, product name, print colours) via an i18n template, never a typed string. Reduced motion shows the final state. | - | **WP8** (not WP6a) |
| **HeroComposer** | site miniature of the app composer | Field `composer` (textarea rows=2, 16px+ text), square 48px primary send, 4 Chips that fill and focus; locale-aware stepped overlay (not the placeholder attribute) | cover single-line input | WP7 |
| **Ink glass** `.mf-glass` | CSS-only | falls back to opaque | - | WP2b (class), used WP7/WP8 |

Platform pieces:

| Piece | Spec |
|---|---|
| Composer (`Composer.tsx`) | Aurora's two-row anatomy at about 160px: textarea row 1; toolbar row 2 (mode select only if `lib/agent/protocol.ts` has modes, attach, web, mic, send). Toggles `aria-pressed`; attachment chips. Square brand send. Radius 8px max, ink glass, ring via `:has(textarea:focus-visible)`. Enter sends; Cmd/Ctrl+Enter alias. Changes the InputGroup structure, not only CSS. |
| Greeting (`EmptyState.tsx`) | Mono label, display-face caps headline 56-72px (32 mobile), body tagline; no gradient text; no synthesised bold. |
| Chips (`ChipsRow.tsx`) | `Chip suggest` merch starters (Tour tee, 50 pcs / Flash sheet drop / Festival crew hoodies / Label capsule run); 2x2 mobile. |
| Rail (`AppRail.tsx`) | 64px, hairline edge, bone-fill active, mono labels, Lucide icons (verify installed), real routes only. Bottom tabs under 48rem with safe-area padding. |
| Shell | Skip link, landmarks, `aria-live` for streaming, safe-area insets, forced-colors / reduced-transparency / prefers-contrast from `base.css`, breakpoints 65/42/23rem and short height. |
| Duplicates | Keep `Chip.tsx`; `Modal.tsx` -> `dialog.tsx`; `Hairline.tsx` -> `separator.tsx`; `badge.tsx` restyled as a Chip variant. Thin wrappers stay permanently where unowned callers remain (WP20/WP21). |

---

## 6. Page-by-page target

### 6.1 Home (about 8 desktop screens at 1440x900, 7650px or less)

Order: Cover, ProductBand, Cloth (Statement folded in), WhoFor ("Who it is for"), HowYouEarn (Zero + Paths merged), SetList, CatalogTeaser (paper insert), Agents, Apply; footer. Giant words only: BLACKOUT MERCHANDISE (cover, footer) and APPLY.

1. **Cover** (ink, `.mf-grain`, min-height `100svh`, never `100vh`): FittedWord BLACKOUT MERCHANDISE at 40-60% of viewport height with `.mf-misreg`; mono run label rendered ONLY when `lib/site.ts` supplies run number and city (template in i18n, values from data; hidden otherwise); `home.hero.promise` as `.t-lead`; `home.hero.tagline` ("Printed for the ones who play loud.") as the secondary line; HeroComposer on ink glass with RegMarks; four chips (band, tattoo/studio, festival, label). The halftone photo is a static plate beside the composer (priority kept, LCP unaffected; hover tone enabled by the Halftone default, see WP15). The facts row and `home-cover-footer` are removed. The only brand fill in the fold is the composer send. At 390x844 the composer and chips sit in the first viewport.
2. **ProductBand**: mono index, `.t-display-l` heading, AppFrame (chat > mockup > quote > proof approved), caption "Real flow, shown static" plus the MCP line only when `MCP_TARGET` is set. One Stamp (`approved`). Top edge peeks above 900px on desktop.
3. **Cloth**: Statement text absorbed as `.t-statement` (no colour scrub; static `--fg-soft`/`--fg`, revealed by a hard clip cut), key claims `.t-display-m`, stat row (tabular, ticking), three black blanks with SpecRow captions; no giant CLOTH word; at most about 1.3 screens.
4. **WhoFor**: four role tiles (Bands, Tattoo, Festivals, Labels) as `SpecCard plain` with Halftone photos; example run and lead-time rows only if set; client roster names stay hidden (`CLIENTS_ARE_REAL=false`).
5. **HowYouEarn**: caps heading, three steps (brief, run, earn) as SpecRows, worked price example only for set fields, link to `/waitlist`.
6. **SetList**: caps display titles, mono index; accordion (`<details>`, 44px target) on mobile.
7. **CatalogTeaser**: PaperInsert, SpecCards, mobile scroll-snap strip (72% cards).
8. **Agents**: mono table, dated roadmap line (hidden when `MCP_TARGET` is null), Button link to the cover composer (`#top`/`#hero-brief`). No "Soon".
9. **Apply**: APPLY outline (2.5px stroke, 2px misregistration), Field email with visible focus, one primary Button.

### 6.2 Inner pages (all ink; different compositions)

- **About** (`density='story'`): mono-indexed h1 `.t-display-xl`, key claims 40-56px, two columns with content in the first viewport; SpecRow facts (print method, GOTS/OEKO-TEX proof rows); Halftone plate with credit line only where data exists; PRESS row hidden when empty; no empty 140px gap under the plate; one primary Apply.
- **Contact** (`density='form'`): form-first single column, Field components, SpecRows for response time/channels only if set.
- **Waitlist** (`density='form'`): numbered form rows, Field 56, Button 64 (no inline override), RolePicker as bordered Chips with fill + check; `aria-invalid`/`aria-live`; submit behaviour and API unchanged.
- **404**: the loudest type on the site (`.t-poster` "OFF REGISTRATION" with literal 2px misregistration), exactly one `<Stamp word="void">`, three SpecRow link rows (Catalog, Gallery, Apply), mono gig-poster joke line localised.

### 6.3 Catalog, gallery, modal, drawer

- **Catalog**: ink header block (mono index + `.t-display-xl` title using the display token; keep the single stat strip), then a PaperInsert holding filter bar and grid, then ink footer. SpecCards with solid caption bar and 12-13px mono captions (`MF-<code>`, type, colour count; price-from/MOQ only if set). Search = Field 48 mono. Role choices and filters = Chips (selected = fg fill). Mobile 2-up with 44px targets.
- **Gallery**: same header pattern, H1 "Printed work", tiles on a paper insert with credit lines (act, piece, run, year) only where data exists, one grading recipe (`filter: contrast(1.05) saturate(.9)`; product proof in colour at rest, editorial plates halftone with tone-on-hover). Whether AI-looking photos are replaced is an owner content decision (deferred).
- **ProductModal / FilterDrawer**: Dialog on a PaperInsert; SpecRows, Swatch, Chip, Toggle, one primary Button; focus trap, Esc, `inert`.
- **Halftone.tsx**: hover colour decoupled from `priority` (default on; opt out with `hoverTone={false}`); second image loads on first `pointerenter`.

### 6.4 Header and footer

- **Header** (always ink; hard 160ms cut when it shrinks): items from `lib/site-map.ts` (Home, Catalog, Gallery, About, Contact, Apply); real routes with `aria-current="page"`; nav in display face at +0.04em; hover = 2px brand underline (not opacity); 44px targets; **Apply is Button `secondary`**; mobile menu is a Dialog `menu`.
- **Footer**: `<footer data-theme="ink">` with tokens (remove hard-coded hex around `globals.css` 1028-1103); BLACKOUT MERCHANDISE fitted word (second poster use); 44px targets; RUN/catalogue mono line only from data; padding-bottom so the dev badge does not overlap the legal row.

### 6.5 Platform shell from Aurora: adopt / adapt / reject

| | Items |
|---|---|
| Adopt (structure) | 64px icon rail (Aurora 72) with active state; two-row composer anatomy; greeting block; chips row; skip link, landmarks, `aria-pressed` toggles, `aria-live`; responsive breakpoints 65/42/23rem and short-height rules; reduced-transparency and forced-colors handling |
| Adapt | Rail items become real routes only; composer becomes ink glass 8px radius with a 2px focus ring; greeting in display-face caps (not gradient Arial); Lucide icons with ISC notice in `platform/THIRD_PARTY.md`; static halftone dot field at 3-4% as the only background texture |
| Reject | Arial and its negative tracking; gradient name text; strands canvas, beam, vignette; Logoipsum mark and placeholder names; lil-gui; liquidGL; 24px radius, translateY lift; `--line #343434`; Aurora's palette |

---

## 7. Motion vocabulary

Kept print metaphors: squeegee wipe (buttons), outline-to-ink fill (APPLY, Set List), halftone-to-tone (plates). Added machine layer:

| Move | Spec |
|---|---|
| Hard clip cut | `clip-path: inset()` step reveal, 160-240ms, band reveals and heading lines |
| Stepped type-on | `steps()` with block caret: composer overlay, mono labels, ProductBand chat lines |
| Ticking counters | stats tick with `steps(8)`, triggered off `.home-stat-row` (not the section), tabular figures |
| Statement | no colour scrub; hard clip reveal only; text never below `--fg-soft` |
| Page transition | hard ~200ms ink cut (no sweep), failsafe 1.5-1.8s, focus moves to `main` |
| Reveals | 400-600ms max; old 0.9s line masks and 1s wipes shortened |
| Lenis | duration about 1.1, only `(pointer: fine)` and width 1024px+ and reduced-motion off; scrub 0.15-0.3 |
| Cursor | mounted once in layout, `gsap.quickTo`, rAF stops when settled, hides on document leave, uses pointer events (`pointermove`, `pointerleave`, `pointerdown`, with `pointerType === 'mouse'` gate) instead of mouse-only events, reacts to scroll-driven hover state (re-hit-test on scroll end), yields to the native cursor while any `dialog[open]` exists (via `lib/motion/dialogState.ts`), selector `a, button, [role=button], input, textarea, select, summary, [data-cursor]`, no `mix-blend-mode: difference`, off on touch/reduced motion |
| Mobile | stepped 240ms reveal, one pin only, no parallax |

Rules: only `transform`, `opacity`, `clip-path` animate; reduced motion shows everything static and visible (no hidden start states; start states applied only after JS marks an element pending); no CLS (reserve heights); one `useReducedMotion` hook with a `change` listener is the only reader; durations/eases come from tokens (JS reads them via `lib/motion/tokens.ts`). The cover clip-path scene is profiled before any change and then retired from the fold (decision 15).

---

## 8. Copy and i18n changes

- All new keys are added in `types.ts` + `en.ts` first (gate for consumers), then pt/es/fr/nl/de in the same WP via one agent per locale file. Transitional typing keeps builds green until WP21 makes it strict: `en` is typed `Record<Key | NewKey, string>` (a missing key in `en.ts` fails tsc), while the five other locales are typed `Record<Key, string> & Partial<Record<NewKey, string>>` with English fallback in `t()`. Consumer WPs depend on the English keys, not the translations.
- Voice: blunt run/spec; at most 14 words per sentence; never premium, eco-friendly, curated, elevate, "Issue 01". Round 8 approved lines verbatim. Display-word strings 24 characters or fewer; chip labels 28 or fewer. Unsure strings carry `// REVIEW-NATIVE` for the owner; a per-locale list goes to the owner.
- Facts never live in strings: run labels, city, SKU codes and product names are templates with params (`{run}`, `{city}`, `{sku}`, `{name}`, `{colours}`) filled from `lib/site.ts` / `PRODUCTS`; when a param is unset the whole line is not rendered.
- Slice keys (WP5): `home.hero.promise`, `home.hero.tagline`, `home.composer.label|placeholder.1..4|chip.1..4|send|hint`, `product.*` (title, breadcrumb, brief line, agent lines, mockup caption template, quote labels, `product.quote.priced`, `product.proof.approved`, `product.agentLive`, `product.caption` "Real flow, shown static", `product.mcp`), About, catalog header, `nav.*` (Home, Catalog, Gallery, About, Contact, Apply), `gallery.title` ("Printed work"), stamp strings in `lib/stamps.ts` (`approved`, `proof`, `void`).
- Remaining keys (WP12): rewrite `home.cloth`, `home.statement`, `home.zero`, `home.paths`, `home.setlist`, `home.catalog`, `home.agents`, `home.apply`, `printedFor`, `contact`, `waitlist`, `notfound`, `footer`, `meta` (en.ts ~31 and ~213 known). New: `home.earn.*` (heading, three steps, worked example labels), merged Cloth keys, Agents roadmap line (dated variant when `MCP_TARGET` set), `home.who.*` role tiles, 404 link rows and joke line.
- `lib/site.ts`: `SITE_DESCRIPTION` in the new voice; `SITE_FACTS` gains `moq`, `lead`, `fromPrice`, `runs`, `city`, `roster` (all `null`/empty by default; every consumer hides unset facts); a separate export `MCP_TARGET: string | null` (ISO date); `llms.txt/route.ts` matches. `SITE_URL` stays a placeholder for the owner.
- `scripts/check-i18n.mjs` fails on missing keys per locale and on values containing premium, eco-friendly, Issue 01, TODO, lorem, XXX, and on hard-coded `RUN \d+` / `MF-\d+` literals.

---

## 9. Work packages

Conventions: one owner per file per wave; "owns" is exclusive; every WP ends with `npm run lint && npm run build` in each touched app plus the harness shots (11). Before editing, each WP runs `git diff --stat` and touches only owned files; any out-of-ownership finding goes on a checklist for the owning WP, never fixed in place. Parallel WPs may use `git worktree add ../mf-<id> -b pressroom/<id>` with a separate port (3100+n) and `.next`; if the owner declines worktrees, builds within a wave run serially.

### WP0: Checkpoint current work
- **Goal**: put uncommitted work into history (or get an explicit waiver) so nothing in platform chat/voice/discord is overwritten.
- **Depends on**: none. **Parallel with**: none. **Owns**: git history only. **Read-only**: whole repo.
- **Steps**: (1) `git status --short`, group: website-v3 (`globals.css`, `page.tsx`, `home/*`, `editorial/*`, `motion/*`, i18n, icons), platform (`components/chat/*`, `lib/agent/*`, `lib/tools/*`, voice/discord files), noise (`graphify-out/**`, `data/LoRAs/**`, `.playwright-mcp/`, `.mcp.json.lock`, `Examples/`, `Assets/`, `docs/`, the grind zip, `aurora-dashboard/` unless owner says). (2) Record baseline health: lint + build in both apps into the scratchpad (`baseline-health.txt`), failures recorded, not fixed. (3) Present the grouping to the owner; no commit without approval. (4) On approval: ensure `.playwright-mcp/`, `.mcp.json.lock`, `graphify-out/cache/` and `website-v3/.verify/` are gitignored; two commits `chore(website-v3): checkpoint editorial home and motion work` and `chore(platform): checkpoint chat, voice and discord work` with the session attribution trailer; tag `pre-pressroom`. (5) If the owner waives: record it; every later WP diffs before editing; WP11 and WP18-20 are blocked until the platform files are committed, and **G2 proceeds without WP11** (platform tokens are then judged in a follow-up review). (6) Copy the baseline shots folder to `website-v3/.verify/baseline-2026-10-06/` (gitignored by step 4).
- **Acceptance**: no modified website-v3/platform source files (or explicit waiver); tag exists; platform in-progress work is in history; `git check-ignore website-v3/.verify` succeeds.
- **Owner gate**: approves the commit or waives. **Size**: S.

### WP1: Focus-bug fix, verification harness, preflight facts
- **Goal**: fix the critical a11y bug first and build the tooling every WP uses (including every dev dependency and npm script later WPs need, so nobody else edits `package.json` until WP21).
- **Depends on**: WP0. **Parallel with**: none.
- **Owns**: `website-v3/app/globals.css` (lines ~638-659 only), `website-v3/components/home/Cover.tsx` and `ApplySection.tsx` (focus classes only), `website-v3/components/home/styles.ts` (FOCUS_RING definition only), `website-v3/scripts/verify/{shots.mjs,diff.mjs,no-raw-hex.sh,no-inline-type.sh,preflight.mjs,check-budgets.mjs,stamps.mjs,prod-guard.mjs}` (new; the last four are documented stubs filled by WP6b/WP3), `website-v3/package.json` (all scripts and devDeps), `website-v3/README.md` (short section).
- **Read-only**: `ZeroUpfront.tsx`, `CatalogTeaser.tsx`, `layout.tsx`, `platform/**`.
- **Steps**: (1) In `globals.css` delete `.home-brief-input-row input { outline:none }`; add `.home-brief-input-row:focus-within { box-shadow: inset 0 -2px 0 var(--signal) }` and `.home-brief-input-row input:focus-visible, .home-apply-input:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px }` (temporary; Field replaces it in WP7/WP13). (2) Same fix for the Apply email field (`ApplySection.tsx` ~64-72, including any inline `outline:'none'`). (3) Grep `outline: none|0`, `outline-none`, `:focus {` across `app/` and `components/`. Fix hits ONLY in the files WP1 owns; write every other hit to `focus-checklist.md` (file, line, owning WP) and each owning WP's acceptance includes its checklist rows. (4) `FOCUS_RING` is a LIVE export (`components/home/styles.ts:62`; used by `Cover.tsx`, `ApplySection.tsx`, `CatalogTeaser.tsx`, `ZeroUpfront.tsx`). Keep the export and its call sites; at most adjust its definition so it yields a visible ring. WP13 removes it when it deletes/rewrites those files. (5) `shots.mjs`: args `--base http://localhost:3004 --out <dir> --routes /,/about,/contact,/waitlist,/catalog,/gallery,/nope --lang pt`. Locale is NOT a cookie: `lib/i18n/index.ts` reads `localStorage['mf-lang']`, then `navigator.language`, and loads the dictionary chunk client-side. The harness sets `localStorage['mf-lang']` via `page.addInitScript` (or `storageState`) before navigation and waits for the lazy dictionary (wait for `document.documentElement.lang === <lang>` and a translated landmark text) before capture. Note for later WPs: non-EN pages render English first, which affects CLS and FittedWord measurement, so measurements are taken after dictionary load AND `document.fonts.ready`. Shots at 1440x900, 390x844 and 1440x900 `reducedMotion:'reduce'`; desktop home also scrolled in 100vh steps (700ms wait) named `home-desktop-00..NN.jpg` to match the baseline; writes `heights.json`. `--specimen` mode for WP3; `--storage-state <file>` for platform pages (decision 28). (6) `diff.mjs`: pixelmatch between folders to `diff-report.md`; `--max-diff` (default 0.1). (7) `no-raw-hex.sh` (allowlist: `design-tokens/**`, `lib/theme-colors.ts`, `opengraph-image.tsx`, `twitter-image.tsx`, `icon.tsx`, `apple-icon.tsx`, `app/dev/**`) and `no-inline-type.sh`; both report-only (`--warn`) until WP21, with a `--files <list>` mode WPs use for their own acceptance. (8) `preflight.mjs` verifies and prints evidence for facts the plan relies on: `lucide-react` installed in each app, `platform/lib/auth.ts` exists, `platform/components/chat/RegisterMark.tsx` exists, how `/chat` and `/admin` can be reached (auth redirect, `AGENT_MOCK=1` in `lib/agent/mock-extra.ts`, any dev bypass), and the DOM hooks in current `Cover.tsx`/`ScrollScenes.tsx` (`.home-masthead-wrap`, `.home-facts-row`, `[data-rise]`, `[data-count]`, `[data-fill]`, `[data-lines]`, `[data-wipe]`, `[data-step]`, `[data-path-card]`, `[data-cover-media]`). It writes `scripts/verify/hook-contract.json` (confirmed hooks only) which WP7 and WP13 update. (9) devDependencies registered now: `playwright`, `pngjs`, `pixelmatch`, `@axe-core/playwright`, `lighthouse`, `fontkit`, `opentype.js`, `tsx`; run `npx playwright install chromium`. npm scripts registered now (pointing to stubs where the file lands later): `verify:shots|diff|hex|type|preflight|stamps|budgets|tokens|contrast|i18n|prodguard`, `measure-face`.
- **Acceptance**: tabbing to the cover brief input and Apply email shows a visible 2px indicator (screenshots desktop and mobile); no `outline:none` without a `:focus-visible` replacement in owned files; `focus-checklist.md` written; diff vs baseline touches only the two inputs; a pt shot is actually Portuguese; lint+build pass; preflight output and `hook-contract.json` saved.
- **Size**: M.

### WP2a: CSS split and legacy cascade layer (zero visual diff)
- **Goal**: split the 1327-line `globals.css` into per-concern partials so later WPs own disjoint CSS, and put legacy rules in a lower cascade layer.
- **Depends on**: WP1. **Parallel with**: none.
- **Owns**: `website-v3/app/globals.css`, `website-v3/app/styles/*.css` (new).
- **Read-only**: every component, `platform/**`.
- **Steps**: (1) Read Next 16 CSS docs. (2) `shots` before. (3) Cut by selector family, keeping selector text and order identical (approximate lines: tokens 1-47, themes 48-85, base/focus 86-144, route/motion 145-174, catalog 175-442 with filter drawer 318-363, cover/masthead/halftone/outline 443-545, home sections 545-887, buttons 888-1005, header/footer 1008-1105, gallery 1106-1115, editorial 1116-1180, role picker 1150-1180, halftone hover/line reveal/sweep 1181-1231, set-list plates 1232-1266, load intro 1267-1312, eco line 1313-end). Partials (owner WP in parentheses): `tokens-legacy.css` (WP2b/WP21), `base.css` (WP2b), `ui-legacy.css` (WP6a, buttons + role picker), `cover.css` (WP7), `product-band.css` (WP8), `header.css` and `footer.css` (WP9), `editorial.css` (WP9 only; WP14 owns only `contact-waitlist.css`), `catalog.css` (WP10), `modal-filter.css` and `gallery.css` (WP15), `home.css` (WP13), `contact-waitlist.css` (WP14), `motion.css` (WP10m, WP16). `globals.css` becomes, in this order: the layer-order statement (3.1 step 1), `@import "tailwindcss";`, the (empty-stub for now) `@import "../../design-tokens/index.css"` (added in WP2b), the partial `@import`s in original cascade order, THEN the `@theme inline` block. All `@import`s precede every other rule. (4) Delete dead selectors `.catalog-card-caption*` (~276-307) and `.home-nav-cap` (~476) after grep proves no TSX uses them. (5) `shots after` and `diff --max-diff 0.1`; commit alone (Phase A1). (6) Phase A2: change each partial import to `@import "./styles/x.css" layer(legacy);` with the layer-order statement already first. Print the compiled layer order from the built CSS and confirm `legacy` is below `components` and `utilities`. Re-run diff at 0.1%. If it fails, revert A2 and record that the global focus rule relies on `!important` (WP2b) plus the `outline:none` check instead. Commit A2 separately.
- **Acceptance**: A1 diff 0.1% or less on all routes; A2 either passes at 0.1% (layer order printed) or is reverted with the fallback recorded; page heights within 1px; `globals.css` under 200 lines; lint+build pass.
- **Size**: M.

**WP2a outcome and recorded A2 fallback (8 Oct 2026).** A1 landed (commit ad91c2e): `globals.css` is 39 lines plus 14 partials in `website-v3/app/styles/`, screenshot diff 189/189 identical. A2 (`layer(legacy)`) was applied, FAILED the 0.1% diff on `/contact` and was reverted. Fallback in force:
- The legacy partials are imported UNLAYERED. The statement `@layer theme, base, legacy, components, utilities;` stays first in `globals.css` and `legacy` is declared but empty. The compiled order is correct (theme, base, legacy, components, utilities).
- Consequence for WP2b: unlayered legacy rules still beat the `components` and `utilities` layers, so the global focus rule must rely on `outline: ... !important` plus the `outline:none` check (this section's fallback), not on layer order.
- A2 is blocked by two latent conflicts between legacy rules and Tailwind utilities in components that WP2a does not own: (1) `website-v3/app/contact/ContactCopy.tsx:24` (`text-[13px]` on `.link-ink`, which renders 12px today; owner WP14 must remove or decide it); (2) `website-v3/components/GalleryView.tsx:146` and `:155` (`transition-opacity duration-500` vs `.gallery-zoom` `transition: opacity 500ms, transform 900ms`; hover-only, not caught by screenshots; owner WP15). Multi-line and `cn()` classNames in `SiteHeader.tsx` and `SiteFooter.tsx` were not scanned for the same conflict class.
- Retry A2 (one-line sed: add `layer(legacy)` to each partial import) after WP14 and WP15 land, with a before/after diff on `/contact` and a manual hover check on `/gallery`. WP2b may attempt it as its last step if those fixes are in; otherwise WP21.
- WP2b also takes over: the stale "Barlow everywhere" comment in the `@theme inline` block, and moving the global `prefers-reduced-motion` rule (currently at the tail of `catalog.css`) into `design-tokens/base.css`, leaving only `.flip-front/.flip-back` in `catalog.css`. Note that a layered `!important` in `legacy` outranks `!important` in later layers.
- `home.css` holds `.home-tile-*` used by `CatalogTeaser`; WP8's ProductBand may reuse them (`product-band.css` is an empty stub).

### WP2b: Shared tokens, theme flip, layout
- **Goal**: create the three-layer token source with Hazard Press values, make ink the default and paper an insert, and wire both apps' import route.
- **Depends on**: WP2a. **Parallel with**: none.
- **Owns**: `design-tokens/**` (all files in 3.1, stubs included), `website-v3/app/globals.css`, `website-v3/app/styles/tokens-legacy.css`, `website-v3/app/styles/base.css`, `website-v3/app/layout.tsx`, `website-v3/lib/theme-colors.ts`, `website-v3/next.config.ts` (turbopack root only if needed), `website-v3/scripts/contrast.mjs`, `website-v3/scripts/verify/check-tokens.mjs`.
- **Read-only**: all components, `platform/**`, `website-v3/package.json` (scripts already registered by WP1).
- **Steps**: (1) Write `primitives.css`, `semantic.css`, `material.css`, `base.css`, `tailwind-theme.css` exactly per section 3 (brand names `--brand*`); write `type.css` with the interim Barlow Condensed metric block AND the complete `.t-*` class set (so WP6-WP10 can consume classes immediately; WP4 only edits values); stubs (documented headers) for `components*.css`, `stamp.css`. (2) `semantic.css`: `:root, [data-theme='ink']` first, then `[data-theme='paper']`; `--well` single value per theme; NO legacy aliases. In `website-v3/app/styles/tokens-legacy.css` put the legacy aliases and the `[data-theme='vintage']` paper alias with `TODO(WP21)`; also an interim rule re-scoping ink variables onto the existing header and footer class names (confirm by grep) so they stay legible in the window before WP9; WP9 deletes it. (3) `base.css`: `@layer base { :focus-visible { outline: 2px solid var(--focus) !important; outline-offset: 3px } }` with `[data-ring="custom"]` opt-out, `::selection` brand-fill/on-brand, `.sr-only`, `.skip-link`, forced-colors block (outlines on controls, drop misreg offset, grain off, brand fills to ButtonFace/ButtonText), `prefers-contrast: more` (rule alpha up), `prefers-reduced-transparency` (glass solid), `prefers-reduced-motion` (animations/transitions none; script-revealed elements visible). (4) `globals.css`: add `@import "../../design-tokens/index.css";` right after `@import "tailwindcss";` (before the partial imports); add the `@theme inline` mapping AFTER all imports (`--color-*` for new tokens, `--font-display: var(--type-display)` style non-circular maps; never `--font-display: var(--font-display)`); remove old `:root`/theme blocks into `tokens-legacy.css` only for what is not yet in design-tokens; rewrite the stale header comment ("no light/charcoal mode switching", "Barlow everywhere"). (5) `layout.tsx`: `<html data-theme="ink">`, drop the `data-theme='vintage'` wrapper background at ~line 92 (page-level wrappers stay until WP21), `viewport.themeColor` from `INK`. (6) `scripts/contrast.mjs`: builds a token table by parsing `primitives.css` (`--p-*` map), then resolves `semantic.css` per theme block by following `var(--x)` chains and literal values, composites `rgba()` over the theme's resolved `--bg` (nested paper over ink resolved by the paper block alone), and evaluates the pairs in `contrast-pairs.json` (token names, not hex). It prints a table, exits 1 on failure, including the brand-on-paper-as-text failure rule (3.7). No pair is hard-coded in the script. (7) `check-tokens.mjs` (`--files <list>` and `--all`): flags `outline:none` without `:not(:focus-visible)`, `font-weight: 300|font-light`, `Space Grotesk|Arial|liquidGL|lil-gui|background-clip: text`, and any definition or read of shadcn names inside `design-tokens/**` (decision 11). It is WARN-ONLY on legacy files and for `--all` until WP21; each WP runs it with `--files <owned files>` as a hard check. (8) Verify the out-of-root `@import` in both `next dev` and `next build` in both apps; if refused set `turbopack.root`/`outputFileTracingRoot`; if still refused use `design-tokens/sync.mjs` (copy into each app on predev/prebuild; output COMMITTED, with `--check-sync` in lint). Also read `vercel.json`/project settings for Root Directory and record the deployment check (decision 27): if the apps deploy with the app folder as Root Directory and the owner has not enabled "include source files outside the root directory", ship the committed sync copy. Record the route taken at the top of `index.css` and in the decisions table. (9) Shots + diff: expect colour changes (catalog now paper-toned via the vintage alias, home middle ink), no layout shifts. The interim state (home `<main data-theme='vintage'>` and catalog wrappers paper-aliased, layout wrapper ink, header/footer re-scoped ink) is recorded in the PR and the diff check expects exactly it.
- **Acceptance**: build passes, all routes render; heights equal WP2a within 1px; `node scripts/contrast.mjs` passes; `check-tokens --files <owned>` passes; header and footer text meets 4.5:1 on every route in the interim state; `rg "data-theme=.vintage"` finds only the aliased TODO plus the existing wrappers; no circular font variable; deployment check recorded.
- **Size**: M.

### WP3: Specimen board (dev-only route) [first visible work]
- **Goal**: let the owner choose the display and mono faces by eye on real Blackout Merchandise type treatments.
- **Depends on**: WP2b (token and `.t-*` stubs). Does NOT depend on WP6a: the specimen renders the production `FittedWord` and `.t-*` classes but its own scoped sample markup (`specimen.css`) for buttons, composer, card and spec row, built to the section 5 spec. G1 therefore judges faces, not the production primitives. **Parallel with**: WP5, WP6a, WP6b, WP6c.
- **Owns**: `website-v3/app/dev/layout.tsx`, `website-v3/app/dev/specimen/page.dev.tsx` (server wrapper), `website-v3/app/dev/specimen/Specimen.tsx` (`'use client'`), `faces.ts`, `strings.ts`, `specimen.css`, `website-v3/app/dev/specimen/Mornsey-specimen.woff2` (dev-only copy), `website-v3/next.config.ts` (`pageExtensions` key only), `design-tokens/LICENCES.md`.
- **Read-only**: `FittedWord.tsx`, `app/fonts/GCGrind.ttf`, `Assets/Fonts/Mornsey-PUA.ttf`, `design-tokens/**` (except `LICENCES.md`), `lib/i18n/*`.
- **Steps**: (1) Read the Next 16 docs for next/font google+local and for `pageExtensions` (cite the doc path in the PR). (2) Dev-only guard in depth: `pageExtensions` is the FULL default set plus the dev extension, e.g. `['tsx','ts','jsx','js', ...(process.env.NODE_ENV !== 'production' ? ['dev.tsx'] : [])]`; the route file is `app/dev/specimen/page.dev.tsx` (server component) importing the client `Specimen.tsx`; fallback `notFound()` when production and `SPECIMEN!=='1'`; `dev/layout.tsx` sets robots noindex; not in `sitemap.ts`/nav. A post-build assertion (`scripts/verify/prod-guard.mjs`, stub from WP1) checks `.next` has no `/dev/*` route and no `GCGrind` file in `static/media` unless `LICENCES.md` records it. (3) `faces.ts` loads scoped `--sp-*` variables on the `dev/layout.tsx` wrapper `className`, `subsets:['latin','latin-ext']`: Anton (weight '400'), **`Big_Shoulders`** (variable; NOT `Big_Shoulders_Display`, which does not exist in Next 16 font data), GC Grind (local, flagged "licence unconfirmed"), JetBrains_Mono, Space_Mono, Martian_Mono, IBM_Plex_Mono (control), Barlow 400/500, and Mornsey (the dev-only WOFF2 derived by fonttools, subset). (4) Controls (sticky bar, URL state `?d=&m=&g=&l=`): display radio, mono radio, ground Ink | Paper | Both, locale en/pt/de/es/fr/nl, "Compare all" grid. (5) Each board sets ONLY `--ff-display`, `--ff-mono` and the metric tokens on its wrapper and renders: (a) fitted BLACKOUT MERCHANDISE via the real `FittedWord`, (b) outlined APPLY at 2.5px stroke with 2px brand misregistration, (c) set list rows, (d) stats at 96px tabular with a mono unit (values from `CATALOG_STATS`), (e) nav (six real labels, display face at +0.04em), (f) sample primary/ink/secondary buttons, (g) sample 2-line composer with long mono placeholder and 3-4 chips, (h) sample catalog card with SKU, mono spec line (price flagged SAMPLE), (i) sample SpecRow list and a mono agent tool-status table, (j) diacritic stress strip per locale (pt `AÇÃO ÀS ÓCULOS`, de `ÄÖÜ STRASSE ß`, es `NIÑO Ñ ¿HOLA?`, fr `ŒUVRE ÉTÉ ÇA`, nl `ÏJ ËÉN`) at 120px and 12px with a `document.fonts.check` missing-glyph marker, (k) Mornsey stamp samples (APPROVED, PROOF, VOID) at 64/96/160px, -4deg, with the glyph-coverage note. (6) Metrics panel (canvas `measureText`): mean caps advance in em (recommended `--display-fit`), cap-height ratio, recommended `--display-lh`; clipping test with a 0.8 line-height overflow-hidden box versus 0.9 with 0.12em padding. (7) "Decision" card with a "Copy decision" button emitting `{display, displayWeight, mono, fit, lh, tracking}`. (8) Banner "DEV ONLY. Not shipped." (9) Run the harness `--specimen` (ink and paper, six locales, 1440x900 and 390x844) and send the owner the shots and `http://localhost:3004/dev/specimen`.
- **Acceptance**: renders in dev with all candidates, both grounds and six locales and no console errors; production build 404s the route and emits no GCGrind file; switching faces changes only the two `--ff-*` and metric tokens; no production page changes (diff 0%); lint+build pass.
- **Owner gate**: **G1** owner picks the display + mono pair (and confirms GC Grind licence if chosen). Nothing finalises face metrics before this. **Size**: M.

### WP4: Lock faces
- **Goal**: apply the pick through the single face token in the website and write the type scale values.
- **Depends on**: WP3 + G1 (or provisional Anton + JetBrains Mono per decision 24). **Parallel with**: WP5, WP6a, WP6b, WP6c.
- **Owns**: `website-v3/lib/fonts.ts`, `website-v3/app/layout.tsx`, `design-tokens/type.css` (values only), `website-v3/components/editorial/FittedWord.tsx`, `website-v3/app/styles/tokens-legacy.css` (font alias lines only), `website-v3/app/fonts/*` (final display/mono WOFF2 only; NOT `Mornsey.woff2`, owned by WP6b), `website-v3/scripts/measure-face.mjs`.
- **Read-only**: `platform/**` (platform fonts are WP11's).
- **Steps**: (1) Take the owner's JSON; if GC Grind is picked without a recorded licence, use the next choice. (2) `lib/fonts.ts` exporting `display`, `mono`, `body` per 4.6; remove the old Barlow Condensed/Plex loaders from `layout.tsx` (~21-42); apply the three variable classes on `<html>`. (3) Run `measure-face.mjs` (fontkit) on the chosen display file; write the metric block values and the clamp scale values into `type.css` (classes already exist from WP2b); assert no weight 300. (4) `FittedWord.tsx` already measures a hidden clone at `MEASURE_PX = 100` and scales, so there is no per-char constant to replace. WP4 (a) applies `--display-pad` as wrapper padding so diacritics do not clip, (b) reserves the wrapper height before fonts load (no CLS), (c) re-measures after `document.fonts.ready`, after the i18n dictionary has loaded, and on resize. The pre-hydration fallback size is written in `type.css` (`.t-poster` fallback using `--display-fit`); the legacy ~1132 fallback rule in the editorial partial is deleted by WP9. (5) Point `--font-condensed` and the legacy outline classes at the new tokens. (6) Swap test on a scratch branch (runner-up through `lib/fonts.ts` + metric block only). (7) Shots: masthead fits edge to edge at 1440/768/390 in en, pt, de, es, fr, nl with glyph bboxes inside wrappers.
- **Acceptance**: only `lib/fonts.ts` and `type.css` name faces; no clipped diacritics in six locales; `check-tokens --files` over the files WP4 owns shows zero weight-300 hits (the repo-wide `rg 'font-weight: *300|fontWeight: *300'` must reach 0 only at WP21; WP9/WP13/WP14 each clear their own files); swap test passes; lint+build pass.
- **Size**: M.

### WP5: Slice copy (six locales)
- **Goal**: write only the strings the slice needs so slice WPs never touch i18n.
- **Depends on**: WP2b. **Parallel with**: WP3, WP6a, WP6b, WP6c.
- **Owns**: `website-v3/lib/i18n/{types,index,en,pt,es,fr,nl,de}.ts`, `website-v3/lib/stamps.ts`, `website-v3/lib/site.ts` (new constants), `website-v3/scripts/check-i18n.mjs`.
- **Read-only**: components, Round 8 copy map (`Website-v3-Redesign-Plan.md` ~402-413).
- **Steps**: (1) Transitional typing per section 8: `en` typed `Record<Key | NewKey, string>`; other locales `Record<Key,string> & Partial<Record<NewKey,string>>`; `t()` falls back to English for a missing NewKey (WP21 removes). (2) Add the slice keys in section 8 to `types.ts` and `en.ts` first; this English commit is the gate for WP7-10. (3) Five locale agents (one file each) add translations in parallel; `// REVIEW-NATIVE` for unsure strings; do not machine-translate idioms. (4) `lib/stamps.ts` with keys `approved`, `void`, `proof`; non-EN words only if the Mornsey cmap covers them, otherwise EN fallback. (5) `lib/site.ts`: `SITE_FACTS` extended (all null/empty), `export const MCP_TARGET: string | null = null` (ISO date), city and run only as facts; no run numbers, cities or SKUs inside i18n strings (templates with params). (6) Replace "premium"/"eco-friendly" in slice strings only. (7) `check-i18n.mjs`.
- **Acceptance**: tsc fails for a key missing in `en.ts` (and only there); check-i18n lists per-locale gaps (zero for slice keys); no new string contains premium/eco-friendly or a hard-coded run/SKU literal; spot-check pt and de (longest) in specimen layouts; lint+build pass.
- **Size**: M.

### WP6a: Primitives core
- **Goal**: Button, Field, Chip, SpecCard, SpecRow, PaperInsert, RegMarks on real tokens.
- **Depends on**: WP2b. **Parallel with**: WP3, WP5, WP6b, WP6c.
- **Owns**: `website-v3/components/ui/{Button,Field,Chip,SpecCard,SpecRow,PaperInsert,RegMarks}.tsx`, `design-tokens/components.css`, `website-v3/app/styles/ui-legacy.css`.
- **Read-only**: `components/home/styles.ts`, all other partials, `platform/**`.
- **Steps**: (1) Keep the `.btn-ink` squeegee mechanic (now in `ui-legacy.css`), shortened to 200-240ms with `--p-ease-cut`; keep `.btn-ink`/`.link-ink` as aliases until WP21. (2) Build components per section 5 (variants, sizes, states, 44px hit via pseudo, `--dim` disabled). (3) Field: label wiring, five states, focus recipe; paper focus is fg. (4) SpecCard optional `priceFrom|moq|lead`; SpecRow hides on null. (5) Fill `components.css` with semantic tokens only (never shadcn names). (6) Verify via an uncommitted scratch page; no styleguide route yet.
- **Acceptance**: default/hover/focus-visible/disabled (+invalid for Field) state shots on ink and paper; `contrast.mjs` focus pairs pass; `rg '#[0-9a-fA-F]{3,8}' components/ui design-tokens/components.css` empty; no page changes (diff 0%); lint+build pass.
- **Size**: L.

### WP6b: Stamp, material and budget scripts
- **Goal**: capped Mornsey stamp plus the scripts that enforce the stamp and accent budgets.
- **Depends on**: WP2b. **Parallel with**: WP3, WP5, WP6a, WP6c.
- **Owns**: `website-v3/components/ui/Stamp.tsx`, `components/ui/stamp-font.ts`, `website-v3/app/fonts/Mornsey.woff2` (converts it; sole owner), `design-tokens/stamp.css`, `website-v3/scripts/verify/stamps.mjs`, `website-v3/scripts/verify/check-budgets.mjs` (both stubs from WP1), `website-v3/scripts/verify/README.md`.
- **Read-only**: `lib/stamps.ts`, `Mornsey-PUA.ttf`, `website-v3/package.json` (deps and scripts registered by WP1).
- **Steps**: (1) Stamp per 4.5 (`word` key, clamps, `aria-hidden`, brand 2px misreg only in `fg` tone, 160ms hard stamp-in only under `no-preference`). (2) `stamps.mjs` runs under `tsx` (devDep from WP1) so it can import `lib/stamps.ts` directly; the cmap check uses opentype.js for every string/locale. Page counting walks the import graph with the TypeScript compiler API (resolving the `@/` alias from `tsconfig.json`), starting at each `app/**/page.tsx`, counting `<Stamp` JSX in reachable modules; fails above 2. (3) `check-budgets.mjs` (Playwright, **delivered here, not later**): per route and per scrolled 1440x900/390x844 viewport asserts `[data-stamp]` count (max 1), brand-pixel coverage (samples pixels within ±12 of `#ff5a2c`/`#ff4a1c`; fails above 6%, warns above 5%), and at most one `.mf-btn[data-variant=primary]` in view. (4) Document the viewport rule in `scripts/verify/README.md` (not in `design-tokens/README.md`, which WP2b/WP21 own).
- **Acceptance**: `'ÀÇ¿'` fails `verify:stamps`, real strings pass; Mornsey requested only on routes using Stamp; clamps work; budgets script passes on a scratch page with two stamps; lint+build pass.
- **Size**: S.

### WP6c: Controls: Toggle, Swatch, Tabs, Dialog
- **Goal**: the remaining primitives so ProductModal/FilterDrawer/mobile menu are not built ad hoc later.
- **Depends on**: WP2b. **Parallel with**: WP3, WP5, WP6a, WP6b.
- **Owns**: `website-v3/components/ui/{Toggle,Swatch,Tabs,Dialog}.tsx`, `design-tokens/components-controls.css`, `website-v3/lib/motion/scrollLock.ts`, `website-v3/lib/motion/dialogState.ts`.
- **Read-only**: `design-tokens/components.css`, `components/ProductModal.tsx`, `catalog/FilterDrawer.tsx`.
- **Steps**: (1) Toggle (`aria-pressed`/`role=switch`, 44px hit over 18px box). (2) Swatch (24px visual, 44px hit, selected ring `--focus`, name in sr-only/tooltip). (3) Tabs (roving tabindex, arrows). (4) Dialog: native `<dialog>` with `showModal()`, Esc, backdrop click, focus restore, `inert` on the app root, scroll lock compatible with Lenis (`lenis.stop()`), `modal|drawer|menu` variants by data attribute, 160ms cut open/close; sets/clears a shared open-dialog flag in `dialogState.ts` (exported `isDialogOpen()` plus subscribe) so the Cursor can fall back to the native cursor. (5) Tokens only; no hex.
- **Acceptance**: keyboard test: dialog traps focus, Esc closes, focus returns; arrow keys work in Tabs; hit areas 44px (bounding-box assertion); scroll lock works with Lenis running; `dialogState` flips on open/close; lint+build pass.
- **Size**: M.

### WP7: Slice A: cover with composer
- **Goal**: the home fold becomes the app: fitted BLACKOUT MERCHANDISE, promise, 2-line composer, artist chips.
- **Depends on**: WP4, WP5, WP6a. **Parallel with**: WP8, WP9, WP10, WP10m, WP11.
- **Owns**: `website-v3/components/home/Cover.tsx`, `components/home/HeroComposer.tsx` (new, client), `components/home/BriefCard.tsx` (extract if needed), `components/motion/useBriefPlaceholder.ts`, `components/motion/LoadIntro.tsx` (cover intro only), `website-v3/app/styles/cover.css`, `components/home/ScrollScenes.tsx` (cover block and scrub constants only; wave 5 owner), `scripts/verify/hook-contract.json` (cover rows).
- **Read-only**: `app/page.tsx`, `lib/i18n/*`, `components/ui/*`, `Halftone.tsx`, `FittedWord.tsx`, preflight output.
- **Steps**: (1) Read `Cover.tsx` and the ScrollScenes cover scene (~57-135). (2) Structure per 6.1 item 1; `100svh`; the clip-path `[data-cover-media]` scene is removed from the fold and the ScrollScenes cover block is null-guarded (`if (!el) return`), mobile branch keeps one pin only; record the changed hooks in `hook-contract.json`. (3) HeroComposer: Field composer rows=2, square 48px primary send, 4 `Chip suggest` that fill and focus; Enter sends, Shift+Enter newline; submission keeps today's BriefCard behaviour. (4) `useBriefPlaceholder`: aria-hidden overlay span with stepped type-on and block caret over `home.composer.placeholder.N`, all locales (remove the `lang === 'en'` guard), pauses on focus/typing, static first prompt under reduced motion. (5) Run label rendered only when `lib/site.ts` supplies run number and city. (6) Remove the facts row, `home-cover-footer`, `getLenis` use; delete WP1's temporary focus CSS. (7) Retune scrub to 0.2 in the owned ScrollScenes blocks (the minimal early machine pass, see WP10m). (8) The cover Halftone keeps passing `priority` only; hover tone arrives through Halftone's new default (WP15). (9) Mobile 390x844: composer and chips in the first viewport. (10) Reserve composer and masthead heights (CLS 0, also with fonts throttled and with the non-EN dictionary loading late). (11) Shots ink 1440x900, 390x844, reduced motion, in en/pt/de.
- **Acceptance**: wordmark, promise, tagline, composer and four chips visible without scrolling at 1440x900 and 390x844; keyboard focus ring visible; brand 5% or less of the first viewport and exactly one primary Button; no CLS; LCP image keeps priority; `check-tokens --files <owned>` clean (weight 300 etc.); focus-checklist rows for owned files cleared; lint+build pass.
- **Size**: L.

### WP8: Slice B: ProductBand and AppFrame
- **Goal**: show the product on the page and put the home on ink.
- **Depends on**: WP5, WP6a, WP6b. **Parallel with**: WP7, WP9, WP10, WP10m, WP11.
- **Owns**: `website-v3/app/page.tsx`, `components/home/ProductBand.tsx`, `components/ui/AppFrame.tsx`, `design-tokens/components-frame.css`, `website-v3/app/styles/product-band.css`.
- **Read-only**: `Cover.tsx`, `components/ui/*`, `platform/components/chat/*` (structure reference), `aurora-dashboard/index.html`.
- **Steps**: (1) Study `ChatShell`, `MessageBubble`, `EmptyState` and Aurora structure; do not copy Aurora CSS, Arial, gradient text, strands or beam. (2) Build AppFrame per section 5: titlebar with mono breadcrumb and a brand live-agent dot, 64px rail (inline SVG; lucide-react only if preflight confirmed), chat column (user brief in mono, agent sentence-case reply, working row, tool-call row), right pane with the mockup card on a PaperInsert (real packshot from PRODUCTS; the caption template is filled from the product's SKU code, name and print-colour count, never typed text), quote as SpecRows (blank, print, total; hidden when fact null; `product.quote.priced` when no price), proof-approved with `<Stamp word="approved" tone="fg">`, `.mf-glass` composer line, RegMarks, EXAMPLE tag. (3) ProductBand: mono index, `.t-display-l`, AppFrame, caption row "Real flow, shown static" plus MCP line only if `MCP_TARGET` set; CTA is Button `secondary`. (4) One 160-240ms stepped clip reveal; final state static for reduced motion; reserve frame height. (5) `page.tsx`: replace `<main data-theme='vintage' style={...}>` with the ink default, insert `<ProductBand />` after `<Cover />`, keep other sections in current order, update the stale Round 6 comment. (6) Mobile: single column (rail hidden). (7) Re-check text contrast on the ink-flipped middle sections with `contrast.mjs` and a manual look; all text grounds used (bg-raised, bg-surface) are covered by the extended pairs (3.7).
- **Acceptance**: chat, mockup, quote, proof-approved in one frame at desktop and mobile; exactly one Stamp in the viewport; no rendered placeholder or fabricated values (SKU/product from `PRODUCTS`); reduced-motion shot equals final state; no CLS; server component with client islands only where needed; lint+build pass.
- **Size**: L.

### WP9: Slice C: About, header, footer on ink
- **Goal**: prove the system on an ink inner page and ship the header/footer every page shows.
- **Depends on**: WP5, WP6a. **Parallel with**: WP7, WP8, WP10, WP10m, WP11.
- **Owns**: `website-v3/components/editorial/EditorialPage.tsx`, `app/about/page.tsx`, `app/about/AboutCopy.tsx`, `components/SiteHeader.tsx`, `components/SiteFooter.tsx`, `components/LanguageSwitcher.tsx`, `lib/site-map.ts` (new), `app/styles/{header,footer,editorial}.css`.
- **Read-only**: contact/waitlist routes, `not-found.tsx`, `lib/i18n/*`, `components/ui/*`.
- **Steps**: (1) `lib/site-map.ts` as the single nav source. (2) Header per 6.4: real routes, `aria-current`, 44px targets (hamburger and apply are 36px today at ~220-232), Apply is Button **secondary**, hover brand underline, remove all 18 inline style sites, mobile menu as Dialog `menu` (consume WP6c or a local fallback until it lands); delete the interim header/footer re-scope from `tokens-legacy.css`'s owner note by handing it to WP21 if the file is not yours (record it). (3) Footer: `data-theme="ink"`, no raw hex, fitted BLACKOUT MERCHANDISE, 44px targets, mono RUN/catalogue line only from data, dev-badge padding. (4) EditorialPage `density` prop (`story|form`) and `plate`; drop 300 weight and centred statements (~line 57); remove giant words from inner pages (keep BLACKOUT MERCHANDISE in footer); inline MONO objects to `.t-label`; delete the legacy ~1132 `0.5em/char` pre-hydration fallback rule from `editorial.css`. (5) About per 6.2; Halftone plate passes `priority` only (hover tone via the Halftone default). (6) No per-route `viewport` export (root INK covers it). (7) Check keyboard order, skip link, the six locales for header overflow (pt, de longest). (8) Shots /about at 1440, 390, reduced motion in pt and de; header/footer on `/`, `/catalog`, `/about`.
- **Acceptance**: six real site-map items with active state and 44px areas; footer has no raw hex; About shows content in the first viewport with no gap under the plate; no weight 300, no centred paragraph, no inline font styles in touched files (`verify:type --files`); focus-checklist rows for owned files cleared; header Apply is not a brand fill; lint+build pass.
- **Size**: L.

### WP9p: G2 patch package (only on an "adjust" outcome)
- **Goal**: give an "adjust" answer at G2 an executable plan.
- **Depends on**: G2 outcome "adjust". **Runs**: between G2 and W6.
- **Owns**: determined by the owner's change list: the orchestrator maps each change item to the file owner of the original slice WP (WP7: cover files; WP8: ProductBand/AppFrame/`page.tsx`; WP9: header/footer/About; WP10: catalog; WP10m: motion files; WP11: platform tokens) and spawns one patch task per owner with exclusive ownership of only those files. Token values (palette, type scale, accent budget) are edited only in `design-tokens/*` by their original owners (WP2b/WP4).
- **Steps**: (1) Orchestrator writes `g2-change-list.md` with one row per item: surface, change, files, original WP. (2) One patch task per owner, same verification as the original WP. (3) Re-shoot the changed surfaces and send a before/after to the owner; one more yes/no ("go") closes G2. A "change direction" outcome stops the plan and returns to the owner for a new round.
- **Acceptance**: every change-list row closed or explicitly dropped by the owner; slice acceptance criteria still pass. **Size**: S-M (scales with the list).

### WP10: Slice D: catalog on a paper insert (+ modal paper wrapper)
- **Goal**: prove the paper-insert side: packshot grid, spec cards, catalog header; show the modal grammar on paper.
- **Depends on**: WP5, WP6a. **Parallel with**: WP7, WP8, WP9, WP10m, WP11.
- **Owns**: `website-v3/components/GridView.tsx`, `app/catalog/page.tsx`, `app/styles/catalog.css`, `components/ProductModal.tsx` (**one change only**: wrap the dialog body in `data-theme="paper"`; the rest is WP15).
- **Read-only**: `FilterDrawer.tsx`, `ViewShell.tsx`, `GalleryView.tsx`, `Halftone.tsx`, `components/ui/*`, `lib/catalog-stats.ts`, `lib/site.ts`.
- **Steps**: (1) Read `GridView.tsx` (55 inline style sites; ~29-34 mono style, ~438-513 role choices, ~539-609 headings, ~575 scrim, ~753, ~817-850 search). (2) Layout per 6.3: ink header (mono index + `.t-display-xl`, keep one stat strip), PaperInsert with filter bar and grid, ink footer. (3) SpecCard `product` tiles with solid caption bar replacing the `rgba(0,0,0,.6)` gradient scrim (~575), 12-13px mono captions, price-from/MOQ only if set; hover via CSS only. (4) Field 48 for search; Chips for role/filter (replace the 52% colour-mix at 3.40:1 and opacity dims). (5) Convert static inline styles to `catalog.css` classes; keep only dynamic values inline. (6) Mobile 2-up with 44px targets. (7) FilterDrawer and the rest of the modal untouched; verify they open and stay legible on the insert (acceptable interim; **gallery is not in the slice and the modal paper grammar is only partly proven at G2**).
- **Acceptance**: no Barlow sentence-case headline remains; grid on `#e9e7e1` with grain and hard cut; solid caption bar, 12px+ mono; `rg 'style=\{\{' components/GridView.tsx` drops at least 80% (record before/after); visible focus ring on paper (fg); focus-checklist rows for owned files cleared; shots at 1440, 390, reduced motion; lint+build pass.
- **Size**: L.

### WP10m: Early machine feel (for G2)
- **Goal**: let the owner feel the terminal tempo at G2.
- **Depends on**: WP2b. **Parallel with**: WP7-WP10, WP11.
- **Owns**: `website-v3/components/SmoothScroll.tsx`, `app/template.tsx`, `components/motion/PageTransition.tsx`, `app/styles/motion.css`.
- **Read-only**: `ScrollScenes.tsx` (WP7 owns the scrub constants this wave).
- **Steps**: (1) Lenis duration 1.1 and only when `(pointer: fine)`, width 1024px+, reduced motion off. (2) Replace the 0.55s paper sweep with a hard 200ms ink clip cut (transform/clip-path only), failsafe 1.8s. (3) Stepped composer overlay already ships in WP7. Everything else in motion waits for WP16.
- **Acceptance**: route change about 200ms (Playwright trace, ±40ms); Lenis off on touch and reduced motion; zero console errors; lint+build pass.
- **Size**: S.

### WP11: Platform tokens: delete the fork
- **Goal**: the platform consumes the shared tokens; split chat CSS so later platform WPs have disjoint files.
- **Depends on**: WP0 (commit, not waiver), WP2b, WP4. **Parallel with**: WP5-WP10m. **If WP0 was waived**: WP11 is blocked and G2 proceeds without it.
- **Owns**: `platform/app/globals.css`, `platform/components/chat/tokens.css` (becomes an aggregator of imports), `platform/components/chat/{shell,composer,thread,voice}.css` (new splits), `platform/lib/fonts.ts` (sole owner), `platform/app/layout.tsx`.
- **Read-only**: `platform/components/chat/*.tsx`, `platform/components/ui/*`, `platform/lib/agent/*`, `platform/lib/tools/*`, `website-v3/lib/fonts.ts`.
- **Steps**: (1) Precondition: `git status --short platform` is clean for `components/chat`, `lib/agent`, `lib/tools`; otherwise abort. (2) `globals.css`: start with the same layer-order statement (3.1), then tailwind/tw-animate/shadcn imports, then `@import` of `../../design-tokens/index.css` (the route WP2b recorded); shadcn map per 3.6; `--radius: 0.25rem`; `<html data-theme="ink">`. (3) Split `tokens.css` along its section comments into the four partials; layouts' imports of `tokens.css` stay valid. (4) Delete the `:root` fork (`--paper #221f1c`, Helvetica stack, `--hairline` border shorthand renamed `--bd-hairline`); alias `--mf-*` names onto semantic tokens so `.tsx` files need no edits. (5) Replace literal radii (999px, 32px, 16px, 20px, 12px; ~62-80, ~357-365) with `var(--p-r-*)` (composer/chips 8px max until WP19). (6) `platform/lib/fonts.ts` mirrors the site's `lib/fonts.ts` names (`--ff-display|mono|body`), `weight` arrays incl. the display face, `latin-ext`; `.mf-display` now resolves to the real display face; unify `--ff-mono`; remove unused Barlow 600. (7) A script lists `var(--x)` usages with no definition on `/chat` and admin; alias any gaps. (8) lint+build in platform; shots of `/chat` and an admin page at 1440 and 390 using the capture route from decision 28 (mock mode via `AGENT_MOCK=1`, an existing dev fixture, or an owner-supplied `storageState`; otherwise owner-captured).
- **Acceptance**: `rg -- '--paper:|Helvetica' platform/components/chat/tokens.css platform/app/globals.css` empty; platform renders in ink with the brand colour; focused-control outline and live dot computed colour are `#ff5a2c` (3.6 verification); no synthesised bold; no undefined variables; lint+build pass.
- **Size**: M.

### G2: Direction review of the vertical slice
- **Goal**: the owner judges Pressroom Terminal in the browser before any generalisation.
- **Depends on**: WP7, WP8, WP9, WP10, WP10m, WP11 (WP11 only if WP0 was a commit, not a waiver).
- **Steps**: run `npm run dev` (website-v3 port 3004; platform on its own port); `verify:shots` for `/`, `/about`, `/catalog` at 1440x900, 390x844 and reduced motion in en, pt and de; produce a before/after contact sheet (en/pt/de + mobile) against the baseline and send it with the localhost links. State explicitly what is **in scope**: cover + composer, the ProductBand app-frame, About, header and footer, catalog paper insert, the platform tokens (when WP11 ran), and the tempo (Lenis, 200ms cut, stepped overlay). State what is **not** judged: the unrecomposed home middle (it is ink-on-ink and half-old until WP13), gallery, the full modal and drawer, full motion. Ask for: go / adjust (WP9p, then one more "go") / change direction. On go, lock the accent budget numbers and type scale.
- **Acceptance**: decision recorded (WP21 appends it to the plan doc).
- **Owner gate**: owner approves or issues a change list.

### WP12: Copy-2: remaining sections, six locales
- **Depends on**: G2. **Parallel with**: WP17.
- **Owns**: `website-v3/lib/i18n/{types,index,en,pt,es,fr,nl,de}.ts`, `lib/site.ts`, `app/llms.txt/route.ts`, `app/layout.tsx` (metadata strings only), `app/sitemap.ts`.
- **Steps**: (1) English keys first (gate for WP13-15), then five locale agents in parallel. (2) Walk every key group in section 8; rewrite premium/eco-friendly/Issue 01/Autumn-Winter; keep Round 8 lines; add earn, merged Cloth, Agents roadmap, who-for tiles, 404 rows/joke, stamp strings. No facts inside strings (section 8). (3) Update `SITE_DESCRIPTION` and `llms.txt` (`SITE_URL` stays as is). (4) `REVIEW-NATIVE` flags. (5) Do not delete now-unused keys (WP21 does).
- **Acceptance**: no 'premium', 'eco-friendly' or 'Issue 01' in any locale file; tsc passes; pt/de strings fit in WP13/14 shots; `llms.txt` output matches the voice.
- **Size**: M.

### WP13: Home recomposition: density cut and band merge
- **Depends on**: G2, WP12 (English keys). **Parallel with**: WP14, WP15, WP17.
- **Owns**: `website-v3/app/page.tsx`, `components/home/{Cloth,SetList,CatalogTeaser,Agents,ApplySection,OutlinedWord,WhoFor,HowYouEarn}.tsx`, `ScrollScenes.tsx`, `styles.ts`, `app/styles/home.css`, `scripts/verify/hook-contract.json`; deletes `Statement.tsx`, `ZeroUpfront.tsx`, `Paths.tsx`, `PrintedFor.tsx`.
- **Read-only**: `lib/i18n/*`, `components/ui/*`, `Cover.tsx`, `ProductBand.tsx`.
- **Steps**: (0) Re-run `npm run verify:preflight` first and reconcile `hook-contract.json` with WP7's ScrollScenes edits and any hook preflight cannot confirm; edit only against the updated contract. (1) Order per 6.1; halve `.home-section` padding to `--section-y`. (2) Hook contract: keep `data-scene` (cover, product, cloth, who, earn, setlist, apply), `.home-masthead-wrap`, `[data-rise]`, `[data-count]`, `[data-fill]`, `[data-lines]`, `[data-wipe]`, `[data-step]`, `[data-path-card]`, `.home-stat-row`, `[data-cut]` (only those preflight confirmed or that this WP adds). (3) Cloth, WhoFor, HowYouEarn, SetList, CatalogTeaser, Agents, Apply per 6.1 (APPLY keeps the `OutlinedWord` at 2.5px with misregistration; Field email; one primary Button; no inline `fontSize/fontFamily`, ~line 48 of `ApplySection.tsx`). **Statement rule**: the statement text is `.t-statement`, never scrubbed to grey; delete the colour-scrub tween and any opacity/colour dimming of the paragraph; it reveals by hard clip cut only and is at `--fg-soft` or brighter at every scroll position (assert by sampling computed colour at 0/50/100% scroll). (4) `ScrollScenes.tsx`: delete scenes for removed bands; keep cover (guarded), Cloth, HowYouEarn reveals; mobile branch uses a stepped 240ms reveal. (5) Before deleting `Statement.tsx`, `ZeroUpfront.tsx`, `Paths.tsx`, `PrintedFor.tsx`, `rg` for every importer and i18n consumer (about page, `app/**`, `components/**`, `lib/**`); migrate or stop if a non-home importer exists; then delete. (6) Remove `styles.ts` PRIMARY_BTN/SECONDARY_BTN/MORE_LINK/FOCUS_RING exports (file if unused) once all importers (including `CatalogTeaser`, `ZeroUpfront`) are gone. (7) Shots en/pt/de desktop and mobile and reduced motion; stamp count check.
- **Acceptance**: home height drops 25%+ from baseline (record numbers; 7650px or less), 8 or fewer sections; `rg 'FittedWord|OutlinedWord' components/home` shows only BLACKOUT MERCHANDISE/APPLY uses; Statement/Zero/Paths/PrintedFor files deleted with no importers; statement colour never below `--fg-soft`; no 'Soon' in any locale; mobile blanks scroll-snap strip and SetList accordion; one primary Button per viewport; `check-tokens --files <owned>` clean; lint+build+verify scripts pass.
- **Size**: XL.

### WP14: Inner pages: contact, waitlist, 404
- **Depends on**: G2, WP12. **Parallel with**: WP13, WP15, WP17.
- **Owns**: `website-v3/app/contact/{page,ContactCopy}.tsx`, `app/waitlist/{page,WaitlistForm}.tsx`, `components/editorial/RolePicker.tsx`, `app/not-found.tsx`, `app/NotFoundCopy.tsx`, `app/styles/contact-waitlist.css`.
- **Read-only**: `EditorialPage.tsx`, `components/ui/*`, `lib/i18n/*`, `app/waitlist/actions.ts`.
- **Steps**: per 6.2. Keep `submitWaitlist`, URL params (product, colour, favourites, brief, role), validation and success/error states unchanged. Remove the inline 64px override (~224) and the 56px/22px input spec (~210-211). RolePicker public props unchanged; selected = fg fill + check. 404 has exactly one `<Stamp word="void">` and three keyboard-reachable link rows; reduced motion static. No per-route `viewport` export.
- **Acceptance**: contact, waitlist, About, 404 visibly different (side-by-side shots); all fields use Field and all buttons Button; no inline height overrides in WaitlistForm; RolePicker state visible without colour alone; focus rings on all fields; weight-300 and focus-checklist rows for owned files cleared; lint+build pass.
- **Size**: M.

### WP15: Catalog commerce surfaces: modal, drawer, gallery, halftone
- **Depends on**: G2, WP12, WP6c. **Parallel with**: WP13, WP14, WP17.
- **Owns**: `website-v3/components/ProductModal.tsx`, `components/catalog/FilterDrawer.tsx`, `components/GalleryView.tsx`, `components/ViewShell.tsx`, `app/gallery/page.tsx`, `components/editorial/Halftone.tsx`, `app/styles/{modal-filter,gallery}.css`.
- **Read-only**: `GridView.tsx`, `components/ui/*`, `lib/i18n/*`.
- **Steps**: (1) ProductModal (52 inline sites, heading ~960): Dialog on a PaperInsert, SpecRows, Swatch (44px), Chip sizes, one Button primary; keep all props, state, focus trap and `?product=` deep link. (2) FilterDrawer (23 sites; opacity dims at ~259 and ~272, checkboxes/swatches ~300-345, button ~384-400): Toggle/Swatch/Chip/Button, `--dim`, exported props unchanged (GridView consumes them). (3) GalleryView: header pattern, H1 "Printed work" replacing the clamp(3.25rem,11vw,9.5rem) title (~74-75), paper tiles with credit lines only when data exists, one grading recipe. (4) Halftone: separate hover-tone from `priority` (old `tone = hoverTone && !priority`, ~line 39). The new default is hover tone ON regardless of `priority`, opt out with `hoverTone={false}`, so the existing priority callers (the Cover plate from WP7 and the EditorialPage/About plate from WP9) get the fix with NO call-site change; load the second tone image on first `pointerenter` (not at mount); keep the API backward-compatible. Verify with hover screenshots of the Cover plate and the About plate that colour appears. (5) ViewShell: ink header + paper insert + ink footer. (6) No per-route `viewport` export (header ink, root INK). (7) Shots: open modal, open drawer, gallery at 1440 and 390 and reduced motion; keyboard test.
- **Acceptance**: no inline fontFamily/fontSize in touched files; inline style count falls 70%+ across the three files; all hit areas at least 44px (bounding-box check); focus trapped and restored in modal and drawer; gallery title no longer 152px sentence case; Cover and About plates show colour on hover; focus-checklist rows for owned files cleared; lint+build pass.
- **Size**: L.

### WP16: Motion retune and cursor fixes (full)
- **Depends on**: WP13, WP14, WP15. **Parallel with**: WP17.
- **Owns**: `website-v3/components/{SmoothScroll,Cursor}.tsx`, `app/template.tsx`, `app/layout.tsx` (Cursor mount only), `components/motion/{PageTransition,LoadIntro,FooterEcho}.tsx`, `components/motion/useReducedMotion.ts` (new), `components/motion/machine.ts` (new: typeOn, tickCounter, hardCut), `components/home/ScrollScenes.tsx`, `app/styles/motion.css`.
- **Steps**: (1) Profile first: Chrome performance trace (Playwright tracing, 4-6x CPU throttle) of the cover scene and scrub handlers; report long frames before changing; keep clip-path only if frames stay under 16ms, else transform-only. (2) Finish values per section 7 (scrub 0.15-0.3 at ~57, 77, 110, 135, 198). (3) `useReducedMotion` (matchMedia + `change` listener) replaces the five mount-time reads (SmoothScroll, Cursor, PageTransition, FooterEcho, cover); ScrollScenes uses `gsap.matchMedia()` with desktop fine-pointer / mobile / reduced conditions. (4) Cursor rewrite per section 7, mounted once in `layout.tsx`: switch to pointer events (`pointermove`/`pointerleave`/`pointerdown`, mouse pointerType only) instead of mouse-only events, re-hit-test hover state after scroll settles (scroll-driven state), hide on document leave, `gsap.quickTo`, stop rAF when settled, and yield to the native cursor while `isDialogOpen()` (WP6c `dialogState.ts`) is true. (5) LoadIntro once per session, 1.2s or less, failsafe 1.8s. (6) Machine layer usage: ProductBand lines, stats ticking off `.home-stat-row`, band reveals cut to 160-240ms; shorten old 0.9s masks and 1s wipes to 400-600ms; confirm the Statement paragraph has no scrub (WP13 rule). (7) Verify only transform/opacity/clip-path animate (`rg "gsap\.(to|from).*(width|height|top|left)"` empty).
- **Acceptance**: trace summary documented; cursor idle CPU about 0; cursor hides over an open modal/menu dialog and works with pen/touch pointers off; reduced motion: all content visible, no cursor, no Lenis, no transitions (assert opacity 1 on `[data-rise]`, `[data-lines]`, `[data-fill]`, `[data-cut]`); navigation about 200ms; `useReducedMotion` is the only reader; lint+build pass.
- **Size**: L.

### WP17: OG, icons, mark vectorisation
- **Depends on**: WP4, G2. **Parallel with**: WP12-WP16.
- **Owns**: `website-v3/app/{opengraph-image,twitter-image,icon,apple-icon}.tsx`, `app/favicon.ico`, `scripts/fonts/*`, `scripts/gen-og-halftone.mjs`, `scripts/make-favicon.mjs`, `public/brand/mark.svg` (new).
- **Read-only**: `public/brand/mark.png`, `platform/components/chat/RegisterMark.tsx` (note: this is the real path), `lib/i18n/*`.
- **Steps**: (1) Place the chosen display/mono TTFs in `scripts/fonts` with a README (source, licence); confirm Latin Extended coverage for baked strings (static EN). (2) OG 1200x630 ink ground, fitted BLACKOUT MERCHANDISE, hero tagline, single orange registration mark, halftone plate; under 300KB. (3) Icon/apple-icon: ink square, bone mark, brand fill only where legible at 16px; regenerate `favicon.ico`. (4) Trace `mark.png` to a single-path `mark.svg` under 5KB; `rg brand/mark.png` before removing references. (5) Preview strip for the owner.
- **Acceptance**: four images render with new faces and ink ground; no Barlow Condensed/Plex TTFs referenced; `mark.svg` under 5KB; lint+build pass.
- **Size**: M.

### WP18: Platform shell: rail, routes, top bar
- **Depends on**: G2, WP11. **Parallel with**: WP19, WP20 (may run alongside WP12-WP16).
- **Owns**: `platform/components/chat/{ChatShell,TopBar,icons}.tsx`, `platform/components/chat/AppRail.tsx`, `BottomTabs.tsx` (new), `platform/components/chat/shell.css`, `platform/app/(chat)/layout.tsx`, `platform/THIRD_PARTY.md`.
- **Read-only**: `Composer.tsx`, `EmptyState.tsx`, `ChipsRow.tsx`, `useConversation.ts`, `platform/lib/agent/*`, `platform/lib/tools/*`, `aurora-dashboard/index.html`.
- **Steps**: (1) `git status platform` clean or stop. (2) Enumerate real routes under `platform/app`; rail lists only those; missing sections go in the PR as follow-ups. (3) AppRail per section 5 (`nav` landmark, `aria-label`, `aria-current`, 44px targets), BottomTabs below 48rem with safe-area padding. (4) TopBar restyled; wiring untouched. (5) ChatShell: skip link, `main` landmark, rail layout, breakpoints 65/42/23rem and short height; props and hooks identical. (6) `THIRD_PARTY.md`: Lucide (ISC), Aurora structure reference, no copied code. (7) Test keyboard rail > composer, mobile bottom tabs, reduced motion, no layout shift when the thread opens (capture route per decision 28).
- **Acceptance**: rail has only real routes and each navigates; skip link works; landmarks present; tab order rail, top bar, thread, composer; content not hidden under bottom tabs; `git diff` shows no change in `useConversation.ts`, `lib/agent/*`, `lib/tools/*`; lint+build pass.
- **Size**: L. **Owner gate**: WP0 commit present.

### WP19: Platform composer, greeting, chips
- **Depends on**: G2, WP11. **Parallel with**: WP18, WP20.
- **Owns**: `platform/components/chat/{Composer,EmptyState,ChipsRow,SuggestionsDropdown}.tsx`, `platform/components/chat/composer.css`, `platform/components/ui/{input-group,textarea}.tsx`.
- **Read-only**: `ChatShell.tsx`, `useConversation.ts`, `useVoice.ts`, `useUpload.ts`, `platform/lib/agent/*`.
- **Steps**: per section 5 platform table. Preserve every prop, callback and the Enter-to-send behaviour (~249); add Cmd/Ctrl+Enter alias only; mode select rendered only if protocol has modes (else a follow-up); focus via `:has(textarea:focus-visible)` replacing the 22%-to-40% border change (~367-370); remove 999px pills; migrate any `Chip/Modal/Hairline` callers inside owned files. Test in mock mode: send, attach, voice toggle (UI only), IME composition, long text, mobile keyboard overlap (`visualViewport`), reduced motion.
- **Acceptance**: two rows with a toolbar, square brand send, Enter sends; visible focus ring; `aria-pressed` toggles; reduced-transparency fallback; greeting in display face, no gradient text; no change to hooks or agent code; lint+build pass; shots 1440 and 390.
- **Size**: L.

### WP20: Platform primitives: radius and dedupe
- **Depends on**: G2, WP11. **Parallel with**: WP18, WP19.
- **Owns**: `platform/components/ui/{button,input,card,dialog,select,badge,popover,dropdown-menu,tooltip,switch,separator,Chip,Modal,Hairline}.tsx`, `platform/components/{admin,storefront,cards}/**` (cards includes `cards/project/*`).
- **Read-only**: `platform/components/chat/*`, `platform/app/**`, `ui/input-group.tsx`, `ui/textarea.tsx`.
- **Steps**: cva variants map to `.mf-btn` (primary/ink/secondary/link; sizes 40/48/56/64); inputs/selects `.mf-field`; cards `--bg-raised` + `--hairline`, no shadows; popovers/dialog `.mf-glass` or `--bg-raised`, radius 8px max; badge becomes a Chip variant; `Modal.tsx` and `Hairline.tsx` become thin wrappers over `dialog` and `separator` (WP20 owns both files and migrates callers in `cards/**`, `storefront/**`, `admin/**`); storefront packshot surfaces on `data-theme="paper"`; replace raw colours and literal radii by tokens. Callers in unowned `platform/app/[slug]/**` and `chat/*` stay on the wrappers, which remain permanently (see WP21).
- **Acceptance**: `rg 'rounded-(lg|xl|2xl|full)|999px' platform/components` only allowlisted uses (avatars); admin and storefront render and meet contrast; lint+build pass.
- **Size**: M.

### WP21: Cleanup, hard guardrails, docs
- **Depends on**: WP13-WP20.
- **Owns**: `website-v3/app/styles/*.css`, `app/globals.css`, `design-tokens/README.md`, `components/home/styles.ts`, `scripts/verify/*`, `package.json` (both apps' verify scripts), `website-v3/CLAUDE.md`, root `CLAUDE.md` (Styling Guidelines section only), `Documentation/Dev/Website-v3-Redesign-Plan.md`, `lib/i18n/*` (unused keys, strict typing), `platform/components/ui/{Modal,Hairline}.tsx` (delete only if the caller grep is zero; otherwise keep the wrappers and record why), `website-v3/app/dev/styleguide/page.dev.tsx` (optional). `design-tokens/semantic.css` needs no alias edit (aliases live in `tokens-legacy.css`).
- **Steps**: (1) Remove legacy aliases (`--paper`, `--signal`, `--soft`, `--muted`, `--bone`, `--font-condensed`, `--accent`, `[data-theme='vintage']`) by deleting `tokens-legacy.css` after `rg` shows no use. (2) Delete dead selectors and unused i18n keys; make types strict (drop transitional Partial/fallback). (3) Turn `verify:hex`, `verify:type` and `check-tokens --all` (including weight 300 and the `outline:none` rule) from warn to fail; wire `npm run lint` to run them plus `verify:stamps` and `contrast.mjs`; brand-budget and stamp-budget stay in the PR checklist and `check-budgets.mjs`. (4) Confirm the forced-colors, prefers-contrast and reduced-transparency blocks are active in both apps. (5) Docs: mark the old Space Grotesk/ecru styling guidance superseded in `CLAUDE.md` files; add this Round 9 to `Website-v3-Redesign-Plan.md` and mark Rounds 3-8 superseded where they conflict; record the G1 and G2 decisions and the reversal of the Rounds 6-8 "no accent colour" rule. (6) Final verification: lint+build in both apps; shots in en/pt/de at all three modes for every route; diff vs baseline; contrast; budgets; Lighthouse accessibility 95+ and axe on `/`, `/about`, `/catalog`; production guard.
- **Acceptance**: `rg '--paper|--signal|vintage' website-v3 platform` returns 0 outside docs; repo-wide `font-weight: 300` returns 0; hard checks pass; docs describe the shipped system; section 11 passes.
- **Owner gate**: owner reviews this Round 9 doc and the final screenshot set. **Size**: M.

---

## 10. Run order (waves) and owner gates

| Wave | Packages | Gate |
|---|---|---|
| W0 | WP0 | owner commit approval (or waiver) |
| W1 | WP1 | focus fix verified; preflight output and hook contract saved |
| W2 | WP2a then WP2b | A1 diff 0.1%; tokens/contrast/check-tokens pass; import route and deploy check recorded |
| W3 | WP3 \|\| WP5 \|\| WP6a \|\| WP6b \|\| WP6c (WP5/6x do not wait for the face) | **G1** owner picks faces (or provisional Anton, decision 24) |
| W4 | WP4 (face lock, website `lib/fonts.ts`) | masthead fits in six locales; swap test passes |
| W5 | WP7 \|\| WP8 \|\| WP9 \|\| WP10 \|\| WP10m \|\| WP11 (WP11 only after a WP0 commit) | **G2** owner reviews the slice; "adjust" runs WP9p before W6 |
| W6 | WP12 (English keys land first) | tsc + check-i18n |
| W7 | WP13 \|\| WP14 \|\| WP15 \|\| WP17 (WP13 owns home + ScrollScenes, WP14 inner pages, WP15 commerce surfaces, WP17 OG/icons) | full screenshot suite vs baseline, home height, budgets |
| W8 | WP16 (after WP13/14/15; owns ScrollScenes, template, layout cursor mount) | reduced-motion assertions, CLS 0, trace |
| W9 | WP18 \|\| WP19 \|\| WP20 (may overlap W6-W8 once G2 and WP11 are done) | platform shots, git-diff no-touch check |
| W10 | WP21 | owner reviews Round 9 doc and final screenshots |

Dependency notes: WP7-WP10 need WP4 (or provisional face) plus the English keys of WP5 and the WP6 primitives. Visual WPs wait only for English keys, never for translations. WP3 needs only WP2b (it uses scoped sample markup). WP6a/6b/6c own different CSS files precisely so they run in parallel (`index.css` is never edited after WP2b).

Shared-file ownership by wave (exactly one owner each):

| File | W1-2 | W3-4 | W5 | W6 | W7 | W8 | W10 |
|---|---|---|---|---|---|---|---|
| `website-v3/app/globals.css` | WP1 (638-659), WP2a/WP2b | - | - | - | - | - | WP21 |
| `design-tokens/index.css`, `semantic.css`, `base.css`, `material.css` | WP2b | - | - | - | - | - | - |
| `design-tokens/type.css` | WP2b (interim + classes) | WP4 (values) | - | - | - | - | - |
| `design-tokens/components*.css`, `stamp.css` | - | WP6a / WP6c / WP6b | WP8 (`components-frame.css`) | - | - | - | - |
| `website-v3/app/layout.tsx` | WP2b | WP4 | - | WP12 (metadata only) | - | WP16 (Cursor mount) | - |
| `website-v3/lib/i18n/*` | - | WP5 | - | WP12 | - | - | WP21 |
| `website-v3/app/page.tsx` | - | - | WP8 | - | WP13 | - | - |
| `website-v3/components/home/ScrollScenes.tsx` | - | - | WP7 (cover block, scrub) | - | WP13 | WP16 | - |
| `website-v3/scripts/verify/hook-contract.json` | WP1 | - | WP7 | - | WP13 | - | - |
| `website-v3/package.json` | WP1 (all deps and scripts) | - | - | - | - | - | WP21 |
| `website-v3/app/fonts/Mornsey.woff2` | - | WP6b | - | - | - | - | - |
| `platform/lib/fonts.ts` | - | - | WP11 | - | - | - | - |
| `platform/components/chat/tokens.css` and partials | - | - | WP11 (split), then `shell.css` WP18, `composer.css` WP19 | - | - | - | - |

---

## 11. Verification protocol

Per WP, in each touched app: `npm run lint && npm run build` (website-v3 dev port 3004; platform on its own port), plus `check-tokens --files <owned files>` as a hard check.

1. **Screenshots**: `npm run verify:shots` at 1440x900, 390x844 and reduced motion for `/`, `/about`, `/contact`, `/waitlist`, `/catalog`, `/gallery`, `/nope`; locales en, pt, de on every layout WP (es, fr, nl on text-heavy ones), set through `localStorage['mf-lang']` with the dictionary chunk awaited; `npm run verify:diff` against the baseline in `Documentation/Dev/v3-review-shots-2026-10-06/scroll` (copied to `website-v3/.verify/baseline-2026-10-06`). Pixel-strict only inside WP2a. Scroll-scrubbed pages are scrolled through before capture.
2. **Contrast**: `node scripts/contrast.mjs` on every pair in `contrast-pairs.json` (extended grounds, 3.7); new pairs appended. Fails on brand-as-text on paper and requires `#e63a0c` only for large text; focus pairs for both themes.
3. **Raw hex**: `npm run verify:hex` (warn until WP21): none in components/app outside `design-tokens`, `lib/theme-colors.ts`, the four OG/icon files, `app/dev/**`. `check-tokens` also fails (per owned files; repo-wide at WP21) on `outline:none` without `:not(:focus-visible)`, weight 300, Space Grotesk, Arial, liquidGL, lil-gui, `background-clip: text`, and on shadcn names inside `design-tokens/**`.
4. **Inline type**: `npm run verify:type`; record inline-style counts per owned file before/after in the PR.
5. **Stamps and accent**: `verify:stamps` (cmap coverage per locale, max 2 `<Stamp` per page) and `verify:budgets` (max 1 stamp per viewport, brand pixel share 5% or less per viewport, at most one primary Button per viewport).
6. **CLS and layout**: page heights and key rects equal before/after fonts load AND after the non-EN dictionary loads; ProductBand and HeroComposer heights reserved; layout-shift observer 0 with fonts throttled; Lighthouse CLS under 0.02 on `/`; no horizontal scroll (`scrollWidth <= innerWidth`) on any route.
7. **Accessibility**: keyboard-only walkthrough of `/`, `/about`, `/waitlist`, `/catalog` (modal and drawer) with a visible ring on every stop; hit areas 44px by bounding box; `@axe-core/playwright` zero serious/critical; forced-colors, `prefers-contrast: more` and reduced-transparency emulation screenshots; Lighthouse accessibility 95+ on `/`, `/about`, `/catalog` (tools installed by WP1).
8. **Reduced motion**: everything static and visible; no Lenis, no cursor, no stamp-in; assert `[data-rise]`, `[data-lines]`, `[data-fill]`, `[data-cut]` at opacity 1; statement colour never below `--fg-soft` at any scroll; only transform/opacity/clip-path animate (grep).
9. **Fonts**: masthead and apply word fit in en/pt/de/es/fr/nl at 1440/768/390 with glyph bboxes inside wrappers; swap test passes; Mornsey requested only where Stamp renders.
10. **Production guard**: after `npm run build && npm run start`, `/dev/specimen` and `/dev/styleguide` return 404 unless `SPECIMEN=1`; `.next` has no `/dev/*` route and no GC Grind file unless `design-tokens/LICENCES.md` records the licence (`scripts/verify/prod-guard.mjs`).
11. **Numbers and facts**: every number comes from `lib/catalog-stats.ts` or a `lib/site.ts` constant (or a labelled EXAMPLE derived from them); no run number, city, SKU or product name is typed in an i18n string; build once with all `SITE_FACTS` null and `MCP_TARGET` null and confirm nothing renders for unset facts; no placeholder text (`XX`, `TODO`, `lorem`).
12. **Platform**: no undefined CSS variables on `/chat` and admin; focused-control outline and live dot resolve to `#ff5a2c` (not grey); `git diff` shows no change to `useConversation`, `useVoice`, `useUpload`, `useSuggestions`, `lib/agent/*`, `lib/tools/*` in the UI WPs; mobile keyboard overlap check at 390x844. Capture follows decision 28: unauthenticated routes, an existing dev fixture/`AGENT_MOCK=1`, or an owner-supplied `storageState`; agents never enter credentials or create accounts; if none works the owner captures and attaches.
13. **Copy**: tsc enforces six locales; `rg -i 'premium|eco-friendly|Issue 01' website-v3/lib` empty after WP12; every `REVIEW-NATIVE` flag listed for the owner.
14. **Performance**: Chrome trace of the home scroll (4-6x CPU throttle) before and after WP16; LCP no worse than baseline +10%; home first-load JS no more than baseline +10%.
15. **Tags and rollback**: every WP diffs against tag `pre-pressroom`; a conflict at merge means an ownership breach and the offending WP is redone.

---

## 12. Risks and deferred items

### Risks

- **Out-of-root CSS import and deploy.** Turbopack/Tailwind v4 may refuse `../../design-tokens/index.css`, and a per-app Vercel Root Directory may not include files outside it. Mitigation: `turbopack.root`/`outputFileTracingRoot`, then a COMMITTED sync copy with a drift check; owner confirms the deploy setting (decision 27). Tested first in WP2b in dev and build, both apps.
- **Cascade changes in the CSS split.** Layering legacy rules can reorder specificity against Tailwind utilities (the focus bug was an unlayered-vs-layer issue). The layer-order statement must precede `@import "tailwindcss"` or `legacy` lands above `utilities`. Mitigation: A1 (split) and A2 (layering) are separate commits, each pixel-gated at 0.1%, compiled layer order printed; fallback is the `!important` global ring plus the `outline:none` check.
- **Late face pick.** G1 blocks WP4 only; WP5/6x run meanwhile. If the owner is silent, provisional Anton + JetBrains Mono lock (decision 24); the real pick is a one-token swap plus a re-shoot.
- **Licences.** GC Grind has no licence file and lacks Latin Extended-A; production guard blocks it until recorded. Mornsey lacks `¿ ¡` and Latin Extended-A; the glyph verifier fails the build on a missing glyph and strings fall back to EN.
- **Ink-on-ink middle at G2.** Flipping to ink leaves the unrecomposed home middle looking half-finished until WP13; header/footer are re-scoped interim in `tokens-legacy.css`. G2 explicitly judges only the listed surfaces.
- **Accent reads as hazard/dev-tool UI.** Mitigated by the 3-5% budget, one primary per viewport, the pixel-sampling script and fill-only on paper (focus on paper is ink).
- **Name collisions with shadcn** (`--accent`, `--muted`, `--border`, `--ring`). Removed structurally: the brand colour is `--brand*`, shared files never read shadcn names, and the platform map is one-way (3.6). WP11 still greps `bg-accent` call sites so hover surfaces do not turn orange.
- **Hero scene retirement.** Removing the clip-path cover scene changes ScrollScenes assumptions. WP7 null-guards the block; WP13 reconciles the hook contract first; WP16 profiles before touching timings; the photo survives as a Halftone plate.
- **Platform work is uncommitted today.** WP0 first; WP11 and WP18-20 abort if `git status` shows modified chat/agent/tools files; hooks and agent code are never edited. If WP0 is waived, G2 runs without the platform.
- **Platform capture needs a session.** Agents cannot log in; decision 28 routes (mock/fixture/owner `storageState`) or owner-captured screenshots.
- **Parallel build collisions.** Worktree + separate `.next` + port per WP; if the owner declines worktrees, builds run serially within a wave and wave timings stretch.
- **Ink glass cost.** `backdrop-filter` has perf and Safari fallback cost; limited to composer and popovers with a solid fallback.
- **ProductBand is a staged static flow.** If the real flow differs it misleads; the "Real flow, shown static" caption, the EXAMPLE tag, data-derived SKU/product and the rule to mirror real chat components keep it honest; owner confirms content at G2.
- **Sparse proof.** Without owner-supplied artist names, price-from, MOQ, lead times, city, runs and team, cards and About render sparser; intentional (no placeholders).
- **SVG grain paint cost** on large ink bands. Band-scoped small tile, checked in the WP16 trace; swap to a 20KB PNG tile if slow.
- **Custom cursor over top-layer dialogs.** Native `<dialog>.showModal()` renders above any z-index; the Cursor yields to the native cursor while a dialog is open (WP6c/WP16).
- **Six-locale copy quality.** Agent translations in a blunt voice can misfire; `REVIEW-NATIVE` flags and a per-locale list go to the owner before launch.
- **Plan-claim drift.** DOM hooks, package presence and platform auth were asserted in drafts without evidence; WP1 `preflight.mjs` verifies them and WP13 re-runs it before the hook contract is frozen.

### Deferred

- Fabric weave WebP from `Assets/FABRIC TEXTURE` (needs licence/provenance; only a derived ~80KB WebP would ever ship).
- Real AM halftone pre-processing of hero plates (CSS dot screen stays; moiré claim untested).
- liquidGL WebGL glass (optional flagged add-on for voice or the proof-approved moment).
- Real client roster, About proof (team, stats), artist credits beyond data-driven lines (owner content; hidden until set in `lib/site.ts`).
- AI-looking gallery photos: replace or regrade is an owner content decision; WP15 applies only a consistent CSS grade.
- Platform routes that do not exist (Projects, Designs, Orders, Shop, Agent): follow-up tickets, no stubs.
- Latin Extended-A languages (pl, tr, cs): not on the roadmap; revisit with a face that covers them.
- Dev badge overlapping the footer legal row: dev-only; WP9 adds padding but treats it as non-production.
- Paid faces (ABC Monument Grotesk, Neue Machina, Berkeley Mono): need web licences, outside the candidate list.
- Territories B (Label Catalogue), C (Drop Culture), D (Tour Poster Machine): not chosen; Set List keeps the tour-bill nod.
- Workspace package for tokens (npm workspaces): only if a third consumer appears.
- Public `/styleguide`: dev-only (optional in WP21, 404 in production).
- Lighthouse CI pipeline: one-off measurement only.
