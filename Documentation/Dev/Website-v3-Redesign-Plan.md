# Website v3 Redesign — Build Plan

> Status: **built** (WP1–WP5) · 27 Sep 2026 · uncommitted on `feat/mainpage-redesign`
> Source of truth for the look: canvas "Blackout Merchandise v3 Home Mocks", artboards **A — Scenes (desktop)** and **A — Scenes (mobile)**.
> Scope: `website-v3/` (public site) and a font/palette alignment in `platform/`.

## 1. Decisions (locked)

| Topic | Decision |
|---|---|
| Positioning | Agent-first, one assistant, no persona. "Velvet rope" = by-application strategy, **not** a colour. |
| Location | Barcelona, ES (replace every "Barcelos, PT"). |
| Palette | Soft charcoal, black-dominant, no accent colour, no gradients. |
| Type | **Barlow everywhere** (site and platform) — 600 headlines, 400/500 body. IBM Plex Mono for labels, facts, code. No serif, no Oswald, no Helvetica stack. Sentence-case headlines. |
| Catalog | Dark. The light/charcoal mode switching is removed. |
| Hero | Split: copy + prompt left, photo right (slow push-in, off under reduced motion). No video, no animation background. |
| Hero prompt | Honest: "Start" opens a brief card (the brief + what happens next) and hands the brief to the application. No fake mockups or prices. |
| MCP | Shown as **Soon**. Endpoint text `https://mcp.blackoutmerch.example` is a placeholder. |
| Missing facts | Never render placeholders like `[€X]` on the live site: facts come from `lib/site.ts` constants and are hidden when unset. |

## 2. Design tokens

Defined once in `website-v3/app/globals.css` (`:root` + `@theme inline`), mirrored in `platform/app/globals.css`.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#141414` | page ground |
| `--raised` | `#1b1b1b` | alternate sections (assistant/catalog/agents bands, cards) |
| `--surface` | `#242424` | image frames, inputs on raised, product tiles |
| `--well` | `#101010` | code blocks |
| `--signal` | `#ede4dd` | primary text, primary button fill |
| `--muted` | `#b3aba4` | secondary text, labels |
| `--soft` | `#cfc6bf` | body copy on dark |
| `--hairline` | `rgba(237,228,221,.12)` | rules, borders |
| `--gutter` | `64px` desktop / `20px` mobile | page side padding |

Buttons: primary = `--signal` fill, `--paper` text, radius 4px, height 44–52px. Secondary = transparent, 1px `rgba(237,228,221,.24)` border.
Type scale: H1 80/1.0 (mobile 40), H2 56/1.05 (mobile 36), H3 32, body 17–20/1.5, labels mono 12px uppercase tracking .08em.

## 3. Information architecture

Header (all routes): mark + `BLACKOUT MERCHANDISE®` left; right: How it works · Shop & Run · Catalog · Agents | Sign in · **Apply**. Mobile: mark, Apply, menu button → full-screen menu. Current page = `aria-current` + full-opacity/underline (**no blur**).
`Sign in` links to `NEXT_PUBLIC_PLATFORM_URL` and is hidden when that env var is unset.

Home (`/`) sections, in order: Hero → Printed for → 01 One assistant → 02 Shop & Run → Catalog teaser → Studio → 03 Bring your own agent → Apply → Footer.
Other routes keep their URLs: `/catalog`, `/gallery`, `/about`, `/contact`, `/waitlist`, 404. The old roster wall (`ListView`) and the intro animation leave the home page.
Footer: wordmark + tagline, links (Catalog, Shop & Run, Agents, Gallery, About, Contact), language switcher, `© {year} Blackout Merchandise`.

## 4. Work packages

Run order: **WP1 → (WP2 ∥ WP3 ∥ WP4) → WP5**. WP1 owns every shared file so the parallel packages never touch the same file.

