# Print prep build: status (production stations, A2 film, collar and per-position pricing integrated, 17 Oct 2026)

Worktree: `/path/to/blackout-merchandise-print-prep`, branch `feat/print-prep` (from `22678b3`). Phases 0 to 2, shop pricing and print areas are in local commits (not pushed); the production stations round (PS-A to PS-E) is uncommitted. Migrations `0003` to `0006` have run only on PGlite (the tests and the local demo database), never on Neon.

## Work packages

| WP | State |
|---|---|
| 0 Contract | Done |
| 1 Engine | Done |
| 2 Pack files and checks | Done |
| 3 Permissions and team | Done |
| 4 Studio fixes and channels | Done, with DTF on all 122 blanks |
| 5 Storage, queue and worker | Done |
| 6 Fixtures and data | Done |
| 7 Pipeline, services and tools | Done |
| 8 Studio approval page | Done, with Undo |
| 9 Admin pre-press pages | Done, with Undo, the PNG zip and the dot shape |
| 10 Integration and review | Done (this file) |
| 11 Docs | Separate session; its edits to the PRD, DEVLOG, roadmap and image-generation note are in the worktree |
| P2-A Index separations | Done |
| P2-B Simulated process and method dispatch | Done |
| P2-C Dot-gain calibration | Done |
| P2-D Screen-count pricing for runs | Done |
| P2-E Fixtures | Done |
| Phase 2 integration and review | Done (16 Oct, "Phase 2" below) |
| PL-A Print areas: front, back and sleeves, each with its own design | Done |
| PL-B Shop-product pricing (DTG/DTF) and the Shop products tab | Done |
| PL-C Flat true-size sleeve proof | Done |
| Shop pricing and print areas: integration and review | Done (16 Oct) |
| PS-A Production tracking, the "On the press" feed and the artist's opt-in | Done |
| PS-B Production stations (`/station`) and the job sheet as data | Done |
| PS-C A2 portrait films, corner marks, designs up to 40 × 54 cm | Done |
| PS-D Placement limit 40 × 54 cm, collar distance 5 cm, mockup boxes | Done |
| PS-E Colour surcharge per print position, DTG/DTF run extras | Done |
| Production stations round: integration and review | Done (17 Oct, next section) |

## Production stations, A2 film, collar and per-position pricing (17 Oct 2026)

Plan section 1 (Decisions: "Production stations", "Film and design size", "Collar distance", "Colour surcharge per position", "DTG/DTF run extras"). Five packages built in parallel, then integrated and reviewed in one pass. Uncommitted; one migration, `0006_production_progress`.

**What it adds**
- **Production tracking (PS-A).** `lib/services/production-progress.ts` and migration `0006` (additive, safe to run again): `production_jobs`, `production_lines`, `screen_progress`, and `artist_stores.show_on_press_board` (off by default).
  - A job is one design's batch for one method (screen print, DTG or DTF). One open batch per design and method takes new pieces (a unique index); pieces paid once it is off the press start the next batch. Its lines are the job sheet's "pieces waiting": by order, garment, colour, size and print positions. A screen job has a screen for each film of each approved pack.
  - `syncProductionJobs` builds them from the paid orders and runs whose print files pre-press approved. It runs on a station's read (at most every 5 s per server process), on payment, on a pack's approval, on a full refund and on shipping. It is idempotent and never resets a count. A total that drops below what was printed is clamped and flagged in words; a cancelled order's lines go; a job reads shipped once every order in it has shipped.
  - A count is one atomic UPDATE, clamped to 0..total in the database, and a CHECK constraint keeps printed at or below the total, so iPads counting the same line all land.
  - Guards: Screens is for screen print only; printing waits for every screen to be ready, Curing and Folding for every piece (both can be forced, and the activity log says so); Shipped is not a station's step; moving back is allowed unless another batch of the design took the place.
  - The order follows: its first printed piece moves it to printing, and it is packed once every piece is printed and every job it is in has reached Folding, through the production gate. Shipping stays the Production page's step, with tracking.
  - `GET /api/public/on-the-press`, the website's board, and Settings → "Show my shop's name on the Blackout Merchandise press board".
- **Stations (PS-B).** `app/station` and `components/station`: an iPad app of its own (home-screen manifest, icons, wake lock, safe areas, targets of 56 px or more).
  - The queue: jobs by stage, for this iPad's station (screen print, DTG, DTF or all), with their proofs, refreshed every 10 s.
  - A job: a stepper with one big next-step button ("Job done" is the step into Folding); tabs for Screens, Pieces, Proofs and the Job sheet; counters (-1, +1, +5, +10, All and a keypad), shown at once and corrected by the server's numbers; held moves ask first and are then forced; hide from the board.
  - Production View reads; the controls need Production Work.
  - The job sheet as data (`lib/print/job-sheet-view.ts`): the PDF is drawn from the same view, and a test holds the two to the same words both ways.
- **A2 film (PS-C).** Films are A2 portrait at most: 10 mm of clear film at the sides, 27 mm above and below, a 10 mm ink gap, and four registration targets at the corners, top and bottom only, with the labels between them. A 40 × 54 cm design at 600 ppi makes a 9921 × 14031 px film (A2); a smaller design keeps the margins and makes a smaller film. A bigger design is refused in words before any work. The checks look for the four corner marks, a print over 40 × 54 cm, a film over A2 and ink in the gap. `ENGINE_VERSION` 3.0.0; packs from engine 2 keep their side marks and can still be relabelled.
- **Placement and collar (PS-D).** A print area is at most 40 × 54 cm, portrait (`MAX_DESIGN_CM`). The front and back positions of T-shirts, Sweats & Hoodies, Polos and Kids & Baby carry the owner's 5 cm collar distance, so the sheet says "5 cm below the collar". Their mockup boxes now start 5 cm below the collar seam, measured on the packshots (`scripts/measure-collar-seam.ts` reproduces every number); the T-shirt back box is centred (it was 48 px off).
- **Per-position pricing (PS-E).** On a screen-printed run each print position counts its own colours on its own design: a front and a back of 10 colours each are +€2.00 and +€2.00, €4.00 a piece. A DTG/DTF run with more positions pays the shop's extras: +€1.00 front and back, +€2.00 once for sleeve prints. Each quote line keeps its lines (`extras`), the proof shows them, the assistant gets each position with its design and offers fewer colours per design, and the artist reads "colours" throughout.

**Integration (the notes items, all done)**
- **Stations in the admin sidebar**, after Production, for Production View. The sidebar test now checks that `app/station/page.tsx` asks for the same access.
- **`station` in `APP_SEGMENTS` and `RESERVED_SLUGS`.** Before, the proxy read `/station` as a shop address and let it through without sign-in (the page then asked for it), and an artist could have registered it as a shop slug. A test checks both.
- **Print files:** Production View reads every design's public files (the proofs the stations show; before, a production-only employee got 403 without a public R2 domain). Private files (PSDs, PNGs, job sheets) stay Pre-press's: 403.
- **The PDF test reader** cuts each stream at its `/Length`: a page whose deflated text ended in a carriage return (about one in 256) lost its text, and the job sheet tests flaked. The parity helper uses it too; a test builds both endings.
- **Count taps share one activity row.** Taps by one person on one line of a job, each within 60 s of the last and within 10 minutes of the first, update one row in one atomic UPDATE: "Counted 56 of 160 printed on … (from 40, in 3 taps)". Another line, another person or a pause starts a new row. Stage and screen changes keep a row each.
- **PS-E wiring:** the approval page passes the view's sets and areas, so the runs tab prices each print position; each screen set names its area (`areaKey`), and the set on show follows the chosen area. "Per print position" in `change_screen_count` (its description and its note), each set's price note, the assistant's guidance and the pre-press "Run again" note.
- **40 × 54 cm** in the tool descriptions (`create_product`, `set_print_areas`), the guidance (with "5 cm below the collar"), the shop price editor and comments, where they said "A2, 42 × 59.4".
- **Smoke rows** in `scripts/public-routes-smoke.ts` (edited, not run): `/station`, `/station/job/x`, `/admin/pricing`, `/admin/ink-system/calibration` and the three calibration routes.

