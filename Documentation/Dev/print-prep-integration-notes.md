# Integration notes for WP10 (collected from WP reports)

All items below were applied or decided by WP10 on 15 Oct 2026; see print-prep-build-status.md for what was done and what the owner still has to do.

- WP6: port the seed test /private/tmp/claude-501/-Users-victorbendas-Documents-GitHub-Merch-From/7ca60e71-9b6a-4e8d-8331-289386da2c99/scratchpad/wp6/seed-pglite.test.ts into scripts/test (frozen area, WP10 owns). Seed inserts only when no active ink_systems row.
- WP6: colour names exported as clientColourName (contract name), COLOUR_NAMES, CLIENT_COLOUR_NAMES.
- WP8: add "components/**/*.test.ts" to the package.json test globs (WP8 has 34 tests in components/studio/approve/).
- WP8: no Undo yet. WP7 was asked to add revokeApproval (only while no order has used the packs). Wire Undo in components/studio/approve/ApprovalBox (WP8 files) once it exists.
- WP8 asked WP7: PrintProofCard approveHref = /studio/approve/<designId>?from=<sessionId>; approveDesign re-checks owner, version and readiness itself and returns sentence errors.
- Neon users table lacks WP0's new columns (dev server on the real tree errors until the migration is applied). Ask the owner before applying 0003 to Neon.
- WP5: add to schema/migration: CREATE UNIQUE INDEX print_jobs_active_hash_unique ON print_jobs (input_hash) WHERE status IN ('queued','running'); (closes the enqueue race; WP5 code ready).
- WP5: R2 untested against the real service; worker Dockerfile not built. Env names: PRINT_STORAGE_DRIVER, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BUCKET, R2_PUBLIC_BASE_URL, R2_ENDPOINT, PRINT_STORAGE_DIR, PACKSHOT_BASE_URL, PACKSHOT_PUBLIC_DIR, PRINT_JOB_*, PRINT_WORKER_*, LOG_LEVEL.
- Corrected PSD upload goes direct to storage (presigned PUT; Vercel 4.5 MB body cap). WP5 adds createUploadUrl, WP9 uses upload-url + upload-done routes, WP7 uploadCorrectedPsd(session, packId, storageKey). Verify the three fit.
- WP7 must make handlePrintJob idempotent per input hash.
- WP4 requests for unowned files (WP10 does them):
  1. migration: UPDATE print_services SET available_in_shop = false WHERE code LIKE 'screen_%'; (and true for dtg/dtf; check the dtf row exists or is seeded) — else the shop rule waits for a reseed.
  2. lib/services/proofs.ts submitProof: before insert `const blocked = await shopMethodError(productId); if (blocked) return {ok:false, error:blocked};`
  3. scripts/{products,admin,commerce}-smoke.ts: PRINT_SERVICE = 'dtg'.
  4. lib/agent/pick-server.ts:121: guidance "print DTG unless DTF is asked".
  5. lib/services/blanks.ts: return print service codes, not only names.
- WP4 API: finaliseDesignForPrint(storeId, designId) (slow; worker). UnknownPositionError from resolvePrintArea (WP5 told to handle in mockups.ts).
- OWNER QUESTION: 48 of 122 blanks offer neither DTG nor DTF (families A, B, W, J: accessories/bags/beanies/jackets per TECHNIQUES), so as shop products only embroidery qualifies. Should DTF be offered on bags/accessories (DTF works on totes, caps)? Raise in final report.
- WP3 requests for unowned files (WP10 does them):
  1. proxy.ts: add 'staff-invite' to APP_SEGMENTS.
  2. app/api/agent/suggest/route.ts: pass `permissions: session.actor.permissions, suspended: session.actor.suspended` to suggestFor.
  3. lib/services/voice.ts dev-bypass branch: `devRole: parseUserRole(process.env.AUTH_DEV_ROLE)` instead of publicMetadataRole.
  4. After WP7 exports getOrderForStaff(orderId): wire get_order cross-shop read at Shop orders View (WP3 owns lib/tools/commerce.ts; WP3 done -> WP10).
