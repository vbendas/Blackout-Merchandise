# Print prep: build (Phase 0 and Phase 1)

15 Oct 2026. The build plan for `Documentation/Dev/Print-Prep-Plan.md`, Phases 0 and 1, run as parallel work packages (WP) by subagents. WP0 (the contract: schema, types, stubs, dependencies, test harness) is done. WP1 to WP9 run in parallel on top of it. WP10 integrates and reviews, and WP11 updates the docs.

- **Worktree:** `/path/to/blackout-merchandise-print-prep`
- **Branch:** `feat/print-prep`, from `22678b3`
- **Platform:** `./platform`
- **Shared schema:** `./src/db/schema.ts`

## Rules for every work package

**Where you work**
- Work only inside the worktree.
- Never edit `/path/to/blackout-merchandise`: other sessions use that tree. You may read the AutoThresh behaviour docs in `/path/to/blackout-merchandise/Autotresh/docs` (read-only; clean-room: behaviour only, never its code or assets).
- No `git commit`, `git push`, branch changes or stashes. WP10 and the owner decide what gets committed.

**Data and services**
- No database writes to Neon. Never run `db:migrate`, `db:push`, `npm run seed*` or the `scripts/*-smoke.ts` scripts: they write to the shared Neon database, and the new tables don't exist there yet.
- Database tests use PGlite through `scripts/test/pglite.ts`.
- No real external calls: no fal (`FAL_API_KEY` is set, and every call costs money), no Anthropic, Stripe, Clerk admin API, Resend or R2. Write code so the network parts sit behind small functions you can stub, and test the logic around them.
- `next dev` and `next build` are optional for visual checks and touch Neon through `requireUser()`. Use `PRINT_MOCK=1 AUTH_DEV_BYPASS=1` and a free port (WP3: 3023, WP8: 3021, WP9: 3022). Skip the visual check if a page needs tables Neon lacks; tests and types are enough. WP10 runs the full build.

**Files**
- Edit only the files your WP owns (table below).
- If you need a change in a file you don't own, don't make it. Put it under "Requests" in your report, with the exact change.
- `package.json` and `package-lock.json`: WP0 only. If you need a new dependency, ask in your report.
- `src/db/schema.ts` and `platform/drizzle/**`: WP0 only (WP10 after). Request schema changes in your report.
- `lib/print/types.ts` is the frozen contract. Request changes in your report; never rename fields others consume.

**Next.js**
- This is Next.js 16: read `platform/AGENTS.md`, and check `platform/node_modules/next/dist/docs` before using a Next API (route params are Promises; server action body limit is 1 MB, so large uploads go through route handlers).

**Style**
- Match the surrounding code: naming, comment density (comments say why), small focused modules, and a `ServiceResult` type local to each service file. Use British spelling as the code does (colour, catalogue). No emojis.
- **UI identity, monochrome:**
  - black ground, white text, white-alpha greys (80% and 50%), 16% hairlines, 2px radius;
  - Inter for text, IBM Plex Mono for labels;
  - ecru `#ECE5DA` plates behind garments;
  - states read through weight, borders and fill, never hue;
  - tap targets 44px or more, real buttons, links and labels.
- **Studio UI standard:**
  - a chat-style top bar (`PageTopBar` in the Studio, `AdminPageHeader` in the admin), full width;
  - one left sidebar only;
  - horizontal tabs or dropdowns for sub-navigation;
  - pages, not modals, for browsing.
