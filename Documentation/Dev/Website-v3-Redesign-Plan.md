# Website v3 Redesign — Build Plan

> Status: **built** (WP1–WP5) · 27 Sep 2026 · uncommitted on `feat/mainpage-redesign`
> Source of truth for the look: canvas "Merch From v3 Home Mocks", artboards **A — Scenes (desktop)** and **A — Scenes (mobile)**.
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
| MCP | Shown as **Soon**. Endpoint text `https://mcp.merchfrom.com` is a placeholder. |
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

Header (all routes): mark + `MERCHFROM®` left; right: How it works · Shop & Run · Catalog · Agents | Sign in · **Apply**. Mobile: mark, Apply, menu button → full-screen menu. Current page = `aria-current` + full-opacity/underline (**no blur**).
`Sign in` links to `NEXT_PUBLIC_PLATFORM_URL` and is hidden when that env var is unset.

Home (`/`) sections, in order: Hero → Printed for → 01 One assistant → 02 Shop & Run → Catalog teaser → Studio → 03 Bring your own agent → Apply → Footer.
Other routes keep their URLs: `/catalog`, `/gallery`, `/about`, `/contact`, `/waitlist`, 404. The old roster wall (`ListView`) and the intro animation leave the home page.
Footer: wordmark + tagline, links (Catalog, Shop & Run, Agents, Gallery, About, Contact), language switcher, `© {year} MerchFrom`.

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
- `Agents`: "Soon" badge, copy, code block (`claude mcp add merchfrom https://mcp.merchfrom.com` + connector URL), "Claude · ChatGPT · Cursor", link to `/llms.txt`.
- `ApplySection`: role select + email + Apply, calling the existing `submitWaitlist` action; success/error states reuse `waitlist.*` strings.
Match the mock's spacing: sections 120px vertical padding desktop / 96px mobile, 12-column grid with 24px gaps, 64px gutters.

### WP3 — Existing pages and fixes
Files: `components/GridView.tsx`, `ProductModal.tsx`, `ViewShell.tsx`, `GalleryView.tsx`, `ListView.tsx`, `Intro.tsx`, `Cursor.tsx`, `app/catalog`, `app/gallery`, `app/about/*`, `app/contact/*`, `app/waitlist/*`, `app/not-found.tsx`, `app/NotFoundCopy.tsx`, `lib/clients.ts`, `app/llms.txt/route.ts` (new), `app/sitemap.ts`.
1. Catalog permanently dark: remove every `dataset.mode` write in `ViewShell`, `GridView` and `ProductModal`. Product tiles sit on `--surface` so black garments stay visible; check a black tee and a white tee in screenshots.
2. Restyle about, contact, waitlist and 404 to the tokens and Barlow scale (sentence-case H1 instead of Oswald caps).
3. Waitlist: read `brief` from the URL and show "Brief attached"; send it to `submitWaitlist`; the action trims it to 500 chars, adds `ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS brief text` (same pattern as `role`/`favourites`) and includes it in the JSONL fallback. Add role "Festival or promoter" to both option lists; relabel "Tattoo artist" as "Tattoo artist or studio" (keep the canonical value). Add page metadata (`title: 'Waitlist'`).
4. `lib/clients.ts`: remove "Metallica" and "Feel Like Shit" (still placeholder, fictional names only).
5. Delete `ListView`, `Intro` and `Cursor` if nothing uses them any more.
6. `/llms.txt`: plain-text route describing MerchFrom, key pages and "MCP server: coming soon".
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
footer.rights         © {year} MerchFrom

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
home.paths.shop.body  Your store at merchfrom.com/you or your own domain. Each order is printed as it sells, and your share lands with the sale.
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