**Review findings fixed**
- **The board could fail for the website for 15 s at a time.** The feed allowed a list of origins and echoed the caller's, with `Vary: Origin`, while a CDN cached it (`s-maxage`); a cache that doesn't key on `Vary` would hand one origin's answer, or a no-origin answer, to another. The rows are public and sent without credentials, so the feed now answers `Access-Control-Allow-Origin: *`, the same to everyone, and `WEBSITE_ORIGIN` is no longer read. It takes no parameters and its row ids are hashes, so there is nothing to look up or step through.
- **The board:** a shipped job showed what the stations had counted (an order shipped from Production without counts read "0/2 SHIPPED"); it now shows every piece made. With more than 60 jobs it kept the queue and dropped the press; it now keeps the press, then what is nearest to done, and the queue gives way first.
- **Order moves raced.** Two iPads counting an order's first pieces at once both moved it and logged "is printing" twice (and two shipments at once would have sent two shipped notices). `transition()`, the single writer, now writes only if the order is still at the status it read and still paid, and the stations use `advanceFrom(order, from, to)`, so exactly one move lands. Shipping is unchanged.
- **Runs took prints the films can't hold.** A run quote accepted any main width and extra positions up to 60 cm, and two front prints. Now every position is 2 cm to what it takes (40 cm; a sleeve its own size), and a garment has one front print, as a product does. That settles PS-E's open question: two front positions on a DTG/DTF run can't be quoted.
- **Preparing took widths up to 60 cm**, so a 45 cm print queued a job the engine then refused. `prepare_print` and the service now refuse anything over 40 cm in words, before a job.
- **The sample sheet** (PRINT_MOCK, STATION_MOCK) said "Standard position" for the T-shirt; it now says "5 cm below the collar", and the note under rows without a distance no longer says the distance "isn't set yet" (those garments have none).
- **Wording:** a flag says "1 is extra", not "1 are extra"; the opt-in says it names the shop beside runs and shop orders (it said runs only).

**Checked and holding**
- **Counts:** ten iPads adding one at the same moment all land; a count stops at the total and at none; a sync after counts adds and removes nothing and keeps every count; the database refuses printed above the total.
- **Guards:** screens before printing, every piece before Curing and Folding, both forced only on purpose and logged "(forced)"; Shipped only when every order shipped; another open batch blocks moving back.
- **The board:** no email, order reference, address or internal id (a test searches the whole answer for each); "Private" unless the shop opted in; hidden jobs excluded; shipped jobs for 48 hours; 15 s in the process and at the CDN; a failure is a 503 with a plain sentence and nothing of the cause.
- **Stations:** every page and action asks for Production (View to read, Work to change) before it reads its input, and the service checks again; the sample jobs need `STATION_MOCK=1` and never run in production.
- **Job sheets:** the iPad and the PDF are drawn from one view, held to the same words both ways.
- **Pricing:** the owner's example (+€4.00 a piece); DTG/DTF runs pay +€1.00 and +€2.00 once; shop products price as before (their tests are unchanged).
- **Migrations:** `0005` and `0006` run twice on PGlite without failing or changing what is there.

**Demo builder** (`scripts/local-demo.ts`, edited, not run: rebuild with `npm run demo:local -- --reset`)
- **The run on the press:** the Underwriter run is now 160 pieces. As Production (Marc): the darks screens on the press, the lights screens one ready, one film printed and the rest waiting, the move to printing forced, then counted tap by tap to 56 of 160. The order moved to printing by itself. The build stops if any of that reads otherwise.
- **A DTG job queued:** Jordi's shop order. The earlier shop order shipped, so its job reads shipped and stays on the board for 48 hours.
- **A job in curing:** a second shop, Low Tide (its own artist, `lettering-1c.png`, approved), a DTG run of 40 white tees, every piece counted, then into Curing.
- **The board:** the Underwriter shop opted in, so its rows carry its name; Low Tide's row reads "Private". The build logs the board's rows.
- **`/dev`:** the station queue as Production and as the Owner, a link to each job on the floor, the Settings page (the opt-in) and the public feed JSON.

**For the website (a later change in the main tree)**
- `GET <platform origin>/api/public/on-the-press`, the same origin the door uses for sign-in (`STUDIO_ORIGIN` in `mainpage/index.html`). No sign-in, no credentials, no parameters.
- 200: `{ "rows": [{ "id", "client", "piece", "printed", "total", "ink", "stage", "updatedAt" }], "generatedAt" }`. `id` is a stable 12-character hash for following a row from one read to the next; `client` is the shop's name or "Private"; `piece` the garment ("Classic tee", or "Classic tee + 1 more"); `ink` "6 colours" or "Full colour (DTG)"; `stage` one of QUEUED, SCREENS, ON THE PRESS, CURING, FOLDING, SHIPPED. At most 60 rows, in the order of the stages; cached 15 s, so poll no faster.
- 503: `{ "error" }`, a sentence to show or skip.
- Environment: none. Any origin may read it.