### WP1 — Foundations (sequential, first)
Files: `website-v3/app/layout.tsx`, `app/globals.css`, `components/SiteHeader.tsx` (new), `components/SiteFooter.tsx` (new), `lib/site.ts`, `lib/i18n/types.ts`, `lib/i18n/{en,pt,es,fr,nl,de}.ts`, page files only to swap chrome.
1. Load Barlow (400/500/600) and IBM Plex Mono (400/500) with `next/font/google`; drop Oswald and the Helvetica stack. Expose `--font-sans` / `--font-mono`; set `--font-display` to Barlow so any leftover reference stays harmonious.
2. Replace tokens per §2. Delete the `[data-mode='light']` and `[data-mode='charcoal']` blocks.
3. Build `SiteHeader` / `SiteFooter` per §3 and mount them for every route (layout or each page — whichever keeps the home hero's header overlay working). Remove `Corners`/`PageCorners` usages; delete those files once unused.
4. `lib/site.ts`: add `SITE_FACTS = { fromPrice: null as string | null, lead: null as string | null }` and `PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? null`. Update `SITE_DESCRIPTION` to mention Barcelona.
5. i18n: add **all** keys in §5 to `types.ts` and every dictionary (real translations for pt/es/fr/nl/de). Replace "Barcelos" with "Barcelona" and "PT" with "ES" in every dictionary.
6. `npm run lint && npm run build` pass.

### WP2 — Home page
Files: `app/page.tsx`, `components/home/*` (new). Must not edit WP1/WP3 files; read-only use of `lib/*`.
- `Hero`: split layout (text column 50%, photo 50% full-height, header overlays it). Prompt input + Start (Enter submits), example chips fill the input, facts line in mono (`{n} blanks` from `PRODUCTS.length`, "Printed in Barcelona", price only if `SITE_FACTS.fromPrice`). On Start, a brief card overlays the photo side: the brief text, three next steps, "Apply with this brief" → `/waitlist?brief=<encoded, max 500 chars>`, and "Edit brief". Mobile: photo on top (~340px), copy below; the brief card replaces the copy block. Temporary photo: an existing `/public/gallery/*.png`, slow push-in, disabled under `prefers-reduced-motion`.
- `PrintedFor`: one row of client names from `lib/clients.ts` (mobile: 3-column grid).
- `Assistant`: two-column; left label/title/body, right the five-step timeline (You → Two mockups ready → Quote → Proof approved → Shipped) with mono timestamps; the two mockup tiles use gallery images.
- `Paths`: Shop and Run cards (image, title, mono meta, body). Link targets: `/waitlist` for now.
- `CatalogTeaser`: `{n} blanks.` + four real products from `lib/products` (reuse the catalog card image paths), link to `/catalog`.
- `Studio`: full-bleed photo band with the Barcelona line.
- `Agents`: "Soon" badge, copy, code block (`claude mcp add blackoutmerch https://mcp.blackoutmerch.example` + connector URL), "Claude · ChatGPT · Cursor", link to `/llms.txt`.
- `ApplySection`: role select + email + Apply, calling the existing `submitWaitlist` action; success/error states reuse `waitlist.*` strings.
Match the mock's spacing: sections 120px vertical padding desktop / 96px mobile, 12-column grid with 24px gaps, 64px gutters.

### WP3 — Existing pages and fixes
Files: `components/GridView.tsx`, `ProductModal.tsx`, `ViewShell.tsx`, `GalleryView.tsx`, `ListView.tsx`, `Intro.tsx`, `Cursor.tsx`, `app/catalog`, `app/gallery`, `app/about/*`, `app/contact/*`, `app/waitlist/*`, `app/not-found.tsx`, `app/NotFoundCopy.tsx`, `lib/clients.ts`, `app/llms.txt/route.ts` (new), `app/sitemap.ts`.
1. Catalog permanently dark: remove every `dataset.mode` write in `ViewShell`, `GridView` and `ProductModal`. Product tiles sit on `--surface` so black garments stay visible; check a black tee and a white tee in screenshots.
2. Restyle about, contact, waitlist and 404 to the tokens and Barlow scale (sentence-case H1 instead of Oswald caps).
3. Waitlist: read `brief` from the URL and show "Brief attached"; send it to `submitWaitlist`; the action trims it to 500 chars, adds `ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS brief text` (same pattern as `role`/`favourites`) and includes it in the JSONL fallback. Add role "Festival or promoter" to both option lists; relabel "Tattoo artist" as "Tattoo artist or studio" (keep the canonical value). Add page metadata (`title: 'Waitlist'`).
4. `lib/clients.ts`: remove "Metallica" and "Feel Like Shit" (still placeholder, fictional names only).
5. Delete `ListView`, `Intro` and `Cursor` if nothing uses them any more.
6. `/llms.txt`: plain-text route describing Blackout Merchandise, key pages and "MCP server: coming soon".
7. `npm run lint && npm run build` pass.

### WP4 — Platform alignment
Files: `platform/app/layout.tsx`, `platform/lib/fonts.ts`, `platform/app/globals.css` **only**. Do not touch files with uncommitted changes (`components/chat/*`, `lib/agent/*`, `lib/tools/*`, `lib/ui-cards/*`, `package*.json`).
1. Replace Oswald + Geist with Barlow (400/500/600) and IBM Plex Mono; keep the exported names or update the one import in layout.
2. `--font-ui`, `--font-sans`, `--font-display`, `--font-heading` → Barlow. `--paper` → `#141414`; Clerk appearance `colorBackground` → `#141414`, `colorInput` → `#242424`.
3. `npm run lint && npm run build` in `platform/` (report pre-existing failures separately from new ones).

### WP5 — Verification (orchestrator)
- Both builds green.
- Playwright screenshots at 1440×900 and 390×844 for `/`, `/catalog` (plus open one product), `/gallery`, `/about`, `/contact`, `/waitlist?brief=test`, the 404, and the hero brief state; compare against the mock.
- Keyboard pass: header, chips, prompt, brief card, apply form all reachable, visible focus rings.
- `graphify update .` after code changes.

## 5. New and changed i18n keys (English source)

```
nav.howItWorks        How it works
nav.shopRun           Shop & Run
nav.agents            Agents
nav.signIn            Sign in
nav.apply             Apply
nav.menu              Menu
nav.close             Close
corners.tagline       Merch for artists — Barcelona, ES      (changed)
footer.rights         © {year} Blackout Merchandise

home.hero.title       Merch, made properly.
home.hero.subline     Describe the piece. Approve the proof. We print, pack and ship it from Barcelona — you keep the margin.
home.hero.promptLabel Describe your piece
home.hero.placeholder Black tee, back print, 50 for the tour — need them by May
home.hero.start       Start
home.hero.chip.tour   Tour tee, 100 pcs
home.hero.chip.festival Festival crew shirts
home.hero.chip.tattoo Tattoo flash on a tee
home.hero.chip.store  Open a band store
home.hero.fact.blanks {n} blanks
home.hero.fact.printed Printed in Barcelona
home.hero.fact.from   From {price} / piece
home.brief.label      Your brief
home.brief.next       What happens next
home.brief.step1      Mockups on real blanks
home.brief.step2      A proof and a quote to approve
home.brief.step3      Printed in Barcelona, shipped to you or the venue
home.brief.apply      Apply with this brief
home.brief.edit       Edit brief
home.brief.close      Close

home.printedFor       Printed for

home.assistant.label  01 — One assistant
home.assistant.title  You talk. It handles the rest.
home.assistant.body   Mockups, quotes, proofs, production and shipping run through one conversation. When a decision is yours, it asks. Everything else just moves.
home.assistant.you    You
home.assistant.youText “Heavyweight black tee, our logo big on the back, 50 for the tour.”
home.assistant.mockups Two mockups ready
home.assistant.draftA Draft A
home.assistant.draftB Draft B
home.assistant.quote  Quote
home.assistant.quoteText 50 pcs · Screen print, 2 colours
home.assistant.proof  Proof 01 approved
home.assistant.approved Approved
home.assistant.shipped Shipped
home.assistant.shippedText 50 pieces, folded and tagged. Tracking sent to your inbox.

home.paths.label      02 — Two ways to sell
home.paths.title      Sell as you go, or order a run.
home.paths.shop.title Shop
home.paths.shop.meta  No stock · No upfront cost
home.paths.shop.body  Your store at blackoutmerch.example/you or your own domain. Each order is printed as it sells, and your share lands with the sale.
home.paths.shop.link  How Shop works
home.paths.run.title  Run
home.paths.run.meta   Bulk runs
home.paths.run.body   A bulk run for tours, festivals and studios — screen printed or embroidered, folded, tagged and shipped to you or straight to the venue.
home.paths.run.link   How Run works

home.catalog.title    {n} blanks.
home.catalog.body     Organic cotton, fair-trade and vegan. Every blank listed is one we print on ourselves.
home.catalog.link     Browse the catalog

home.studio.title     Printed, folded and tagged in Barcelona.
home.studio.meta      Studio — Barcelona, ES

home.agents.label     03 — Bring your own agent
home.agents.soon      Soon
home.agents.title     Already work with Claude or ChatGPT? Plug it in.
home.agents.body      Everything the assistant does — mockups, quotes, orders, your store — opens up as an MCP server. Your agent, our press.
home.agents.connector # Claude, ChatGPT — add a custom connector
home.agents.clients   Claude · ChatGPT · Cursor

home.apply.label      By application
home.apply.title      A limited number of artists each month.

waitlist.briefAttached Brief attached: “{brief}”
waitlist.role.festival Festival or promoter
waitlist.role.tattoo  Tattoo artist or studio                (changed label)
```
Use `nav.*` / `waitlist.*` keys that already exist wherever they fit (email placeholder, privacy line, success/error).

## 6. Out of scope (content session / later)
Real photography, real client names, prices/MOQ/lead time values, About story rewrite (the 2017 origin text), the platform `waitlist_signups` schema gaining `brief` in Drizzle + admin queue display, the live MCP server, and removal of stale Cat-Suite references in CLAUDE.md, AGENTS.md and the brand guidelines.

## 7. Risks
- Black garments on the dark catalog: mitigated by `--surface` tiles; verify in screenshots.
- `brief` column added at runtime by `ALTER TABLE` is not in the platform's Drizzle schema yet; a future `drizzle-kit push` could drop it — add it to the schema in the follow-up.
- Platform has uncommitted Wave-4 work: WP4 is restricted to three clean files.

## 8. Build log (27 Sep 2026)
- WP1–WP4 executed by Sonnet subagents; WP5 verification by the orchestrator.
- Fixes found in verification:
  - Catalog leads with a light colourway (`displayColourFor` in `lib/variants.ts`, used by the grid, the modal's initial colour and the related strip) because black packshots vanished on dark tiles. 94 of 122 blanks have a light variant.
  - `.view-fade-in` lost its fill-mode: it trapped the product modal under the fixed header.
  - Modal detail column uses `justify-content: safe center` so the title and Save no longer clip.
  - Mobile hero prompt and apply email inputs collapsed (`flex-1` in a column) — now `flex-none md:flex-1`.
  - MCP code block scrolls horizontally instead of breaking mid-token.
  - Waitlist shows the brief as body text under a "Your brief" label (dropped `waitlist.briefAttached`).
  - `ListView` and `Intro` deleted; `Cursor` kept (still used by `app/template.tsx`).
- Builds: website-v3 and platform pass. Lint: remaining errors are pre-existing (`react-hooks/set-state-in-effect` etc.), none new.

---

# Round 2 — Copy and catalog (28 Sep 2026)

Approved mock: canvas row "Round 2 — copy & catalog" (artboards `HomeCopyV2`, `CatalogV2`).
Local copies: `…/scratchpad/mocks/project/HomeCopyV2.dc.html`, `CatalogV2.dc.html`.

## R2 rules
- Every claim is verifiable from `lib/product-details` / `lib/variants`. **Compute stats from data**, never hardcode: heaviest blank gsm, heaviest tee gsm, lightest tee gsm, GOTS count (`certifications` includes `'GOTS'`), OEKO-TEX count, heavyweight count (`weightGsm >= 220`), print-method count (distinct techniques in `lib/product-details`).
- Remove "vegan" and blanket "fair-trade" claims (only 12/122 are PETA-approved vegan). Allowed: "GOTS-certified", "OEKO-TEX tested", "organic cotton across most of the range", Fair Wear only as "made in Fair Wear member factories" if stated per product.
- "Zero upfront" applies to the Shop path only (print on sale, no stock, no minimums, artist sets retail price, margin above base cost paid out per sale).

## R2 work packages
Order: **R2-1 → (R2-2 ∥ R2-3) → orchestrator verify**.

### R2-1 — i18n (all six dictionaries + types.ts)
Add/change these keys (EN source; translate naturally into pt/es/fr/nl/de; keep `{placeholders}`):
```
home.hero.subline        (changed) Heavyweight organic blanks, printed in our Barcelona studio. Launch a collection with zero upfront cost — you set the price, you keep the difference.
home.hero.placeholder    (changed) Black 280 gsm tee, back print, 50 for the tour — need them by May
home.hero.fact.zero      Zero upfront
home.hero.fact.weight    Up to {gsm} gsm
home.cloth.label         01 — The cloth
home.cloth.title         Heavy cloth. Honest labels.
home.cloth.body          We only print on blanks we’d wear to a show ourselves: dense organic cotton, certified end to end, built to survive a tour and every wash after it.
home.cloth.stat.heaviest Our heaviest blank
home.cloth.stat.heaviestTee Our heaviest tee
home.cloth.stat.gots     GOTS-certified organic blanks
home.cloth.stat.oeko     OEKO-TEX tested
home.zero.label          02 — Zero upfront
home.zero.title          Launch a collection. Pay nothing upfront.
home.zero.stock.title    No stock.
home.zero.stock.body     We print each piece when it sells. Nothing sits in a warehouse on your dime.
home.zero.min.title      No minimums.
home.zero.min.body       Launch one design or a full collection, and add new pieces whenever you like.
home.zero.margin.title   Your price, your margin.
home.zero.margin.body    You set the retail price. Everything above our base cost is yours, paid out with every sale.
home.zero.cta            Apply to launch
home.zero.bulk           Need a bulk run instead?
home.assistant.label     (changed) 03 — One assistant
home.paths.label         (changed) 04 — Two ways to sell
home.agents.label        (changed) 05 — Bring your own agent
home.catalog.body        (changed) OEKO-TEX tested, every one. Organic cotton across most of the range, {gots} blanks GOTS-certified — from {min} gsm tees to {max} gsm heavyweights.
catalog.intro.label      Catalog
catalog.intro.title      The blanks.
catalog.intro.body       {n} garments we print on, and nothing we wouldn’t wear. OEKO-TEX tested, organic cotton across most of the range, weights up to {gsm} gsm.
catalog.stat.gots        GOTS organic
catalog.stat.heavy       Heavyweight 220 gsm+
catalog.stat.methods     Print methods
catalog.tabs.ariaLabel   Type
catalog.toggle.heavy     Heavyweight 220+
catalog.toggle.gots      GOTS organic
catalog.badge.heavy      Heavyweight
catalog.badge.gots       GOTS
catalog.card.colours.one   {n} colour
catalog.card.colours.other {n} colours
catalog.band.label       Zero upfront
catalog.band.title       Found the one? Launch it without paying a cent upfront.
catalog.band.body        Pick a blank, describe the design, set your price. We print each piece when it sells — you keep everything above our base cost.
catalog.band.cta         Apply to launch
catalog.band.bulk        Bulk run instead
```
Also fix `app/llms.txt/route.ts` claim line (no vegan/fair-trade blanket claim; use the verifiable wording).

### R2-2 — Home
Files: `components/home/*`, `app/page.tsx`, new `lib/catalog-stats.ts` (shared computed stats — R2-3 imports it read-only).
- Hero subline/placeholder; facts line: Zero upfront · {n} blanks · Up to {max} gsm · Printed in Barcelona.
- New `Cloth` section after PrintedFor (mock `HomeCopyV2`): label, 2-line title, body right column, 4-stat row with hairline dividers (big Barlow 600 ~84px numbers, `gsm` suffix smaller, `/122` muted), three heavyweight product tiles (light colourway packshots via `displayColourFor`, captions name · type · gsm).
- New `ZeroUpfront` section (raised band): label, title, 3 columns under a hairline, CTA "Apply to launch" → `/waitlist`, link "Need a bulk run instead?" → `/#paths`.
- Section order: Hero → PrintedFor → Cloth → ZeroUpfront → Assistant → Paths → CatalogTeaser → Studio → Agents → ApplySection. Teaser copy uses computed values.

### R2-3 — Catalog page
Files: `components/GridView.tsx` (+ new `components/catalog/*` if it helps), `app/catalog/*`. Read-only: `lib/catalog-stats.ts` (wait for R2-2 to create it; if absent, create it with the agreed exports — see below — and tell the orchestrator).
- Intro band: label, H1 "The blanks.", body, 3 stats on the right (GOTS count, heavyweight count, print methods).
- Type dropdown → tab strip with counts (All + each type from `lib/catalog-filters`), horizontally scrollable on mobile; keep Fit/Colour/search and URL sync (`type` param).
- Toggles: Heavyweight 220+ (`heavy=1`) and GOTS organic (`gots=1`), synced to the URL.
- Cards: HEAVYWEIGHT / GOTS badges top-left of the tile; name + colour count on one line; mono meta "type · gsm · fit".
- Zero-upfront band after the first 8 cards (desktop: 2 rows) linking to `/waitlist`; hidden when fewer than 8 results.
- Keep the modal, favourites, light-colourway default and the entrance animation working.

`lib/catalog-stats.ts` agreed exports: `CATALOG_STATS = { total, gots, oeko, heavy, heaviestGsm, heaviestTeeGsm, lightestTeeGsm, methods }` and `isHeavy(code)`, `isGots(code)`.

---

# Round 3 — Vintage-paper catalog and gallery (28 Sep 2026)

Approved mock: canvas artboard "Round 3 — White catalog (fashion)" (`…/scratchpad/mocks/project/CatalogWhite.dc.html`), with the owner's change: **a vintage white, not a stark white**. Research notes: Entire Studios (packshots float on tinted paper), Our Legacy (giant header + sidebar), Billie Eilish store (dark text tile opens the grid), OUTFIT (oversized editorial tiles), grid/index toggles.

## Vintage theme tokens
Scoped with `[data-theme='vintage']` on the catalog and gallery page wrappers (header and footer keep the dark frame):
| Token | Value |
|---|---|
| `--paper` | `#ECE5DA` (ecru page) |
| `--raised` | `#E3DACB` (hover field, index row hover) |
| `--surface` | `#E3DACB` |
| `--well` | `#1A1714` |
| `--signal` | `#1A1714` (warm black ink) |
| `--muted` | `#6B6258` |
| `--soft` | `#3A342E` |
| `--hairline` | `rgba(26,23,20,.14)` |
Dark accent blocks inside the vintage pages use `#1A1714` with bone `#EDE4DD` text.

## R3 — Catalog + gallery (one agent; owns GridView, ProductModal, GalleryView, ViewShell, app/catalog, app/gallery, app/globals.css, components/catalog/*, lib/i18n/*)
- Theme: add the vintage block to globals.css; the catalog/gallery wrappers set `data-theme="vintage"` and paint their own background so the ecru reaches the viewport edges between the dark header and footer. Transition feels deliberate (the route fade is enough; no flashing).
- Catalog layout per mock: giant header "The blanks" + `(122)`, copy line, stats (from `lib/catalog-stats`); left sticky sidebar (Type list with counts, Cloth checkboxes Heavyweight 220+ / GOTS, Colour swatch grid, Fit list); right: count, search, Grid/Index toggle; 3-column grid, 44px row / 12px column gaps; packshots float on paper (no tile), hover = bone/parchment field + slight scale + dark "Start with this blank →" bar (links to `/waitlist?product=CODE`); card: uppercase name 13px/500, gsm right, mono spec line, 4 swatches + "+N" (only when N>0).
- On vintage pages lead with the **base black** colourway (skip `displayColourFor` in the grid and modal initial colour); keep the helper for dark contexts (home teaser).
- Editorial cells only when no filter/search is active: first cell dark note tile ("Built for the merch table."), a 2-column campaign-photo tile after row 1 ("Heavy cloth. Honest labels.", gallery photo), the dark "Zero upfront" band spanning the grid after row 3 (existing `catalog.band.*` keys), and a second 2-column photo tile further down ("Printed, folded and tagged here.").
- Index view: table rows (thumb, name, type, gsm, certifications, colours), row click opens the modal; state synced to URL (`view=index`). Toggles `heavy=1` / `gots=1` and `type` synced to URL.
- Mobile: sidebar becomes a horizontally scrolling type strip + a "Filters" button opening a sheet; grid 2 columns; editorial tiles span 2.
- Product modal inherits the vintage tokens when opened from the catalog.
- Gallery on vintage paper with the same header treatment (big "Work" title + count), captions in mono.
- New i18n keys (all six dictionaries): note tile kicker/title/foot, the two editorial titles and kickers, `catalog.view.grid`, `catalog.view.index`, index column headers, sidebar section labels not already present, "Start with this blank", "Filters", gallery title.

## R2-2 — Home (unchanged from Round 2; runs in parallel, owns components/home/* and app/page.tsx only)

---

# Round 6 — Premium editorial home + scroll presentation (28 Sep 2026)

Approved mock: canvas artboard "Round 5 — Premium editorial" (`…/scratchpad/mocks/project/Editorial.dc.html`, paper ground), with the owner's changes:
- The masthead **BLACKOUT MERCHANDISE** is fitted exactly to the full content width (edge to edge within the gutter), recomputed on resize/font load. Kept as one word.
- No ® after the masthead, and no crosshair mark in the home header: the masthead is the logo on `/`.
- Scroll effects that "lock the content in the centre" to create a presentation feel — pinned scenes on native scroll, never scroll-hijacking.

## Design rules
- Home switches to the vintage paper ground (`data-theme="vintage"` on the home wrapper and on SiteHeader when `pathname === '/'`), matching catalog/gallery. Footer stays dark.
- Type: Barlow Condensed for masthead, outlined words, set list; Barlow 300 for statements; IBM Plex Mono labels. No new fonts.
- Restraint: no tickers, stickers, tickets, stamps, barcodes, rotations.
- Every number still comes from `lib/catalog-stats.ts`.

## Home structure (top → bottom)
1. **Issue line + nav** (home variant of SiteHeader): mono "Issue 01 — Autumn/Winter 2026 — Barcelona" left, small-caps nav right (Cloth · Shop & Run · Blanks · Agents · Apply). No crosshair.
2. **Masthead + cover**: fitted BLACKOUT MERCHANDISE, hairline facts row (Merch for bands, tattoo artists & festivals · Heavyweight organic · Printed in Barcelona · Zero upfront · By application), halftone B&W cover photo (fine dot screen via CSS), caption + "Heavy cloth, honest labels." + the brief input (existing brief-card behaviour → `/waitlist?brief=`).
3. **Statement**: one centred light paragraph.
4. **CLOTH**: giant outlined word, four light stats, three black packshots with MF codes.
5. **Plates**: two halftone photos offset as a spread with captions.
6. **ZERO** (zero upfront): giant outlined "Zero" + three terse lines (No stock / No minimums / Your price, your margin) + "Apply to launch".
7. **Set list**: 01 The brief → 05 Encore.
8. **Shop & Run**: two plates with captions and links.
9. **Blanks** (catalog teaser): four packshots on paper, link to `/catalog`.
10. **Agents**: small mono block (MCP soon, connector snippet, llms.txt).
11. **APPLY**: giant outlined word + one line + email field (existing `submitWaitlist`).
Printed-for names move into a single quiet mono line under the plates (or are dropped until real clients exist — keep the component but render only if `CLIENTS` has real entries flag).

## Scroll presentation (GSAP ScrollTrigger + existing Lenis)
Add `gsap` (ScrollTrigger is free). Sync with Lenis: `lenis.on('scroll', ScrollTrigger.update)` and drive Lenis from `gsap.ticker` (one RAF loop). Expose the Lenis instance (context or module singleton) from `components/SmoothScroll.tsx`.
Scenes (each pinned ≈ 60–120% of viewport height, scrub-linked, eased, never blocking native scroll):
- **Cover**: pinned; cover image grows from inset (≈ 86% width) to full-bleed while the masthead drifts up/fades slightly; caption fades in at the end.
- **Statement**: pinned centred; words reveal from 15% to 100% opacity as you scroll.
- **CLOTH**: pinned; the outlined word fills with ink left→right (clip/mask on a filled copy), stats count up once, packshots rise in with stagger.
- **Plates**: light parallax between the two photos (no pin).
- **Zero**: outlined word fills like CLOTH; three lines stagger in.
- **Set list**: pinned; one line active at a time (full ink, others 30%), mono counter "01 / 05".
- **Apply**: outlined word fills on enter.
Rules: `prefers-reduced-motion` → no pins, no scrub, everything static and visible. Mobile (<768px): no pinning, simple fade/rise on enter only. All content present in the DOM and readable without JS. Refresh ScrollTrigger after fonts/images load; kill all triggers on unmount/route change. No layout shift, no horizontal overflow. 60fps: transforms/opacity/clip-path only.

## Work packages
- **R6-A (Sonnet) — Home editorial layout**: files `app/page.tsx`, `components/home/*` (rewrite/replace), `components/SiteHeader.tsx` (home variant), `lib/i18n/*` (new keys, all six locales), `app/globals.css` (home rules only). Static, fully styled page with stable hooks for motion: `data-scene="cover|statement|cloth|plates|zero|setlist|apply"` and named child hooks (`data-fill`, `data-count`, `data-rise`, `data-step`). Remove unused old home components.
- **R6-B (Sonnet) — Scroll presentation**, after R6-A: add `gsap`, wire Lenis ↔ ScrollTrigger in `components/SmoothScroll.tsx`, new `components/home/ScrollScenes.tsx` (client) that targets the hooks; reduced-motion and mobile rules above. Files: `package.json`/lock, `components/SmoothScroll.tsx`, `components/home/ScrollScenes.tsx`, minimal hook-only edits in `components/home/*`.
- **Orchestrator**: verify desktop/mobile/reduced-motion in the browser, build, commit on request.

---

# Round 7 — One editorial system across the site (29 Sep 2026)

Approved mock: canvas artboard "Round 6 — Waitlist + signature footer" (`…/scratchpad/mocks/project/WaitlistEditorial.dc.html`; screenshots `.playwright-mcp/preview/wl-a.png`, `wl-b.png`). Goal from the final review: the premium editorial language (paper, condensed caps display, outlined words, halftone plates, hairlines, mono index labels) must run through every page, with one button system and one brand mark.

## Rules
- Brand mark: no crosshair, no ® anywhere in the UI (keep ® only in metadata/title). Home header = issue line (existing). Inner pages header = small condensed **BLACKOUT MERCHANDISE** wordmark left, same small-caps nav + ink Apply right.
- Paper (`data-theme="vintage"`) on every page now: home, catalog, gallery, waitlist, about, contact, 404. Footer is the only dark band.
- Buttons: one primary = ink block (`--signal` on paper), Barlow Condensed caps 600, letter-spacing .04em, height 52–64px, square corners; one text link = small-caps 12px, .16em tracking, hairline underline. No other button styles.
- Photography: halftone B&W in editorial moments (home plates/shop & run, page plates); colour only inside the gallery (with captions).
- Every number from `lib/catalog-stats.ts`; no placeholders like [N] rendered — hide a fact if its value is unknown.

## R7-A — Chrome, primitives, bug fixes (first; owns shared files)
- `components/editorial/FittedWord.tsx`: extract the masthead fit logic from `components/home/Cover.tsx` (measure-and-scale, ResizeObserver, fonts.ready) into a reusable component; Cover uses it.
- `components/editorial/Halftone.tsx`: next/image wrapper with the grayscale+contrast filter and dot overlay (move the CSS into globals as `.halftone`).
- `app/globals.css`: `.btn-ink`, `.link-ink` classes (+ focus rings); vintage theme defaults to paper for all pages.
- `components/SiteHeader.tsx`: inner-page variant (wordmark, no RegisterMark), vintage theme on all routes; mobile menu unchanged in behaviour.
- `components/SiteFooter.tsx`: signature footer per mock — mono column labels (Index / Studio / Elsewhere / Language), one-line tagline, full-width fitted **BLACKOUT MERCHANDISE** in bone on #141414 (FittedWord), bottom mono row (© 2026 Blackout Merchandise — Barcelona, ES · Issue 01 · Autumn/Winter 2026 · Privacy · Terms · llms.txt — only link routes that exist).
- Fonts: load Barlow (300/400/500/600) + Barlow Condensed (500/600/700) + IBM Plex Mono once in `app/layout.tsx`; remove the page-level loaders in `app/page.tsx`.
- Bug: catalog zero-upfront band must span the full row (`col-span-full`) in `components/GridView.tsx`.
- i18n: add footer keys (all six locales).

## R7-B — Waitlist, About, Contact, 404 (after R7-A, parallel with R7-C; owns lib/i18n)
- Waitlist per mock: index line, OutlinedWord "Apply" (fills on load; static under reduced motion), statement line, numbered form rows (01 role as condensed-caps radio choices, 02 brief/saved blanks — shown only when present, 03 email), ink Apply button, privacy line; right column Halftone plate + caption + "What happens next" (3 rows; no "[N] days" — omit the number until set). Keep submitWaitlist, URL params (product, colour, favourites, brief), validation, success/error states (restyle success as a big condensed "Received." moment).
- About, Contact, 404: same system — index line, OutlinedWord (About / Contact / 404), light statement, numbered rows for facts (About: Est. / Studio / Press; Contact: email, studio, elsewhere), Halftone plate. Keep existing copy keys where possible; rewrite About headline pair into one editorial statement.
- i18n: all new keys in six locales; remove unused.

## R7-C — Home lower half + gallery (after R7-A, parallel with R7-B; must NOT edit lib/i18n — reuse existing keys, report any new copy needed)
- `components/home/Paths.tsx`, `CatalogTeaser.tsx`, `Agents.tsx`: editorial vocabulary — condensed caps headings matching Set list scale, mono index labels, Halftone plates for Shop/Run, packshots on paper for blanks, Agents as a quiet mono spec block (no dark terminal box), ink buttons / text links only.
- Gallery (`components/GalleryView.tsx`): colour photos with mono captions under each (client · piece), subtle hover zoom; header stays.
- Keep all `data-*` motion hooks intact; ScrollScenes must keep working.

---

# Round 8 — Voice, finishing, motion pack (29 Sep 2026)

From the final UI/UX + copy audit. Checkpoint before this round: `2bfbc2e`.

## Copy map (EN source; translate to pt/es/fr/nl/de)
| Where | New copy |
|---|---|
| Signature line — hero facts row (first item), meta description, OG image, footer tagline | **Printed for the ones who play loud.** |
| Hero first-screen action (facts row, right) | "Start your brief ↓" (scrolls to the brief input and focuses it) |
| CLOTH section line (under the outlined word, above stats) | **Heavy cloth. Honest labels.** |
| Cover tagline (under photo) | "Screen printed in Barcelona." (the old tagline moves to CLOTH) |
| ZERO band headline (under outlined ZERO) | **Doors: free. Merch: yours.** |
| ZERO margin column title | **You made the art. You keep the margin.** |
| Agents title | **Your agent, our press.** — body keeps the four clients (Claude · ChatGPT · Gemini · Grok) |
| About statement | **The press is the same. You no longer have to be in the room.** |
| Contact statement | **Talk to the press.** + "Projects, bulk runs, anything print — write to us, or apply for a slot." |
| Waitlist / home Apply index line | **If you know, you know.** |
Claims still to verify with the owner (do not invent): origin story (2017 / city), "our own Barcelona press", "Anatol Volt-M".

## R8-A — Copy, a11y, home Apply, perf (owns lib/i18n/*, components/home/* except motion-only edits later, app/about|contact|waitlist copy, lib/site.ts, app/layout.tsx metadata)
- Apply the copy map; remove keys that become unused.
- OutlinedWord: the solid `[data-fill]` copy gets `aria-hidden="true"` (headings were read twice).
- Home ApplySection: reuse the Waitlist role radiogroup + `.btn-ink` (extract a shared `RolePicker` into components/editorial/).
- Perf: compute `CATALOG_STATS` in a server component and pass values as props (no product dataset in the home client bundle); load non-English dictionaries lazily (dynamic import on language switch) keeping SSR/first paint English.
- Mono labels min 12px on mobile.

## R8-B — Mobile menu + share image + icons (owns components/SiteHeader.tsx, app/opengraph-image.*, app/icon.* / favicon)
- Mobile menu: full-screen ink band, big numbered condensed caps index (01 Cloth, 02 Shop & Run, 03 Blanks → /catalog, 04 Gallery, 05 Agents, 06 About, 07 Contact) + language switcher + `.btn-ink` Apply; focus trap/Escape kept.
- OG image (1200×630): black ground, fitted bone BLACKOUT MERCHANDISE, a halftone crop of the cover photo, signature line in mono. Prefer `app/opengraph-image.tsx` with `next/og` and local Barlow Condensed font files; otherwise a generated PNG.
- Favicon/app icon: bone condensed "B" on #141414, square; replace favicon.ico + add icon.png/apple-icon.
- If new i18n keys are needed, report them (R8-A owns i18n).

## R8-C — Motion pack (after R8-A; owns components/home/ScrollScenes.tsx, app/template.tsx, components/motion/*, motion-only edits elsewhere, app/globals.css motion rules)
1. First-load choreography (once per session, ~1.4s): masthead letters rise from a baseline mask (stagger ~35ms), hairline draws, facts fade, cover opens from a slit to its frame. Must not break FittedWord measurement or the full-bleed scroll reveal.
2. Halftone → full tone on hover (desktop) for Halftone images: dot screen and grayscale dissolve to the continuous-tone photo (~600ms).
3. Line-mask heading reveals on enter for section h2s (lines slide up from a mask), replacing the generic fade-rise for headings.
4. Image wipe reveals (clip-path from bottom + slight scale) for plates and Shop & Run photos on enter.
5. Page transitions: a panel in the destination ground colour sweeps up and away (~450ms) between routes; no flash; respects reduced motion.
6. Squeegee hover: `.btn-ink` fill pulls left→right; `.link-ink` underline draws from the left.
7. Set list: halftone image per step crossfading inside the pinned scene.
8. Footer echo: BLACKOUT MERCHANDISE letters rise as the footer enters.
9. Rotating brief placeholder: real example briefs type in, stop on focus.
Rules: transforms/opacity/clip-path only; everything static and visible under reduced motion; mobile keeps it light; no CLS; kill triggers on unmount.
