# Print prep build: status (integrated, 15 Oct 2026)

Worktree: `/Users/victorbendas/Documents/GitHub/Merch-From-print-prep`, branch `feat/print-prep` (from `22678b3`). Nothing is committed. Migrations `0003` and `0004` have run only on PGlite in tests, never on Neon.

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

## Verification (final run)

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

## Samples (`print-prep-samples/`, gitignored)

Each fixture is a T-shirt, front chest at 28 cm, on Black, French Navy and White. Each fixture folder holds `screen-darks/`, `screen-lights/` and `dtg-dtf/`, plus `index.json` (checks and what each file re-opened as). The Pantone codes are placeholders typed for the sample, not matches for the colours.

| Fixture | Screen PSDs (600 ppi) | DTG/DTF PSD (300 ppi) | DTG PNGs | Run | Peak memory |
|---|---|---|---|---|---|
| flat-logo-3c | darks 21.4 MB (4 films), lights 15.6 MB (3) | 4.5 MB | 0.03–0.15 MB, zip 0.3 MB | 24 s | 2.3 GB |
| tints-2c | darks 30.8 MB (5), lights 23.8 MB (4) | 16.0 MB | about 0.25 MB each, zip 0.7 MB | 33 s | 2.1 GB |
| test_design | darks 134.8 MB (8), lights 132.2 MB (8) | 76.2 MB | 7.9–10.3 MB, zip 28.4 MB | 93 s | 3.1 GB |

**What every pack contains**
- A job sheet per design, not per pack (see "Job sheet: one per design" below): the packs hold no sheet.
- `manifest.json`: hashes of every file.
- Proofs (webp), loupes and film previews.

**What the checks found**
- Every check passes or asks for review.
- "Inks not measured" asks for review on every screen pack, as the plan expects.
- test_design asks for review on its method: it needs simulated process, so the engine made a spot draft.
- Thin-line and speck notes appear on soft art, and on flat-logo's navy film.

**Regenerate** from `platform/`:
- `npx tsx scripts/print-samples.ts flat-logo-3c ../print-prep-samples`
- the same for `tints-2c` and `test_design`.
- Run one fixture per process.

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
- Soft art gets a spot draft only: index and simulated process are Phase 2.

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
cd /Users/victorbendas/Documents/GitHub/Merch-From-print-prep/platform
LOCAL_DB_DIR=$PWD/.local-demo/db PRINT_STORAGE_DRIVER=local PRINT_STORAGE_DIR=$PWD/.local-demo/print-storage \
  AUTH_DEV_BYPASS=1 NEXT_PUBLIC_APP_URL=http://localhost:3030 npx next dev --webpack -p 3030
```

Open http://localhost:3030 (it goes to `/dev`). `NEXT_PUBLIC_APP_URL` makes the shop links and the mock checkout's return page point here, not at the port in `.env.local`.

**People** (`lib/dev/identities.ts`; `/dev` lists them and its links sign in as the right one first, through the `mf_dev_as` cookie; the account menu and the admin sidebar have "Switch identity (dev)"): Owner (`dev@merchfrom.test`, the fixed dev user), Artist (Nova Halo, the Underwriter shop), and employees on the Pre-press (Ines Vidal), Production (Marc Soler) and Support (Laia Ferrer) presets. No cookie, an unknown key or a user the demo never made is the fixed dev user.

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