**Verification (17 Oct, final tree)**
- `npx next typegen && npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors, 25 warnings, all in files this round doesn't touch (the same files as before).
- `DATABASE_URL= npm test`: 1442 tests: 1439 pass, 3 skipped (the opt-in benchmarks), 0 fail. This pass added 7 tests (coalesced counts, one move per order, the board's cap, the stations behind sign-in, Production reading proofs, the PDF reader's line endings, the set of the area on show) and replaced the board's two origin-list tests with one.
- `npm run build` (Turbopack): passes, with the root `node_modules` symlink moved aside and then restored. 79 routes, `/station`, `/station/job/[jobId]` and `/api/public/on-the-press` among them; no function trace carries a `public/` file.

**Owner actions**
1. **Neon:** migration `0006` is not applied, nor `0003` to `0005`. Ask before applying them.
2. **iPads:** open `/station` and add it to the home screen. Whoever counts needs Production Work; Production View only looks.
3. **The website:** point the board at the feed (above).

**Owner decisions pending**
- **Runs follow the product rules:** one front print, and each print at most 40 cm wide. A run used to accept a second front and prints up to 60 cm.
- **Shop orders on the board:** every job is on the board, shop orders included, under the shop's name only when it opted in. Staff can hide any job.
- **A shipped job shows every piece made,** whatever the stations counted.
- **The count log** merges taps 60 s apart for up to 10 minutes per row.

**Settled by the owner since earlier rounds** (16 Oct; the sections below keep what they said then)
- "A2 portrait only" (shop pricing round): a design is at most 40 × 54 cm, portrait, so its film is A2.
- "Extras on DTG/DTF runs" (shop pricing round): yes, the shop's extras.
- "Surcharge per position" (Phase 2): per print position, each on its own design.

**Remaining risks**
- **Mockup framing varies per blank:** the box is 5 cm below the seam on the most popular blank of each type, and 0.2 to 9.4 cm on others. The job sheet's "5 cm below the collar" is what production follows. The Sweats & Hoodies and Kids & Baby back boxes are not moved (a hood hides the seam).
- **A product's print areas changed while its orders print:** its lines take new keys. The counts stay on the old lines' flags, and the new lines start at 0.
- **Sync cost:** each station read re-reads the open orders (at most every 5 s per server process). Fine at a shop's volume; revisit with many iPads or orders.
- **Join before sign-off:** an order joins the stations once pre-press approved its files; the artist's sign-off is checked when the order moves to printing (the production gate), so a job could be counted while its order stays queued.
- **Not tried on the floor:** the stations were checked in a desktop browser and the tests, not on an iPad at the press; the films are not printed yet.

## Shop pricing and print areas (16 Oct 2026)

Plan section 1 ("Shop prices", "Sleeve prints", "Channels", "Publishing"). Three packages built in parallel, then integrated and reviewed in one pass. Committed locally (`cda782e`, docs in `e26343f`); one migration, `0005_products_print_areas`.

**What it adds**
- **Print areas (PL-A).** A product prints a list of areas, `products.placements`: `{ position, widthCm, offsetYcm?, designId }`, so the front and the back can be different artwork.
  - The rules (`checkPrintAreas` in `lib/mockups/placements.ts`): at most one front area (front chest, full front or left chest), one back, and the left and right sleeves on the blanks in `SLEEVE_PRINTS`; each area at most A2 portrait, 42 × 59.4 cm; a sleeve at most 10 × 10 cm (short) or 8 × 40 cm (long), the owner's defaults.
  - Migration `0005` adds `products.placements`, `products.base_cost_lines` and `product_colours.mockup_views`, and copies each product's one `placement` and its design into the list. The old column is read as a fallback (`productAreasOf`) and never written.
  - Tools: `create_product` takes `areas`; `set_print_areas` adds, changes and removes them; `get_quote` gives the shop breakdown; `prepare_print` with a product prepares every area, one job per design.
  - Publishing needs every area approved, each against its own design, and the refusal names the area that waits ("the left sleeve print of the Underwriter tour tee").
  - Orders, runs and job sheets follow every area. A run of a product carries its other areas as `extraPlacements`, each with its design.
  - Mockups: the front photo carries every front print and the back photo every back print. A sleeve never goes on a photo.
- **Shop prices (PL-B).** `lib/pricing/pod-table.ts` (pure, shared with the admin editor) and `lib/pricing/pod.ts` (`podPrice`, server).
  - One `app_settings` row, `pod_price_table`: a base price per garment, which includes one print area up to A2 on the front or the back, an optional DTF price, and the extras: +€1 when a product prints front and back, +€2 once for sleeve prints.
  - A garment nobody priced is a placeholder: its one-print DTG base cost, or DTF's where it has no DTG. Embroidery keeps its own base cost, with no extras.
  - A product's base cost is `podPrice` for its areas, taken on create, on every area change and again at publish. A change that would lift the base past the price less €1 is refused with the lowest price that works (`priceNeeded`).
  - `/admin/pricing?tab=shop`: search, filters, "set all of a type", the DTF price and live examples. Catalogue and pricing View reads it; Manage saves it, and the save is in the activity log.
- **Sleeve proof (PL-C).** `lib/mockups/sleeve-proof.ts` and `sleeve-geometry.ts`: a 4:5 PNG (800 × 1000, about 35 KB) on the ecru plate, the sleeve outline in the garment colour, the print at true scale with dimension lines, and a label ("Left sleeve · 9 × 9 cm · true size"). A right sleeve is the exact mirror.
  - Drawn only in the pipeline (the worker), for both techniques, and stored as the pack's `proof` files. The product and the approval page read them.
  - When it can't be drawn, the approval page shows a "Sleeve proof coming" card with the size, and the pack gets a `sleeve_proof` review check. A missing font is logged and named in that check.

**Integration (the notes items, all done)**
- **"From" prices are the shop prices.** The catalogue page (`/api/catalogue`), `list_blanks` and `get_blank` show what a shop product of the garment costs with one print: its price in the shop table, at the cheapest shop method it offers (DTF's own price counts where the owner set one), else its placeholder. Run quantity breaks and embroidery no longer set it (`loadShopFromPrices` in `lib/services/pricing-admin.ts`).
  - The catalogue's cached prices move to shape `v3`. Saving a shop price or a base cost refreshes them (tag `catalogue`), so a change shows at once, not up to an hour later.
- **`set_base_cost` prices runs.** Its description says the rows price runs (DTG, DTF and embroidery, by quantity break) and embroidered shop products, never a DTG/DTF shop product. Its result says what a shop product of the garment costs now: the shop table's price, or the placeholder that this kind of row sets.
- **New staff tool `set_shop_price`**: a garment's shop price in the shop table, the same as the admin tab. Catalogue and pricing Manage; it asks for confirmation; it keeps a DTF price it isn't told about; `null` takes the garment back to its placeholder. `list_base_costs` shows the shop price beside the run rows.
- **Activity log words** for `pricing.shop_table`.

**Review findings fixed**
- **Migration `0005` failed if run twice.** Its `ADD COLUMN`s now have `IF NOT EXISTS`, and the backfill only fills rows without a list. A test runs the statements again on a migrated database: nothing fails, and a list written since stays.
- **Preparing a product rebuilt files that existed.** `prepare_print` with a product rebuilt every area in every colour. A second product of an approved design in other colours rebuilt the screen packs, and the rebuilt packs went back to the pre-press queue.
  - It now makes only the positions and colours that have no DTG/DTF files on the design's newest version. It still makes one job per design.
  - A design whose areas all have files starts no job (`alreadyPrepared`).
- **The prepare details were refused.** The assistant gets `offsetYcm` with the prepare details, but `prepare_print` took no offset and refuses unknown fields. It now takes `offsetYcm`, and the details carry `productId`, so the call prepares the whole product at its exact placements. The guidance says to prepare with the product.
- **Shop quotes by positions.**
  - The rules weren't checked, so a sleeve on a tank top was quoted at +€2. Positions are now held to the product rules.
  - With no method named, a quote was always DTG, which a jacket can't print. It is now DTG, or DTF where the garment has no DTG.
  - A method the garment doesn't offer, or screen print, is now refused in words.
- **A price sent with an area change** was saved unchecked on a product with no base cost. It is now refused, as `set_price` refuses it.
- **Runs:** the main position's design (from a service caller) wasn't checked against the shop; it is now, like the extra positions. A design id that isn't an id is now refused before it reaches the database, in runs and in product areas.
- **`scripts/print-samples.ts`** wrote the old `placement` column; it now writes `placements`.

**Checked and holding**
- An artist edits only their own shop's print areas (every read and write is scoped by shop). No artist tool takes a base cost: their inputs are strict, and a call that names one is refused.
- The price stays at least €1 above the base cost at `set_price`, on every area change (`priceNeeded`) and at publish (re-priced first). A colour change doesn't move the base.
- Checkout uses the product's base cost, extras included. A test buys 2 of a front, back and sleeve tee: the Stripe application fee is 2 × (base + €1 + €2) plus shipping, and the transfer is the margin.
- Admin pricing: the page needs View; the action and the service need Manage.
- No Pantone code in an artist view. Sleeve proofs are drawn only in the worker.

**Demo builder** (`scripts/local-demo.ts`, edited, not run: rebuild with `npm run demo:local -- --reset`)
- **Shop prices for 8 garments**, the rest on placeholders: Classic tee €17, Women's classic tee €17, Light tee €16, Heavy tee €21, Long-sleeve tee €22, Heavy hoodie €34 (DTF €35), Heavy sweatshirt €30, Classic tote bag €12 (DTF only). The demo's existing tees are now made at €17.
- **The Underwriter tour tee**, in black and French Navy:
  - the Underwriter on the front (approved);
  - a new design on the back (`riso-2-colour.png`, approved by the artist in the build);
  - the Sunset star on the left sleeve.
- Its base reads "Garment with one print €17.00 · Front and back +€1.00 · Sleeve prints +€2.00 · Base €20.00", and it is priced at €39. The build stops if the breakdown is anything else.
- It stays a draft because the Sunset star still waits for the artist, so publishing names the left sleeve print. The Sunset star's approval page shows two areas, the sleeve as its flat proof. To finish: approve the Sunset star, then publish the tour tee.

**Verification (16 Oct, final tree)**
- `npx next typegen && npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors. There are 25 warnings, in the same files as before.
- `DATABASE_URL= npm test`: 1248 tests: 1245 pass, 3 skipped (the opt-in benchmarks), 0 fail. This pass added 13 tests.
- `npm run build` (Turbopack): passes, with the root `node_modules` symlink moved aside and then restored. There are 41 pages and routes, and no function trace carries a `public/` file.