- WP3: admin gate test scans all admin pages/actions/routes; WP9's zz-fixtures page must be deleted or gated (WP9 told).
- WP3: staff Clerk account created at invite time (stubbed in tests) - real Clerk call at runtime; verify env/keys before going live.
- OWNER DECISION (15 Oct): DTF on all blanks incl. bags/accessories/beanies/jackets (WP4 resumed to apply). Embroidery later (solid designs + solid colours only).
- WP4 DTF follow-up done: DTF on all 122 blanks (was 74). Placements: all types have positions, but beanie/bucket-hat boxes reuse the bag table (unverified) and joggers STBU157/STBU185 only partly overlap the box -> owner to check those mockups later.
- WP4 request 4 (pick-server.ts, unowned) wording: "DTG, or DTF where the blank has no DTG".
- WP1 (engine) done: 42 tests + 1 opt-in perf; full front 38x46 cm at 600 ppi, 8 plates: separation 8.9 s, proof+loupe 2.0 s, DTG 1.0 s, peak 1.3 GB. ENGINE_VERSION exported; relabelPlate(), targetBoxes(), deltaE2000 + hex/Lab helpers exported.
- WP1 request (frozen types.ts, WP10): optional `garments?: GarmentColour[]` on ScreenSet so the screen loupe knows the shirt colour for sets rebuilt from an uploaded PSD.
- WP1 limits: opacities are guesses; index/sim flagged with spot draft; zero-plate set (black on black) -> WP2 skips PSD (told); partial underbase quarter steps may halftone UB under mid-tones.
- WP5 follow-up done: createUploadUrl({ actor, key, contentType, maxBytes, expiresIn?, contentLength? }) -> { url, method:'PUT', headers, key, expiresAt }; PermissionError unless can(actor,'prepress','work'); keys only under prepress-uploads/ or uploads/prepress/. R2 SigV4 presigned PUT (contentLength pins size); local one-time PUT at /api/print-files/<key> with x-upload-token. mockups.ts: tryRenderDesignOnBlank / tryRenderProductMockups return {ok:false,error,positions} for sleeve. next.config raises dev proxy body cut-off only. npm test 420/420 at that moment.
- WP9 done: 146 tests + WP3's 21 gate tests pass; tsc 0 project-wide at that moment; zz-fixtures deleted; upload-url / upload-done / status routes.
- WP9 requests: package.json test globs add "app/**/*.test.ts" "components/**/*.test.ts" (WP8 + WP9 tests don't run under npm test today!). After WP7 adds DTG PNG download, unapprovePack and PackFilmView.dotShape/ppi -> wire into WP9's page (Download PNGs, Undo on approved banner, film details).
- Turbopack crashes in this worktree (symlinked root node_modules) -> dev uses `next dev --webpack`. For `next build`: if Turbopack fails on the symlink, replace the symlink with a real root install or build with --webpack; verify the real build path used in production (Vercel builds from a normal checkout).
- Deploy/infra (owner): R2 bucket CORS for browser PUT from the app origin.
- WP2 done: 44 tests; whole suite 430 pass at that moment, tsc 0 platform-wide. Sizes (28x33.6 cm, 600 ppi, 8 films, 4K original): RLE 193 MB (272 MB all halftoned), ZIP 109/156 MB but 3-5x slower and unreadable by the independent decoder -> RLE default. Write 2.5 s, checks 10-17 s, +1 GB RAM. PSB past 2 GB or 30,000 px. Smart object ORIGINAL embeds the approved art (WebP/AVIF re-encoded losslessly to PNG).
- WP2 limits: proof thresholds uncalibrated; thin-line check skips hairlines within 1.2 cells of other ink; @webtoon/psd PSB embedded-file length quirk worked around; NOT yet opened in Photoshop or GTX Graphics Lab -> owner test.
- WP2 requests for WP10: (3) next.config.ts serverExternalPackages: ['pdfkit','ag-psd','@webtoon/psd'] if any route renders sheets or reads PSDs; (4) contract types.ts: new check id 'structure', optional JobSheetInput.recipe.
- WP7 done: items 1-8 + WP1/WP2/WP9 follow-ups. tsc 0 project-wide; npm test 475 (474 pass, 1 skipped benchmark). New: real engine+pack through pipeline (lib/print/pipeline.real.test.ts).
- WP7 APIs: print-prep.ts preparePrint, getApprovalView, approveDesign, revokeApproval(session, designId), changeScreenCount; prepress.ts listPrepressQueue, getPackDetail, approvePack, unapprovePack(who, packId), rerunPack, uploadCorrectedPsd(who, packId, storageKey) (worker job), sendBackToArtist, markPacksNeededForOrder, assertPacksApprovedForOrder; getOrderForStaff (orders.ts); 13 tools.
- Wire into WP9 page: PackDetailView.downloadUrl = PNG zip for DTG/DTF (null on old packs) + new psdUrl; PackFilmView.dotShape ('round'|'ellipse') + ppi -> ScreenWorkbench reads film.dot: switch to dotShape; Undo on approved banner -> unapprovePack.
- Wire into WP8 page: Undo -> revokeApproval; add ApprovalView.canRevoke (print-prep.ts) so Undo hides itself when not allowed.
- WP7 contract requests: PackFileKind add 'dtg_zip' (zip lives in manifest.pipeline.pngZip); optional production_packs.meta jsonb to replace manifest.pipeline (judge: only if low-risk).
- WP7: emails for print.sent_back and print.reapproval (in-app only now) - add if simple, else list as follow-up.
- Deploy (owner): uploadCorrectedPsd needs the worker running; R2 lifecycle rule for prepress-uploads/.