- Area CSS lives in a `.css` file next to its components, in `@layer components`, imported by the page (as `components/studio/billing/billing.css` is). Don't edit `app/globals.css` or `components/chat/tokens.css`.
- **Copy:** plain words, sentence case. Say "shop" and "run" to artists. Clients never see Pantone codes: they see the plain colour names from `lib/print/colour-names.ts`. Pantone codes appear only in the admin, the job sheet and the films.
- **Approved mocks** (private canvas https://claude.ai/artifact/KjrEr54cnVy6dLbTNq8YMM; the owner called them "perfect"). Copies are in `Documentation/Dev/print-prep-mocks/` in this worktree:
  - `approve-artwork.dc.html`: the approval page;
  - `prepress-queue.dc.html`: the queue;
  - `pack-detail.dc.html`: the pack detail.

  Their `/_blob/` image URLs don't resolve locally; the same images are in `platform/public/dev/print-mock/`. `engine-prototype-gen.mjs` is the rough prototype that made them: a reference for the approach, not code to copy as is.

**Dev mock mode**
- With `PRINT_MOCK=1`, the print services return the sample views in `lib/print/mock-views.ts`, so the pages can be built before the pipeline exists.
- WP7 keeps those branches when it implements the real paths.

**Tests**
- Use `node:test` via `tsx`. `npm test` runs `lib/**/*.test.ts`, `scripts/test/**/*.test.ts` and `worker/**/*.test.ts`; put tests next to the code.
- **DB tests:**
  - call `setupTestDb()` from `scripts/test/pglite.ts` first, then `await import()` the services; `lib/db.ts` picks up the injected client at import time;
  - each test file runs in its own process;
  - `seedUser()` makes users and stores.
- `DATABASE_URL= npm test` must pass, which proves nothing touches Neon.

**Done means**
1. `npx next typegen && npx tsc --noEmit` reports 0 errors (in `platform/`).
2. `npx eslint <the files you changed>` is clean.
3. Your tests pass, and `npm test` passes as a whole.
4. A report of 300 words or fewer with these headings:
   - Files changed
   - What works, and how it was tested
   - Open issues
   - Requests: changes needed in files you don't own, with the exact diff

## Work packages

| WP | Model | Scope |
|---|---|---|
| 0 Contract | Opus | Schema plus migration `0003_print_prep_and_staff`, `lib/print/types.ts`, stubs, dependencies, PGlite harness, this doc. **Done.** |
| 1 Engine | Opus | Colour (OKLab, CIEDE2000), units, decode and resample, clean and knockout, morphology, AM halftone, spot separation (palette, edge folding, traps, underbase plus choke, highlight white, screen sets), method chooser (flags index or sim for the auditor in Phase 1), DTG/DTF prep, marks and label strips, proofs and loupes |
| 2 Pack | Opus | Screen PSD (black-dot plate layers with colour overlays switched off, hidden garment fills, ORIGINAL), DTG/DTF PSD, DTG PNG, film previews, PSD reader for corrected uploads, manifest, checks through independent decoders, job sheet PDF |
| 3 Permissions and team | Opus | Roles, `can()` everywhere (tools, pages, actions, routes), the agent loop gate, staff tools on `access`, invites, activity log, `/admin/team`, the admin shell and nav |
| 4 Studio and channels | Sonnet | 4K final before approval, edit anchoring plus history, capsule `printRecipe` plus prompt fixes, sleeve refused never moved, ownership checks on mockup tools, DTF technique plus a `dtf` service, shop products DTG/DTF only, runs choose their method |
| 5 Infra | Sonnet | Print storage (R2 plus local), job queue, worker plus Dockerfile, the print-files route, packshot loader, function trace fix |
| 6 Fixtures and data | Haiku | Print fixtures, `seed-print.ts`, client colour names |
| 7 Pipeline, services, tools | Sonnet | Job handler, print-prep and prepress services, Pantone house library, ink system service, artist and staff tools, print proof card, prompt guidance, order hook, production gate |
| 8 Studio approval page | Sonnet | `/studio/approve/[designId]` from the approved mock |
| 9 Admin pre-press pages | Sonnet | `/admin/prepress`, `/admin/prepress/[packId]`, `/admin/ink-system`, and the corrected-PSD upload route |
| 10 Integration and review | Opus | After 1–9: full typecheck, lint, tests and build; fix seams; security review of permissions |
| 11 Docs | Haiku | PRD, DEVLOG, roadmap, plan status, dataset guide decision log, image-generation architecture note |

## File ownership (exclusive)

Paths are relative to `platform/` unless they start with `/`. A glob owns new files under it too.

| WP | Owns |
|---|---|
| 1 | `lib/print/engine/**`, `lib/print/defaults.ts` |
| 2 | `lib/print/pack/**` |
| 3 | `lib/auth/permissions.ts` (+ test), `lib/auth.ts`, `lib/services/team.ts`, `lib/services/users.ts`, `lib/services/registration.ts`, `lib/services/conversations.ts`, `lib/services/support.ts`, `lib/tools/types.ts`, `lib/tools/registry.ts`, `lib/tools/admin.ts`, `lib/tools/waitlist.ts`, `lib/tools/support.ts`, `lib/tools/commerce.ts`, `lib/tools/domains.ts`, `lib/tools/menu.ts`, `lib/agent/loop.ts`, `lib/agent/guidance.ts`, `lib/agent/system-prompt.ts`, `lib/agent/suggest.ts`, `lib/admin/nav.ts`, `lib/emails/staffInvite.ts` (new) and `lib/emails/index.ts`, `app/api/agent/route.ts`, `app/api/agent/confirm/route.ts`, `app/api/agent/history/route.ts`, `app/api/voice/llm/route.ts`, `app/(chat)/admin/page.tsx` (new: send /admin to the first allowed page), `app/(chat)/admin/layout.tsx`, `app/(chat)/admin/actions.ts`, `app/(chat)/admin/production/**`, `app/(chat)/admin/supplier/**`, `app/(chat)/admin/team/**`, `app/(chat)/studio/layout.tsx`, `app/register/**`, `app/staff-invite/**`, `components/admin/AdminShell.tsx`, `components/admin/team/**`, `components/admin/ProductionTable.tsx`, `components/admin/SupplierTable.tsx`, `components/admin/DraftFromQueuedButton.tsx`, `components/studio/StudioSidebar.tsx`, `components/studio/StudioSidebarProvider.tsx` |
| 4 | `lib/services/fal.ts`, `lib/services/designs.ts`, `lib/services/style-capsules.ts`, `lib/tools/design.ts`, `lib/mockups/placements.ts`, `lib/tools/mockups.ts`, `lib/services/products.ts`, `lib/tools/products.ts`, `lib/services/bulk.ts`, `lib/tools/bulk.ts`, `lib/services/quotes.ts`, `lib/catalog/product-details.ts`, `scripts/seed.ts` |
| 5 | `lib/services/print-storage.ts`, `lib/services/packshots.ts`, `lib/services/mockups.ts`, `lib/print/jobs.ts`, `worker/**`, `next.config.ts`, `app/api/print-files/**`, `platform/.gitignore` |
| 6 | `scripts/fixtures/print/**`, `scripts/seed-print.ts`, `lib/print/colour-names.ts` (+ test) |
| 7 | `lib/print/pipeline.ts`, `lib/print/mock-views.ts`, `lib/services/print-prep.ts`, `lib/services/prepress.ts`, `lib/services/pantone-library.ts`, `lib/services/ink-system.ts`, `lib/services/orders.ts`, `lib/services/production.ts`, `lib/tools/print.ts`, `lib/tools/prepress.ts`, `lib/tools/labels.ts`, `lib/agent/print-guidance.ts`, `components/cards/PrintProofCard.tsx` |
| 8 | `app/(chat)/studio/approve/**`, `components/studio/approve/**` |
| 9 | `app/(chat)/admin/prepress/**`, `app/(chat)/admin/ink-system/**`, `app/api/prepress/**`, `components/admin/prepress/**`, `components/admin/ink-system/**` |
| frozen (WP0, then WP10) | `lib/print/types.ts`, `lib/db.ts`, `lib/ui-cards/schemas.ts`, `components/cards/CardSwitch.tsx`, `components/admin/AdminPageHeader.tsx`, `scripts/test/**`, `public/dev/print-mock/**`, `/src/db/schema.ts`, `drizzle/**`, `package.json`, `package-lock.json` |

Everything else is unowned. Don't touch it; ask in your report.

## Interfaces

The stubs exist and compile. Each throws `not implemented: WPn` until its owner fills it. Signatures are the contract; implement them exactly or request a change.

**Engine (WP1, `lib/print/engine/index.ts`).**
- Functions:
  - `decodeArt(bytes)`
  - `separateScreen(SeparationInput) → ScreenSeparationResult`
  - `prepareDtg(DtgInput) → DtgResult`
  - `renderScreenProof(set, ProofRequest, inks)`
  - `renderDtgProof(layer, ProofRequest)`
  - `renderScreenLoupe(set, garmentCode, inks, sizeMm?)`
  - `renderDtgLoupe(layer, garmentHex, sizeMm?)`
  - plus `ENGINE_VERSION`. All are async.
- Plates are 1 byte per pixel (255 is ink) at `recipe.screenPpi`, on the full canvas (print area plus `marks.marginMm`), with the marks and label strip already drawn in.
- `InkPlate.clientName` comes from `clientColourName()`. `pantone` stays null; the pipeline fills it from the house library.
- Phase 1 builds spot separations. When the art needs index or simulated process, return a best-effort spot draft with `needsManual: true` and the reason.
- Budget: a full front at 600 ppi with 8 plates in about 2 minutes or less, under 3 GB. Use typed arrays, work plate by plate, and no per-pixel objects.

**Pack (WP2, `lib/print/pack/index.ts`).**
- Functions:
  - `writeScreenPsd`
  - `writeDtgPsd`
  - `writeDtgPng`
  - `renderFilmPreview`
  - `readScreenPsd`
  - `buildManifest`
  - `runChecks`
  - `renderJobSheet`
- Layer names follow Plan 6.1, e.g. `2/6  PANTONE 186 C · HB Opaque · 55 lpi 22.5°`, or the role label (`Underbase`, `Highlight white`) when there is no code.
- Verified in WP0:
  - `ag-psd` writes and reads in Node after `initializeCanvas(() => { throw … }, (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }))`;
  - `effects.solidFill[0].enabled = false` round-trips;
  - `@webtoon/psd` (ESM, layers listed top first) parses the result, so use it as the independent decoder in checks.
- Use `pngjs` for the PNG checks, `pdfkit` to write the job sheet and `pdf-lib` to re-open it.
- ORIGINAL goes in as a smart object through `placedLayer` + `linkedFiles`. If that can't be made reliable, use a hidden locked raster layer and say so in your report.
- Use PSB (the `psb` option) only past 2 GB.

**Permissions (WP3, `lib/auth/permissions.ts`, client-safe).**
- `can()` and `requirePermission()` are real now. `AREAS`, `LEVELS`, `PRESETS` and the labels are final unless requested.
- `Actor` is `{ userId, role, permissions?, suspended? }`. `lib/services/team.ts` `loadActor(userId, role)` loads staff permissions; its stub gives staff no access.
- `ToolContext` has optional `permissions` and `suspended`; `Tool` has `access?: { area, level }`.
- WP3 moves the 19 tools scoped `admin` to scope `staff` with `access`, makes the registry hand out tools by `can()`, and re-checks in `executeToolCall` and `resumeAgentTurn` before a tool runs.
- **Tool access map:**
  - `admin_queue` production:view (filter its items by `can()`)
  - `list_production` production:view; `advance_production` and `set_tracking` production:work
  - `list_supplier_orders` production:view; `draft_`, `place_` and `receive_supplier_order` production:work
  - `list_payout_anomalies` money:view; `review_payout` money:manage
  - `list_base_costs` catalogue:view; `set_base_cost` and `update_shipping_zone` catalogue:manage
  - `list_waitlist` applications:view; `approve_` and `reject_waitlist` applications:work
  - `list_tickets` support:view; `resolve_ticket` support:work
  - `refund_order` shop_orders:manage
  - cross-shop reads in commerce shop_orders:view; cross-shop domains shops:work
  - `get_ticket` and `reply_ticket` support:view and support:work when the caller isn't the ticket's owner.

**Storage and jobs (WP5).**
- `print-storage.ts`:
  - `printKey(designId, version, ...parts)`;
  - `putObject`;
  - `getObject`;
  - `objectUrl(key, visibility, { expiresInSeconds?, download? })`;
  - `deleteObject`.
- The driver comes from `PRINT_STORAGE_DRIVER=local|r2`; it defaults to `local` when the `R2_*` variables are missing. The local root is `.data/print-storage` (gitignored).
- Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.
- Private objects are only served through `app/api/print-files/[...key]`, which checks `can(actor, 'prepress', 'view')`.
- `packshots.ts`: `loadPackshot(blankCode, colourCode, position)`.
- `jobs.ts`:
  - `enqueuePrintJob` (dedupes on the input hash);
  - `claimNextPrintJob(workerId)` (`FOR UPDATE SKIP LOCKED`);
  - `completePrintJob`;
  - `failPrintJob` (backoff, `max_attempts`);
  - `getPrintJob`;
  - `hashJobInput`.
- `worker/print-worker.ts` loops claim → `handlePrintJob` → complete or fail, with graceful shutdown.

**Data (WP6).** `clientColourName(hex)` must give these results (from the approved mock):

| Hex | Name |
|---|---|
| `#ED90DC` | Orchid pink |
| `#C363DA` | Violet |
| `#5456AC` | Indigo |
| `#3E0E61` | Deep purple |
| `#18181A` | Black |
| `#F2F2F0` | White |

`scripts/seed-print.ts` upserts the active `ink_systems` row from `DEFAULT_INK_SYSTEM`. Make it runnable and test it on PGlite; don't run it against Neon.

**Services (WP7), consumed by the UIs.**
- **print-prep.ts:** `ApprovalView` with:
  - garments;
  - proofs per technique and colour;
  - loupes;
  - DTG facts;
  - screen sets with client ink names;
  - warnings, status and `canApprove`.

  Functions: `preparePrint`, `getApprovalView`, `approveDesign`, `changeScreenCount`.
- **prepress.ts:**
  - `listPrepressQueue(actor, { tab, search })` returns rows and counts;
  - `getPackDetail(actor, packId)` returns a `PackDetailView` with tabs, films (with `pantone`, `clientName`, `needsPantone`, `suggestion`), proofs, DTG files, engine choices, checks, history and `rerunDefaults`;
  - `approvePack`, `rerunPack`, `uploadCorrectedPsd` (returns an `UploadOutcome` with `needsReapproval`) and `sendBackToArtist`;
  - `markPacksNeededForOrder(orderId)` (never throws) and `assertPacksApprovedForOrder(orderId)` (the production gate).
- **pantone-library.ts:** `suggestPantone(lab, maxDeltaE?)`, `assignPantone(actor, { packId, plateIndex, code })`, `listPantoneLibrary`, and `normalisePantoneCode` (real).
- **ink-system.ts:** `getActiveInkSystem()` and `updateInkSystem(actor, profile)` (Pre-press Manage).
- **Call sites:**
  - WP4 calls `markPacksNeededForOrder` in `services/bulk.ts` `markBulkPaid` after the order row exists;
  - WP7 calls it in `services/orders.ts` `markPaid`, and gates `services/production.ts` `advance` from `queued` with `assertPacksApprovedForOrder`.
  - Staff page actions call `recordStaffActivity(actor, …)` from `services/team.ts`.

**Studio (WP4), for WP7.**
- `designs.ts` exports `finaliseDesignForPrint(storeId, designId)`. It returns the print-resolution art: a 4K render for generated or edited designs, and the upload as-is otherwise.
- Edits anchor on the current version and send the edit history.
- Capsules carry `printRecipe: RecipeOverride`.

**Cards and prompt.**
- The `print_proof` card is in `lib/ui-cards/schemas.ts` and `CardSwitch`; WP7 builds the real `PrintProofCard`.
- `lib/agent/print-guidance.ts` (WP7) holds `ARTIST_PRINT_GUIDANCE` and `STAFF_PRINT_GUIDANCE`. `system-prompt.ts` (WP3) appends them; keep that when changing the role logic.

**Admin shell.**
- WP3 turns `app/(chat)/admin/layout.tsx` into the left-sidebar shell of the approved mocks, built from `lib/admin/nav.ts` and filtered by `can()`.
- Admin pages render `AdminPageHeader` plus their body.

## Notes for WP10

- **Migration:** `drizzle/0003_print_prep_and_staff.sql` is additive (new enums, new tables, `user_role` gains `staff`, three new columns with defaults). It has not been applied to Neon; ask the owner first.
- **Dev-only images:** `public/dev/print-mock/` (2.9 MB) is for development. Remove it before deploying, or move it.
- **Main-tree merge:** `platform/app/globals.css` has uncommitted owner changes in the main tree, so nobody edits it here.