**Owner actions**
1. **Shop prices.** Set them at Admin, Pricing, Shop products (or ask the assistant: `set_shop_price`). Until then every garment is on its placeholder, and the extras are +€1 and +€2.
2. **Neon.** Migration `0005` is not applied, nor are `0003` and `0004`. Ask before applying them, then run `npm run seed`.
3. **Worker image.** Install fontconfig and DejaVu, or the sleeve proofs can't be labelled.

**Owner decisions pending**
- **Sleeve sizes.** The defaults are 10 × 10 cm on a short sleeve and 8 × 40 cm on a long one. The proof outline draws at most 12 × 12 and 9 × 40 (`sleeve-geometry.ts`), so raise the two together.
- **Blanks with no sleeve print.** These are left out: the dolman tee, the puffers and padded jackets, the sherpa, the bomber, the woven shirts and the overshirt, and Kids & Baby. Polos are included.
- **A2 portrait only.** The limit is 42 cm wide by 59.4 cm tall; a landscape A2, 59.4 cm wide, is refused.
- **Extras on DTG/DTF runs.** A DTG/DTF run with more areas adds the shop extras (+€1 and +€2 a piece) to the run's price.
- **DTF in the "from" price.** A DTF price below the garment's base becomes its "from" price.

**Remaining risks**
- **Sleeve proofs not printed yet.** They use the adult M sleeve and haven't been compared with a printed sleeve.
- **Live prices don't follow the table.** A live product keeps its base cost when the table changes. New products, area changes and publishing take the new price.


## Phase 2 (16 Oct 2026): any art up to 15 screens

Plan sections 4.3, 5 and 10. Five packages (P2-A to P2-E) built in parallel, then integrated and reviewed in one pass. Committed locally (`39fb225`, docs in `65de03a`); no migration.

**What it adds**
- **A method per screen set.** `separateScreen` (`lib/print/engine/index.ts`) takes spot, index or simulated process for each set, as `analyse.ts` chooses it or the recipe forces it, and renders the set with that method: `render.ts`, `index-method.ts` (with `index-cells`, `index-palette`, `index-mix` and `index-dither`) or `sim-process.ts` (with `sim-model`, `sim-lut`, `sim-inks` and `sim-screen`). A garment joins a set when that method's own prediction of the print stays within the ΔE target. Each set, and so each pack, says why it has its method. The Phase 1 "spot draft, finished by hand" path is left only as a fallback for a renderer that is a stub.
- **Index.** Square cells at 200 per inch (3 × 3 px at 600 ppi), one ink per cell, so two inks never share a spot. The dither is serpentine Floyd–Steinberg, with the error carried in linear light and each choice made in OKLab. The underbase lies under every ink cell, choked in whole cells, and there are no traps. A colour the inks can't reach is flagged for review and named.
- **Simulated process.** The print model (`model.ts`) inverted through a 3D table: for each pixel, the plate areas that print the art's colour over the underbase and the garment, within a 250% wet-ink limit. All plates share one AM screen, so the dots nest as the model assumes. Tones past the 5% and 90% dot limits are dithered cell by cell. Each set reports how far its proof is from the art (ΔE2000 over 3 mm squares, info).
- **Dot-gain calibration** (`lib/print/calibration/`):
  - A test chart (PSD films and a PDF), read from a scan (fiducials, a projective fit, Murray–Davies), from typed readings or from a spectrophotometer's.
  - A monotone curve through the readings (isotonic fit, then PCHIP) and its exact inverse.
  - Saved as `InkSystemProfile.dotGain`. A save adds a new ink-system row, so each pack keeps the curve it was made with.
  - The films are compensated (`dotGainFor`). Proofs and the accuracy figure add the gain back (`printedToneFor`, through `engine/printed-tone.ts`), so they show the print.
  - Admin: Ink system → Dot gain calibration, and the routes `app/api/calibration/{chart,scan-url,scan}`.
- **Runs priced by their screens** (`lib/pricing/screen-print.ts`):
  - A price table by screen count and quantity, plus the fixed €1 per piece for each screen above 8, up to 15. More than 15 is refused.
  - `/admin/pricing` edits the table: Catalogue and pricing View reads it, Manage saves it. It is one JSON row in `app_settings`.
  - A screen-printed run line takes its count from the design's screen files for that colour and position: from the version the artist approved, else the newest. With no files it guesses, and says why.
  - The line is priced again when the proof is sent. An approval is refused if the count has moved, or while the files are being made again.
  - Shop products, and runs printed DTG/DTF, are priced as before.

**Integration (the notes items, all done)**
- **Supplier orders:** a screen run's blanks are bought at the blank's own cost. They were costed at €0.
- **More print positions on a run line** (`extraPlacements`): pre-press builds, attaches and gates a pack for each position, and the job sheet lists each one.
- **`get_quote`:** says a screen price is an estimate, with its screens. It takes an optional garment colour, and offers a run quote rather than a shop price.
- **Clean-ups:** `priceNote` and `PRICE_LINE` are removed, and the test catalogue has no screen base costs.
- **Index films are named "Index 200 ppi"** everywhere:
  - in the PSD layer names, through the writer, the structure check, and the corrected-PSD reader and its parser;
  - on the job sheet;
  - in the pre-press film line;
  - in the Studio loupe caption.
- **Proofs show the printed tone** once a curve is saved. Without one they are byte for byte what they were.
- **Admin gate test:** it now scans `app/api/calibration`, and the three routes pass.
- **Activity log words** for `ink_system.update`, `ink_system.dot_gain`, `ink_system.dot_gain_reset` and `pricing.screen_table`.
- **Job sheet:**
  - A "Dot gain" line per screen set: the curve's date, how it was read, and its lpi, angle and mesh. It says "Not calibrated: linear" without a curve, and "Not used" for index sets.
  - Traps as each method makes them.
  - Index rulings.
  - The cached sheets carry a layout version, so the old ones are drawn again.
- **Index separations are made once:** the index renderer reuses the separation the set joins made, and the films come out byte-identical.

**Review findings fixed**
- **Simulated process: stray dots across the empty print area.** On some shirt colours it left scattered 5% dots there. On the engine's own black, every transparent pixel had a 1/255 area, because the table blends nodes next to the shirt colour. Colours the knockout removes entirely, and transparent pixels, now print nothing. A test uses the reviewer's art.
- **Simulated process: the accuracy figure ignored dot gain.** With a curve saved, the compensated films read ΔE 5–6 off where the print is ΔE 1. The figure now uses the printed tone, as the proof does.
- **Runs: approval while files were rebuilding.** A run could be approved while its design's screen files were being made again, at a count about to change. The approval now waits until they are ready.
- **Runs: DTG/DTF setup fee.** DTG/DTF runs re-read the setup fee when the proof was sent. They now keep the quoted price.
- **Pricing: stale screen base costs.** Neon still has screen base costs from the old seed, and they would have set the catalogue's "from" prices. The price queries skip them, and the seed deletes them.
- **Engine version.** `ENGINE_VERSION` was still 1.0.0, so a Phase 1 job input could find Phase 1 packs again. It is now 2.0.0, in every job hash and manifest.
- **Method reasons.** Every pack carried the lead set's reason; each set now has its own.
- **Ink changes with fewer screens.** A re-run that changes inks and asks for fewer screens than the pack has films is refused: the engine would have dropped inks. Simulated process never makes more films than there are screens.
- **Index edge cases:** the rare-ink pass can no longer drop every ink, and the cell grid is clamped to 25–600 per inch.
- **Wording:** the simulated-process reason says when the number of colours, not shading, ruled out spot.
- **Calibration:**
  - The scan decoder refuses images over 160 megapixels before decoding them. It allowed 450, about 1.35 GB decoded.
  - The chart route's refusals now talk about the chart.

**Verification (16 Oct, final tree)**
- `npx next typegen && npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors. There are 25 warnings, all in files Phase 2 doesn't touch: the same files as before Phase 2.
- `DATABASE_URL= npm test`: 1091 tests: 1088 pass, 3 skipped (the opt-in benchmarks), 0 fail. This pass added 18 tests and removed one (priceNote's), on top of the packages' own.
- `npm run build` (Turbopack): passes, with the root `node_modules` symlink moved aside and then restored.
  - 41 pages and routes.
  - The calibration routes trace 42 MB and carry no `public/` file.
- **Samples:** six fixtures regenerated with the Phase 2 engine. Every file re-opens with the independent decoders (table under "Samples").

**Owner actions (Phase 2)**
1. **Screen-print prices.** Until a table is saved, `/admin/pricing` uses placeholders:
   - 8 tiers × 4 quantity breaks, from the old seed: 3.50, 5.20 and 6.90, +1.70 per screen, with breaks of −8%, −15% and −22%;
   - a 30% margin;
   - €0 setup per screen;
   - the second position at 100%;
   - one size band at 100%.
   The garment cost is the blank's own base cost.
2. **Calibration print.** Until this is done the films are linear.
   1. Ink system → Dot gain calibration → download the chart PSD. It has one film per ink kind, at the house screen of 55 lpi, 22.5° and the halftone mesh.
   2. Burn the films, and print the chart on the shop's own blank.
   3. Scan it at 300–600 dpi (TIFF, PNG or JPEG) and read it, or type the readings in.
3. **Environment and storage:**
   - `CALIBRATION_SCAN_MAX_MB` caps a scan upload: 300 by default, 1024 at most.
   - Scans go to `uploads/prepress/calibration/` by a signed PUT, as corrected PSDs do, and are deleted once read. Add an R2 lifecycle rule for `uploads/prepress/` beside the one for `prepress-uploads/`.
4. **Neon.** After the migrations, `npm run seed` as before. It now also deletes the old screen base costs.

**Owner decisions**
- **Paying for a run on an estimated screen count.** A line whose design has no screen files for its colour or position is priced on a guess, which is never above 8 screens and so never surcharged. Its files are only made once the run is paid; if they need more screens, the shop absorbs the difference. The alternative is to make the files before the run's proof can be approved.
- **Surcharge per position.** The surcharge is counted per print position, so a front and a back of 10 screens each add €4 a piece. Confirm this, or count only the position with the most screens.
- **Which area owns the price table.** It sits under Catalogue and pricing (Manage), but the plan's Runs area also has "run prices" at Manage. Confirm which owns it.
- **Method choices.** Index and simulated process were tuned on synthetic fixtures only. Sign off the choices after the first test prints.

**Phase 2: remaining risks**
- **Not printed yet.** Nothing from Phase 2 has been printed or opened in Photoshop, the index cells and simulated-process halftones especially.
- **One curve for every ink.** One dot-gain curve covers the underbase, the colour base and the highlight white. The calibration page warns when the chart's films disagree.
- **Accuracy is the model's.** The print model uses estimated opacities until the inks are measured, so the simulated-process figure is the model's accuracy, not the print's.
- **Specks in simulated process.** Its films carry a few hundred isolated 1–2 px dots each (under 0.1% of the cells), where tones fade out. The features check asks for review on them, and they drop out on the press. A despeckle pass after the halftone would clear them (Phase 3).
- **Where a plate turns solid.** In a smooth gradient, the proof shows a faint boundary where a plate turns solid, past the 90% dot (the turquoise spot in `smooth-gradients`). The test print will show whether it matters.
- **Scan reading runs in a request.** It can take up to 120 s and about 1 GB for a big scan, and it doesn't run in the worker.
- **Ink-system saves.** Saving reads the active profile, then inserts a new row. If two saves land at once the newest wins, but there is never no active row.
- **Ink changes on a re-run** (from Phase 1). They lock only the colour inks, so on darks the highlight white can drop out and on lights a white becomes a colour ink.

## Phase 1 verification (15 Oct)

- `npx next typegen && npx tsc --noEmit`: 0 errors (clean, no incremental cache).
- `npm run lint`: 0 errors. 26 warnings, all in files this build didn't touch, and identical to the baseline before integration.
- `DATABASE_URL= npm test`: 691 tests, 690 pass, 1 skipped (the opt-in engine benchmark), 0 fail. The test globs now include `app/**` and `components/**`.
- `npm run build` (Turbopack): passes. All 41 pages and routes compile and are dynamic, and function traces carry no `public/` files (the largest is 42 MB).
  - In this worktree Turbopack refuses the root `node_modules`, because it is a symlink to the main tree's.
  - With the symlink moved aside the build passes: the platform resolves `drizzle-orm` through its tsconfig paths.
  - A normal checkout, which is what Vercel builds, has no such symlink.
- Real pipeline on PGlite with local storage (`platform/scripts/print-samples.ts`):
  - It uses the real engine, pack writers and checks, and the real packshots, on three fixtures.
  - The flow: prepare, the artist approves, codes are entered, the files are refreshed, pre-press approves.
  - Every file re-opens with the independent decoders: @webtoon/psd, pngjs and pdf-lib.

## Samples (`print-prep-samples/`, gitignored; regenerated 16 Oct with the Phase 2 engine)

Each fixture is a T-shirt, front chest at 28 cm, on Black, French Navy and White. Each fixture folder holds a folder per screen set (`screen-darks/`, `screen-lights/`, or `screen-C727/` when French Navy gets its own), `dtg-dtf/`, `job-sheet.pdf` and `index.json`. The index lists each pack's method, reason, warnings and checks, and what each file re-opened as. The Pantone codes are placeholders typed for the sample, not matches for the colours. The ink system has no dot-gain curve, so the films are linear.

| Fixture | Method | Screen PSDs (600 ppi), films | DTG/DTF PSD | Accuracy (ΔE2000 mean / p95, 3 mm squares) | Run | Peak memory |
|---|---|---|---|---|---|---|
| flat-logo-3c | spot | darks 22.4 MB (4), lights 16.3 MB (3) | 4.7 MB | not measured for spot | 27 s | 1.8 GB |
| tints-2c | spot | darks 32.3 MB (5), lights 24.9 MB (4) | 16.7 MB | not measured for spot | 34 s | 1.7 GB |
| many-colours-flat | index | darks 42.5 MB (8), French Navy 44.4 MB (8), lights 42.6 MB (8) | 4.5 MB | flagged: lime ΔE 13.2 off on darks and lights, hot pink ΔE 15.2 on navy | 67 s | 1.7 GB |
| smooth-gradients | simulated process | darks 144.3 MB (8, Black and Navy), lights 123.9 MB (8) | 38.2 MB | Black 0.8 / 1.9, White 1.6 / 4.1 | 122 s | 2.1 GB |
| painted-shading | simulated process | darks 60.9 MB (8), French Navy 62.9 MB (8), lights 55.1 MB (7) | 14.2 MB | Black 1.1 / 2.2, Navy 1.1 / 1.8, White 1.0 / 2.1 | 100 s | 1.9 GB |
| test_design | simulated process | darks 159.5 MB (8, Black and Navy), lights 157.0 MB (8) | 79.9 MB (PNGs 8–11 MB, zip 30 MB) | Black 1.6 / 3.5, White 1.0 / 3.1 | 108 s | 2.3 GB |

**What every pack contains**
- No job sheet. There is one per design, not per pack (see "Job sheet: one per design" below), and the sample writes it as `job-sheet.pdf` beside the packs.
- `manifest.json`: the hashes of every file.
- Proofs (webp), loupes and film previews.

**What the checks found**
- Every check passes or asks for review, and every pack was approved by pre-press in the sample.
- "Inks not measured" asks for review on every screen pack, as the plan expects. No pack asks about its method any more.
- The features check asks for review:
  - on simulated process for its fading specks (see the Phase 2 risks);
  - on the index sets for a few lines under 0.3 mm, mostly on the underbase;
  - on flat-logo's darks film 4.
- The index sets flag the colours their inks can't reach; "More screens would hold it" is right, since each set uses all 8.

**Regenerate**
- From `platform/`, one fixture per process: `npx tsx scripts/print-samples.ts <fixture> ../print-prep-samples`.
- The fixtures: `flat-logo-3c`, `tints-2c`, `many-colours-flat`, `smooth-gradients`, `painted-shading`, `test_design`.
- The script prints each pack's method, screens, accuracy and checks.

## What WP10 wired (integration notes)

**Routing and agent**
- `proxy.ts`: `staff-invite` is an app segment, and `/staff-invite` is public so the page can prefill the sign-in address. `scripts/public-routes-smoke.ts` covers every new route; it was edited, not run.
- Suggestions pass staff permissions.
- The voice dev user uses `devRole`.
- `pick-server` guidance: "DTG, or DTF where the blank has no DTG".
- `get_blank` returns service codes and their shop flag.
- `get_order` reads any shop's order with Shop orders View.

**Shop rule**
- `submitProof` refuses runs-only methods before inserting.
- The products, admin and commerce smoke scripts use `dtg`.

**Config**
- Test globs include `app/**` and `components/**`.
- `serverExternalPackages`: pdfkit, ag-psd and @webtoon/psd.

**Contract**
- `ScreenSet.garments` replaces the engine's WeakMap.
- Check id `structure`.
- `JobSheetInput.recipe`.
- `PackFileKind` `dtg_zip`.
- `ProofImage.overflow`.

**Schema and migrations**
- Migration `0004_print_jobs_live_hash_and_shop_methods`:
  - a unique partial index on `print_jobs(input_hash, kind)` for queued and running jobs;
  - screen services set to `available_in_shop = false`, and DTG/DTF to `true`.
- Tested on PGlite over a seeded 0003 database: no tables added or dropped, and the flags and index work.
- The `dtf` row, its blank links and its base costs come from `npm run seed`.

**Seed test**: WP6's seed test is ported to `scripts/test/seed-print.test.ts`.

**Undo**
- Studio: `revokeApproval` plus `ApprovalView.canRevoke`.
- Pre-press: `unapprovePack` on the approved banner.

**Pre-press page**
- The DTG/DTF pack has a "Download PNGs" zip and a second "Download PSD" link.
- Films show their own dot shape and ppi.

**Emails**
- `print.sent_back` and `print.reapproval` now go through `notify()`: the in-app note, plus email and Discord DM as the artist's preferences allow.
- Templates escape the staff note.

## Review findings fixed

**Pipeline and services**
- Supersession now follows colour coverage:
  - An order for a colour nobody prepared rebuilds every colour the version already prints, on the same art.
  - A new pack replaces an old one only when it prints all the old one's colours.
  - Before, a one-colour build retired the other colours' packs and moved their orders onto files without their colour.
- The production gate checks that the order's packs print every design, placement, blank and colour it asks for.
- The artist's approval now stands behind pre-press:
  - Once a version has been approved through the print approval, production uses only packs that approval covers: the packs it pinned, or replacements of them.
  - A withdrawn approval stops `approvePack` and the gate until the artist approves again.
  - A run on a colour the artist never approved prints on the run's own proof.
  - A version never approved this way goes on pre-press alone.
  - When an order waits on uncovered files, the artist is asked, once per set of packs.
- Re-approval runs for rebuilds too: a prepare job compares its proofs with the packs it replaces.
- The approval view and `approveDesign` use the same coverage rule, so a new width or colour shows "ready", not "approved".
- Corrected uploads apply the re-approval rule before any step that can fail. A retried job finishes what the first run left undone, without building again.
- A Pantone refresh no longer reverts codes typed while it ran, or resurrects a replaced pack: it merges with the row as it is now, and goes round again for new codes.
- Writes are guarded against races:
  - `approvePack`, take-over, supersession and the refresh write only if nobody wrote the row in between.
  - Ink-system saves can never leave no active row.
- One change to a pack at a time: a second re-run or correction is refused while one is under way.
- Embroidered shop products need no pack.
- An order never builds another shop's design, at the run quote or in pre-press.
- The job hash includes the engine version.

**Security**
- The voice bridge identifies the caller by an HMAC-signed, expiring token minted by `/api/voice/session`. It used to trust a raw `user_id`.
- Film previews are private: they carry Pantone codes, and were readable by the artist.
- Send-back notes refuse Pantone codes, including bare ones like "2685 C".
- `PRINT_MOCK` never runs in production.
- Invites die with the owner who sent them.
- R2 refuses to use the private bucket as the public one.
- Private signed links last 60 s.
- An attachment's design summary goes only to its own shop.

**Studio**
- A cleaned AI draft (background removed) is still a draft: its final is the draft rendered at 4K, cleaned again. It used to print the 1K cleanup at about 93 ppi.

**UI**
- The pre-press error page uses `retry`.
- Upload corrected PSD shows only on built screen packs.
- DTG/DTF packs get a "Run again" button, and a failed build can be run again as it is.
- Make owner and Make staff ask first.
- The remaining small links are 44 px.
- The screen-count price note is a ceiling.

**Engine and pack**
- Proofs are true to scale: tall art runs past the print box instead of shrinking into it, and a `print_too_tall` warning says so.
- The film label leads with n/N, so a narrow strip never cuts the screen number.
- The structure check decodes the embedded original fully.
- Film previews have no pixel limit.
- Dead code removed, and the benchmark only runs as a script.

**Worker**
- `PRINT_WORKER_MAX_JOBS` (default 25) exits cleanly for a fresh process. The PSD decoder's WebAssembly memory never shrinks.
- The Dockerfile says 8 GB.

## Job sheet: one per design (15 Oct 2026, owner decision)

The per-pack sheet (and the per-order one the plan once wanted) is gone. One A4 landscape PDF per design covers every garment that uses it (`lib/services/job-sheets.ts` collects, `lib/print/pack/job-sheet.ts` draws; sections in plan 6.3).

- **Version.** The version the artist approved, else the newest with files built. A garment whose files are only in another version says "No print file yet".
- **Garments.** Shop products that are live or have their proof out, and any with an open sale; every line of an open run (paid, not packed). Drafts, archived products with no open sale, and a run's backing products are not listed.
- **Pieces waiting.** Open orders for the design: paid, and queued or printing. Summed by garment, colour and size, with the order or run references.
- **Generation.** On demand, cached by content hash in print storage under `job-sheets/<design id>/<hash>.pdf`. No hook, no schema change, no job. A change to anything the sheet says gives a new hash and so a new PDF; the next open draws it. If the cache can't be read or written the sheet is still made.
- **Access.** Pre-press View or Production View, or the owner: `GET /api/job-sheets/<design id>`. Linked from the pack page, the production table and the order card.
- **Placement height.** A product's `offsetYcm` is an offset from the standard position of its blank type and position (positive = lower). It is not a distance from the collar, and the sheet never says it is. With `collarDistanceCm` set for that position in `lib/mockups/placements.ts` the sheet gives the real distance, "N cm below the collar" (standard plus offset). None are set yet: nobody has measured them, and none is guessed. Until then a row says "Standard position", plus "2 cm lower" or "2 cm higher" when the print was moved (nothing at 0), and a note under the table says the standard collar distance isn't set. Proofs and mockups put a moved print at the same height: `printBoxFor` (the proof's print box) and the mockup service share `printOffsetPx`, `keepOnPhoto` and `pocketLineFraction` in `lib/mockups/placements.ts`. A proof never shrinks a print to clear a hoodie's pocket, as the mockup does: the pocket line (and the box's own bottom) limits the usable area instead, so a print moved toward it is flagged `print_too_tall`.
- **Removed.** The pack's `job_sheet` file kind, `refreshJobSheet`, the sheet in a Pantone refresh, and the `order` input.
- **Sample.** `print-prep-samples/test_design/job-sheet.pdf` (script: `npx tsx scripts/print-samples.ts test_design ../print-prep-samples`, which now adds a shop order and a run so the sheet has pieces waiting).
- **Owner action.** Measure, on a real garment, how far below the collar seam the top of the print sits at the standard position for each blank type and print position, and set `collarDistanceCm` on that position in `lib/mockups/placements.ts`. Until then the sheet can't give a distance below the collar.
- **Owner action (optional).** The stored PDFs are a cache and each change adds one. Add a lifecycle rule on R2 that deletes the `job-sheets/` prefix after 30 days; a sheet that expired is just drawn again.

## Remaining risks and limits

**Not yet tested on the real thing**
- Nothing has been opened in Photoshop or GTX Graphics Lab yet.
- Nothing has been printed yet.
- R2, the presigned upload, the worker container, Clerk staff accounts, ElevenLabs forwarding of `user_token` and Resend were never called.

**Quality limits**
- Proof thresholds are uncalibrated, and the inks are unmeasured.
- Index and simulated process are built (Phase 2). Their limits are under "Phase 2: remaining risks".

**Specks**
- A speck between half a mesh dot and 0.25 mm isn't flagged, because a film can't tell it from a lone halftone dot.
- Lowering the threshold flagged a thousand dots on test_design's underbase, so it was reverted.

**Memory**
- A full front peaks at 3.1–3.7 GB.
- Running the checks in a worker thread would bound it; that is a follow-up.

**Product flow**
- Publishing waits on the design approval (see Publishing gate below). A shop product has no proof of its own: the approval replaces it.
- Several inks can share one plain name: test_design shows "Navy" three times.
- `production_packs.meta` was not added: `manifest.pipeline` stays.

## Publishing gate (15 Oct)

Owner decision: a product can't be published until its design is approved for its garment, colours and placement.

**The rule.** A product goes live only if it has a design, and the design's current version has an approval that covers the product: its blank, every enabled colour, and its print position and width (and offset, as production matches them).
- `approvalCoverage(designId, { blankCode, colours, placement })` in `lib/services/print-prep.ts` is the read-only check. It returns covered or not, why, and which colours wait on print files or on an approval.
- Shop products print DTG/DTF, so only the DTG/DTF packs answer. The screen packs don't matter for a shop product.
- `checkPublishable` in `lib/services/products.ts` runs the checks in order: status, then the print method, then the artwork, then price and payouts. `publishProduct` calls it, and it is the only way a product goes live.

**No proof for a shop product.** The design approval replaces the per-product proof (plan section 7). A draft goes straight to live: the status machine is now draft to live, and `proof_pending` is no longer entered.
- `submit_proof`, `approve_proof` and `request_proof_changes` are retired. They stay registered so old conversations and stale cards get a plain answer, change nothing, and point to the artwork or to publishing. Their descriptions and the assistant guidance say so.
- `submitProof`, `approveProof` and `requestChanges` are gone from `lib/services/proofs.ts`. Old proof rows are not touched and still read (`getLatestProof`). A product still in `proof_pending` can be published on the artwork alone.
- A run keeps its proof: `submit_bulk_proof`, `approve_bulk_proof` and `request_bulk_changes`. A run can't be paid until that proof is approved (`awaiting_payment` is only reached through it).
- The product panel, the chips, the home chips, the suggestions and "Needs you" no longer offer a shop product's proof. "Needs you" lists run proofs only.

**What blocks it.** No design, print files not prepared (or still being made) for the garment, a colour or the position, files nobody approved, an approval that was undone or withdrawn, an approval of earlier artwork, or an approval given before a colour or position was added.

**Live products.**
- They are never unpublished by this. Undoing or losing an approval leaves a live product live.
- Adding a colour to a live product, or moving its print, asks for the same coverage. Taking colours away, renaming and the like don't.

**What the artist sees.**
- `publish_product` and `update_product` refuse in one plain sentence ("Approve the artwork for the French Navy Underwriter tee first."), with a link to `/studio/approve/<designId>` or a message that prepares the print files.
- A publish that would be refused never shows a confirm card (new `preflight` hook on confirm-gated tools, used by `publish_product` only).
- The product card and the project panel show "Artwork: needs approval" with the sentence and the link, and Publish waits. The panel is read again when the chat opens, because the artist may have approved on the approval page meanwhile.
- The assistant is told to prepare and get approval before it offers to publish (`lib/agent/print-guidance.ts`). `get_product` says where a product's artwork stands.
- No Pantone code appears anywhere in this.

**Limits.**
- Embroidery has no print file to make, so an embroidered product needs no approval.
- A product made without a design can't be published, and can't be given a design later (`update_product` has no design field). It has to be made again from the artwork.
- `PRINT_MOCK=1` answers covered, like the other mocked approval calls.
- `scripts/commerce-smoke.ts` and `scripts/admin-smoke.ts` made products live through the proof and `publishProduct` with no design. They now set the status directly, and `scripts/products-smoke.ts` has no proof step. Edited, not run.

## Local demo (15 Oct, dev only)

Neon doesn't have migrations 0003 and 0004 and nothing here may touch it, so the build can run on a local database: a persistent PGlite (Postgres in WebAssembly) in a gitignored folder, filled by the real engine. `LOCAL_DB_DIR` switches it on. Production never uses it, and a `LOCAL_DB_DIR` found in a production environment is an error (`lib/dev/local-demo.ts`).

**Build** (from `platform/`; about 2 minutes, 3 to 4 GB of memory; the dev server must be stopped, the database takes one process):

```
npm run demo:local               # makes platform/.local-demo/ (db about 45 MB, print files about 450 MB)
npm run demo:local -- --reset    # wipes it and builds again
```

**Run:**

```
cd /path/to/blackout-merchandise-print-prep/platform
LOCAL_DB_DIR=$PWD/.local-demo/db PRINT_STORAGE_DRIVER=local PRINT_STORAGE_DIR=$PWD/.local-demo/print-storage \
  AUTH_DEV_BYPASS=1 NEXT_PUBLIC_APP_URL=http://localhost:3030 npx next dev --webpack -p 3030
```

Open http://localhost:3030 (it goes to `/dev`). `NEXT_PUBLIC_APP_URL` makes the shop links and the mock checkout's return page point here, not at the port in `.env.local`.

**People** (`lib/dev/identities.ts`; `/dev` lists them and its links sign in as the right one first, through the `mf_dev_as` cookie; the account menu and the admin sidebar have "Switch identity (dev)"): Owner (`dev@blackoutmerch.test`, the fixed dev user), Artist (Nova Halo, the Underwriter shop), and employees on the Pre-press (Ines Vidal), Production (Marc Soler) and Support (Laia Ferrer) presets. No cookie, an unknown key or a user the demo never made is the fixed dev user.

**What the build leaves** (two designs, T-shirt on black, French Navy and white, front chest 28 cm, through the real pipeline and services):
- *Underwriter* (`test_design.png`): approved by the artist, every pack approved by pre-press with Pantone codes, two live shop products with the engine's proofs as their pictures, a shipped shop order, a queued one, a screen-printed run on the press, and its job sheet.
- *Sunset star* (`flat-logo-3c.png`): ready for the artist to approve, one draft product (the publishing gate refuses it), a paid screen run on black whose Darks pack waits in pre-press with two inks coded and one not (the entry box shows).

**Works in the demo:** every page above, for each person; the fan shop and the mock checkout (pay, order status, the pack joins the queue); the Studio with the scripted assistant and the real tools ("Products", "Runs"); and the print worker, which runs inside the dev server (`instrumentation-node.ts`, the same loop and handler as `npm run worker`), so Run again, Pantone codes (the files are rewritten), Upload corrected PSD and a build that an order starts really run. Checked in a browser: a code typed and the pack approved, Run again, a corrected PSD uploaded, the artist's approval, a fan's checkout.

**Does not:**
- While a job runs the server is slow to answer (one process, the engine holds it): a full front takes about a minute.
- The assistant is the scripted mock, so `prepare_print` can't be asked for; builds start from the build script, a re-run, or an order that needs an unprepared colour.
- Image generation, uploads (fal), Clerk, Discord, ElevenLabs and Resend are off: emails are written to `platform/var/outbox/`. Stripe is the mock, its in-memory state resets on a restart (the shop's payouts stay "ready" from a database row).
- Stop the server with Ctrl-C or kill it: a hard kill recovers on the next start, and the lock file (`.local-demo/db.lock`) of a dead process is taken over.

**Guards:** every demo path asks `localDemoOn()` (not production, `LOCAL_DB_DIR` set). `lib/db.ts` opens PGlite on the first query, loads it with Node's own require, and points `DATABASE_URL` at an unresolvable address, the print storage at disk and `PRINT_MOCK` off, for the whole process. `/dev` and `/dev/as/<key>` are a 404 without `AUTH_DEV_BYPASS`, `next` only takes a path on this site, and `npm run seed` and `seed:print` seed the local database when `LOCAL_DB_DIR` is set.

## Owner actions before going live

1. **Neon:** apply `platform/drizzle/0003` and `0004` (`npm run db:migrate` from `platform/`). Then run `npm run seed`.
   - The seed adds the `dtf` service, its links to all 122 blanks and its base costs.
   - It resets base costs to the placeholder prices.
   - Then run `npm run seed:print` for the ink system.
2. **R2:**
   - Create a private bucket. Optionally create a separate public bucket for proofs.
   - Allow browser PUT from the app origin in CORS.
   - Add a lifecycle rule that deletes `prepress-uploads/` after a few days.
3. **Worker host:**
   - Build from the repo root (`docker build -f platform/worker/Dockerfile .`).
   - Use an EU host with 8 GB and a restart policy of always.
4. **Environment:**
   - App and worker: `DATABASE_URL`, `PRINT_STORAGE_DRIVER=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and optionally `R2_PUBLIC_BUCKET` and `R2_PUBLIC_BASE_URL`.
   - Worker only: `PACKSHOT_BASE_URL`, `FAL_API_KEY` (4K finals), and `RESEND_API_KEY` with `EMAIL_FROM`.
   - App only: `VOICE_BRIDGE_SECRET`.
   - Never set `PRINT_MOCK` in production.
5. **Clerk:** live keys, and check that the staff-invite account creation works with them.
6. **ElevenLabs:** when voice goes live, forward the `user_token` dynamic variable to the custom LLM, as a custom header or `customLlmExtraBody`.
7. **Test the samples:**
   - Open the screen PSDs in Photoshop: Alt-click each film's eye and print a film.
   - Open the DTG PNGs in GTX Graphics Lab, and print on a black and a white blank.
8. **Clean up:** remove or move `public/dev/print-mock/` (2.9 MB) if it isn't wanted on the CDN.

## Owner decisions needed

- Decided 15 Oct: the design approval replaces the per-product proof for shop products. Built.
