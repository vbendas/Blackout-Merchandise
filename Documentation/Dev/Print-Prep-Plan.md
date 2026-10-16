# Print prep: plan

16 Oct 2026. Phases 0, 1 and 2 built on branch feat/print-prep, pending integration review and the owner's checks. Phases 0 and 1 were built on 15 Oct, and the plan was updated that day with the owner's answers on the ink system, the surcharge, infrastructure and ink measurement.

**Goal.** Everything from "the artwork is final" to "the production files are on the press". Every design gets both production versions, DTG/DTF and screen print, generated automatically, checked by a person, and delivered ready to print with no further image processing.

**Sources.**
- Owner decisions of 14 and 15 Oct 2026 (session notes).
- The AutoThresh teardown in `Autotresh/` (gitignored, local only).
- An audit of `platform/` and of the old print services.
- Vendor documentation cited inline.
- Mocks of the approval screen, the pre-press queue and the pack detail (private canvas): https://claude.ai/artifact/KjrEr54cnVy6dLbTNq8YMM. Their images come from a rough prototype of the engine run on `Assets/test_design.png` (script in the session scratchpad, not in the repo).

## 1. Decisions

| Topic | Decision |
|---|---|
| Artwork paths | Three paths after the garment pick: (1) upload print-ready art; (2) upload art and iterate on it with Nano Banana 2 and the Style Capsules; (3) generate from scratch. |
| Approval | The client approves the artwork on mockups of the garments they picked. The mockups show what will actually print, not the RGB art. |
| Outputs | Every design gets both a DTG/DTF version and a screen-print version, because most artwork ends up used for both. |
| Channels | Shop products always print DTG/DTF (CMYK plus white). Screen print is only for runs (bulk orders), and a run can also be DTG/DTF. DTF is offered on every blank, including the bags, accessories, beanies and jackets that can't take DTG (owner, 15 Oct). |
| Separations | Automatic for every job. 1 to 8 screens is standard. The 8 includes the white underbase and the highlight white. A screen-printed run can go to 15 screens at €1 per piece for each screen above 8 (confirmed). The surcharge never applies to shop products. |
| Human check | A person audits every production pack before it goes to production. |
| Publishing | A product can't be published until its design is approved for that product's garment, colours and placement (owner, 15 Oct). |
| Job sheet | One per design, covering all the garments that use it (owner, 15 Oct). Made on demand and kept by a hash of what it says, so it is made again exactly when its contents change (section 6.3). |
| Shop prices | Each garment has its own base price for shop products (DTG/DTF), including one print area up to A2 on the front or the back. Extras: +€1 when the print becomes front and back; +€2 once for sleeve prints (one or both sleeves). Set in /admin/pricing (owner, 16 Oct). |
| Sleeve prints | Shown as a flat, true-size proof on a sleeve outline with measurements, next to the front and back mockups, until real sleeve photos exist (owner, 16 Oct). |
| Team access | The owner gives each employee their own access level for each admin area: pre-press, production, orders, runs, support and the rest (section 9). |
| Screen inks | Pantone colours. The shop doesn't stock colours: it mixes any Pantone from Magna Eco-Pigments in the MagnaPrint HB bases (HB Opaque or HB Neutral). On dark garments the inks print wet on wet over a flashed Aquaflex V2 White underbase (MagnaPrint HB data sheet). Pantone codes come from MagnaMix, which Magna licenses from Pantone, so no Pantone licence of our own is needed. Clients see only plain colour names. Pantone codes appear only in admin (pre-press, job sheet, films), where staff match them in MagnaMix (section 5). |
| Screen halftones | 600 ppi, 55 lpi. |
| DTG/DTF | 300 ppi. Fades and soft edges are halftoned at 45 lpi. |
| DTF printer | The Brother GTXpro, which prints both DTG and DTF. No separate RIP. |
| File format | Work like the shop's current tool, Separation Studio NXT: one PSD with every colour on its own layer, and the films printed one by one from that same file. The original artwork is kept inside the file. No NXT sample file is available, so the structure in 6.1 is final. |
| Infrastructure | Approved: Cloudflare R2 for files and a worker host for renders (section 12). |
| Ink measurement | A spectrophotometer will be ordered later. Until then, proofs use each ink's target colour from the art. |
| AutoThresh | Used as a behaviour reference only. The owner says they hold a commercial-use licence, but the wording isn't on file and the owner has parked the question. The engine is our own code, the textures come from our own scans, and nothing from `Autotresh/` ships. |

This plan supersedes the August decision log in `Documentation/06-Operations/ML-Training/Dataset-Pair-Generation-Guide.md:17` ("MVP: production separation stays human, Photoshop + Action Seps; services/color-separation frozen"). Separation is now automatic and a person audits the result. The dataset plan continues: every audit correction becomes a training pair (section 8).

## 2. Where things stand

**Built in `platform/`:**
- catalogue pick (up to 12 blanks);
- uploads with a readiness check;
- Nano Banana 2 generate, edit and compose through fal;
- 8 Style Capsules;
- sharp mockups on calibrated print boxes;
- proofs per product (`submit_proof`, `approve_proof`);
- bulk quote → proof → pay;
- a production status machine.

**Missing or wrong for this flow:**

| Area | Problem | Where |
|---|---|---|
| Resolution | Nano Banana 2 always runs at 1K, about 93 ppi at the 28 cm reference width. The platform's own readiness rule blocks anything under 100 ppi, but nothing after it enforces that. | `lib/services/fal.ts:130,176`, `lib/services/designs.ts:40,147` |
| Edits | Re-anchoring walks to the root design. Edits of composed or reference-guided designs therefore edit the logo or the first reference, and only the latest instruction is sent. | `lib/services/designs.ts:472-485,547,590` |
| Capsules | Prompt-only: no reference images, and `suggestedPrintTechnique` is never read. Three capsules ask the model to paint halftone dots, grain or misregistration. | `lib/services/style-capsules.ts` |
| Mockups | RGB art pasted at 92% opacity with a soft-light fold layer, output as 1200 px WebP. An unknown position (sleeve) silently falls back to the default. | `lib/services/mockups.ts:199-254`, `lib/mockups/placements.ts:135` |
| Approval | One proof per product, so 5 blanks means 5 approvals. The proof doesn't pin a version or a file. | `src/db/schema.ts:360` (`proofs`) |
| Techniques | No DTF. | `lib/catalog/product-details.ts:34-43` |
| Channels | A shop product can be created with any print service its blank offers, screen print included. A run of an existing product inherits the product's print service, so it can't be switched to screen print. | `lib/services/products.ts:249`, `lib/services/bulk.ts:236` |
| Admin access | All or nothing: one `admin` role from `ADMIN_EMAILS` or Clerk metadata, checked as `role === 'admin'`. No staff accounts and no access by area. | `src/db/schema.ts:8`, `lib/services/users.ts:15-28`, `app/(chat)/admin/layout.tsx:11` |
| After approval | No print files, no separations, no pre-press step. | (none) |
| Deployment | `public/` (313 MB) is traced into the agent function through `readFile(process.cwd()/public)`, which exceeds the function size limit. No job runner, and no storage beyond fal storage. | `lib/services/mockups.ts:40`, `lib/services/storage.ts` |

The old Python services (`services/color-separation`, `services/print-engine`, `services/mockup-generator`, `python/print_processor.py`) produce output that isn't printable. Keep their CIEDE2000 code and `Assets/test_design.png` as reference and test fixture. Don't extend them.

## 3. Workflow

1. **Pick.** The client picks blanks and garment colours. The pick becomes the drop brief: garments × colours × placement (position, width in cm, and how far the print is moved up or down from the standard place for that garment and position). The real distance below the collar is the standard collar distance plus that move, once the standard distance has been measured (`collarDistanceCm` in `lib/mockups/placements.ts`).
2. **Artwork.** One of the three paths. Rules for all of them:
   - Drafts render at 1K and the final renders at 4K, both before approval.
   - Anything that can change the look of the art (AI upscaling, regeneration, background removal) happens before approval.
   - After approval, only deterministic steps run.
   - The planned "4K NB2 re-render after approval" (`Documentation/05-Shared/Image-Generation-Architecture.md:126-132`) is dropped, because it regenerates details the client already approved.
3. **Print prep (automatic).** The engine runs both branches (section 4) for every chosen garment colour and placement, then renders the proofs from the print files themselves.
4. **Approval (Studio).** One approval per design covers both techniques and every garment colour (section 7).
5. **Order.**
   - A shop sale always prints DTG/DTF.
   - A run (bulk order) is screen printed or DTG/DTF, chosen when it's quoted.
   - A run on a garment colour that hasn't been approved generates that colour's version and goes through the existing bulk proof.
6. **Pre-press audit (admin).** A person checks the pack before its first production (section 8). Production can't start on an unaudited pack.
7. **Production.** The operator prints from the files with no further processing: films one by one from the screen PSD, or the DTG/DTF PNG on the Brother.

## 4. Print engine

### 4.1 Principles

- **One render path.** All parameters are physical units (mm, lpi, ppi, degrees). Previews and proofs are downsampled from the print-size render, never computed separately. AutoThresh's preview and export diverge (choke, blur and pattern scale are about 3.5× off at export; the palette changes; dither switches algorithm). This rule exists to prevent that.
- **Deterministic.** The same inputs (art version, recipe, garment colours, placement and ink system version) always produce the same bytes. Every output carries a hash of its inputs.
- **Recipe-driven.** Each Style Capsule carries a `printRecipe` (method, screen budget, halftone, underbase, traps, knockout tolerance). A design can override it, and so can the auditor.
- **Pure TypeScript.** The engine lives in `platform/lib/print/` as pure functions on typed arrays, using sharp for decode, encode and resampling. It runs in a background worker, never in a request.

### 4.2 Shared stages

1. **Normalise.**
   - Decode, convert to sRGB and keep the alpha.
   - Compute the print size from the placement.
   - Resample to the working resolution: 600 ppi for screen, 300 ppi for DTG/DTF.
   - Edges are thresholded after upsampling, so they stay smooth instead of turning into blocky pixels.
2. **Clean.**
   - Remove the background where the art has none.
   - Knock out the garment colour per garment colour (ΔE2000 tolerance in the recipe).
   - Denoise. AI art carries noise that turns into speckle.
   - Remove islands smaller than the smallest printable feature (default 0.25 mm).
   - Warn on lines thinner than 0.3 mm.
3. **Proof.** Render the print simulation from the final plates or the DTG layer, on the garment photo, with the garment's folds and shading. Then downsample it for the Studio.

### 4.3 Screen branch

1. **Screen budget.** The default is 8 screens, including the underbase and the highlight white. A dark garment therefore gets up to 6 colours plus the two whites. The recipe, the client (with the surcharge) or the auditor can raise it to 15. A job with more screens than the press has heads is flagged on the job sheet (press profile: 8 heads today).
2. **Method.** Chosen automatically, with the reason shown to the auditor:

   | Method | When | Output |
   |---|---|---|
   | Spot | Flat art whose colour clusters fit the budget, with little smooth shading (7 of the 8 capsules) | Exact ink shapes, traps, halftoned tints only where the art has tints |
   | Index | Bright, many-colour art without large smooth gradients | Square-pixel dither (default 200 ppi cells), one ink per cell, no overlap |
   | Simulated process | Gradients, photos, painted art | Continuous coverage per ink, then AM halftone |

3. **Inks.**
   - Extract the art's colours with weighted k-means in OKLab, merging near duplicates. Anti-aliased edge colours fold into their neighbours instead of becoming inks.
   - Name each colour with a Pantone code from the house library, by ΔE2000 (section 5). The palette is open because the shop can mix any Pantone, so the engine picks the N colours that reproduce the art best rather than choosing from a stock list.
   - The garment colour counts as a free ink.
   - Every ink goes to production with its Pantone code and its HB base, ready for MagnaMix. Clients see only a plain colour name (section 5).
4. **Coverage.**
   - Spot: label each pixel with its nearest ink, then build hard masks.
   - Index: error-diffuse in OKLab over the ink set plus the garment.
   - Simulated process: invert the print model. Build a 3D lookup table from art colour to ink coverages by fitting the same model that draws the proofs: the ink colours (target colours from the art until measured), the opacity of each base (HB Opaque or HB Neutral), the underbase and the garment. Then apply the table per pixel. The separation and the proof therefore come from the same model.
5. **Whites (dark garments).**
   - The underbase is the union of the inks that need a base, weighted by ink opacity. It is choked by 0.2 mm (default) and halftoned where the art fades.
   - The highlight white covers the brightest areas and goes on last.
6. **Traps.** For spot: spread the lighter ink under the darker one by 0.25 mm (default). For index and simulated process: none, because the halftones and cells overlap by design.
7. **Halftone.**
   - AM threshold screen at 600 ppi, 55 lpi, 22.5° on every ink by default (angle per ink is configurable), with a round dot (elliptical optional).
   - Coverage passes through a dot-gain compensation curve (comes from Ink system → Dot gain calibration; linear until a chart is measured) and a min/max dot clamp (default 5% and 90%).
   - Output is binary: 0 or 255.
8. **Print order.** Underbase, flash, colours from light to dark by L*, highlight white last. The auditor can reorder; the traps are recomputed.
9. **Marks.**
   - Identical registration targets at the four side centres, 15 mm outside the art.
   - A label strip in the margin of every plate: design code and version, placement, `3/8`, Pantone code and HB base, lpi and angle.
10. **Screen sets.**
    - Garment colours that can share screens are grouped: usually one set for darks with underbase and one for lights.
    - A garment colour joins a set when the shared plates proof within the ΔE target on it.
    - A drop on black and navy then burns one set of screens.

### 4.4 DTG/DTF branch

1. **Knock out** the garment colour, per garment colour.
2. **Make alpha strictly 0 or 255.** Hard edges (a band of 1 to 2 px) are thresholded at 50%. Wider partial-alpha areas (fades, glows, soft shadows) are halftoned at 45 lpi. The Brother then never lays white under semi-transparent pixels, which is what causes halos.
3. **Handle whites.** Brother GTX Graphics Lab prints pure white (RGB 255) as white ink. On dark garments the art's whites stay RGB 255 and print white. On white garments they become transparent (no ink).
4. **Output.** sRGB, 300 ppi, cropped to the art bounds. The placement is recorded in the job sheet.
5. **DTF.** The same file. DTF on the GTXpro goes through Brother's DTF print path, which handles mirroring and the white layer (to confirm when the printer is set up; a Fiery listing names Digital Factory Apparel Brother Edition as the GTXpro DTF driver).
6. **Optional, set in the recipe.** For screen-look styles, the DTG layer can be the halftoned screen version, so on-demand and bulk tees match.

## 5. Ink system

The shop doesn't stock colours. It mixes any Pantone from Magna Eco-Pigments (up to 9%) in the MagnaPrint HB bases. The engine's palette is therefore the Pantone library, not a stock list.

**Ink system profile.** Editable in admin. The defaults come from the MagnaPrint HB data sheet.

| Setting | Default |
|---|---|
| Colour base, light garments | HB Neutral (translucent, mock-discharge look) |
| Colour base, dark garments | HB Opaque, printed wet on wet over the underbase |
| Underbase | Aquaflex V2 White, flash cured (4 s at 230 °C) |
| Highlight white | Aquaflex V2 White, last screen |
| Mesh | 62-120T (158-305). Halftone plates at 55 lpi want the finer end, and the job sheet suggests a mesh per plate. |
| Cure | 2 to 2.5 min at 165 °C |

**Pantone codes come from MagnaMix.** Magna licenses Pantone for its mixing software, and the shop uses that system as a Magna customer, so there's no Pantone licence of our own to get. Licences like Magna's cover Pantone inside the licensed software. Pantone's standard terms keep the colour data inside the licensed product. So the platform never stores Pantone's colour table. It doesn't need to.

**Where codes appear.**
- Pantone codes appear only in admin: the pre-press pack, the job sheet and the film labels. That's where staff match them in MagnaMix.
- Clients see only a plain colour name for each ink, from our own short list (such as orchid pink, indigo or deep purple). They never see a Pantone code or a Pantone name.
- This keeps Pantone inside the MagnaMix workflow that Magna licenses.

**The house library.** The platform keeps its own list of Pantone codes the shop has used: each code with the colour it was picked for and, once measured, its printed value.
- The engine picks each ink from the art and shows its colour (hex and Lab).
- When the library has a close match, the engine names the ink with that code automatically.
- When it doesn't, pre-press picks the Pantone in MagnaMix, which takes seconds per ink. The platform remembers it, so the next close colour is named automatically.
- When the spectrophotometer arrives, swatches of the shop's mixes printed on its own blanks give each code a measured value on cotton. That predicts the print better than Pantone's paper values would.
- Optional: ask Magna whether customers may also use the Pantone colour values in their own software. If they may, the engine can suggest any Pantone from day one. Nothing waits on the answer.

**Proofs before measurement.** Until the spectrophotometer arrives, proofs use each ink's target colour from the art, with the opacity of the base (Opaque or Neutral) and the garment underneath. They carry an "inks not measured" flag. Measured values replace the targets as the library fills.

## 6. Production pack

The pack is generated per design version and placement. The job sheet is not part of a pack: there is one per design, covering all its garments (6.3).

### 6.1 Screen PSD

One PSD per screen set and placement. Films are printed one by one from the same file, as they are with NXT today.

- **Document.** RGB, 8-bit, 600 ppi. The canvas is the print area plus a 25 mm margin.
- **Layers, top to bottom:**

  ```
  MF-UNDERWRITER-v3-FRONT-DARKS.psd
  ├─ 6/6  Highlight white · Aquaflex V2 White · 55 lpi 22.5°
  ├─ 5/6  PANTONE 186 C · HB Opaque · 55 lpi 22.5°
  ├─ …
  ├─ 1/6  Underbase · Aquaflex V2 White · flash · 55 lpi 22.5°
  ├─ GARMENT · Black, GARMENT · French Navy    (hidden, preview only)
  └─ ORIGINAL (do not print)                   (hidden, locked smart object)
  ```

- **Plates.** Each ink is one layer of black dots on transparency. It is halftoned (0 or 255), trapped and choked, and carries the identical reg marks and its own label strip. A layer printed as it is gives the film.
- **Colour preview.**
  - Each plate layer also has a colour overlay in its ink colour, switched off. Switching effects on and showing a garment layer previews the print in colour.
  - The file is delivered with effects off, so a plate always prints black.
  - If a corrected file comes back with effects on, the engine switches them off again.
- **Printing a film.** Option-click (Alt-click on Windows) a plate's eye icon to show only that layer, print, then move to the next plate.
- **Original.** `ORIGINAL (do not print)` is a smart object holding the untouched approved artwork, so a designer can open it and rework it.
- **Library.** `ag-psd` writes all of this (layers, layer colours, effects, smart objects), so there's no custom PSD writer.
- **Size.** A full front with 8 plates at 600 ppi should land at a few hundred MB, under the 2 GB PSD limit. That's an estimate, to be measured in Phase 1.

### 6.2 DTG/DTF files

- **PSD.** `DTG-DTF.psd`: RGB, 8-bit, 300 ppi.
  - One layer per garment colour (`DTG/DTF on Black`), treated as in 4.4.
  - Garment fill layers for the preview.
  - The same `ORIGINAL` smart object.
- **PNG.** One per garment colour, which is what Brother GTX Graphics Lab opens. Graphics Lab reads PNG, JPEG, BMP and GIF, and only PNG carries transparency. Each PNG is RGBA with sRGB embedded, 300 ppi set in the file, alpha strictly 0 or 255, and cropped to the art.

### 6.3 Job sheet and manifest

- **Job sheet (one per design, A4 landscape PDF).** One sheet covers every garment that uses the design, for its current approved version: the version the artist approved, else the newest with files (the rule orders find their files by). It is made by `lib/services/job-sheets.ts` and drawn by `lib/print/pack/job-sheet.ts`. Its sections, in order:
  1. **Header:** design code and version, the artist's approval date, and the pre-press status of the design's files.
  2. **Garments:** every shop product (live or with its proof out, plus any with an open sale) and every line of an open run. Each row has the blank (name and code), garment colour, placement (position, width in cm, and height: the distance below the collar once the standard collar distance for that garment and position is set, otherwise "Standard position" and how far the print was moved from it, with a note under the table), method (DTG/DTF, or screen with its set, Darks or Lights), and the file to use: the screen PSD of the set, or the DTG PNG of the colour. A row with no file yet says so.
  3. **Screen sets**, one block per set: inks in print order with their Pantone code and HB base; lpi and angle; suggested mesh per film; flash after the underbase; cure settings; underbase choke and traps; and the screen count against the press heads. A light garment's set has no underbase or highlight white, so it doesn't list them.
  4. **DTG/DTF files**, per garment colour: size, offset, and what happens to whites and fades.
  5. **Proofs:** a thumbnail per garment colour and technique.
  6. **Checks:** what passed as one line of titles per file; what needs a person (review, failed) spelled out.
  7. **Pieces waiting:** quantities by garment, colour and size, added up from the open orders for the design at the time the sheet is made (paid and not yet packed: shop sales and runs), with the order or run references.
  8. **Audit sign-off:** each file's audit state, who approved it and when, and blank lines for the pressroom.
- **When it is made.** On demand, never by a schedule or a hook. Each time someone opens a sheet, the service works out what it would say, hashes that, and looks for the PDF stored under the hash (`job-sheets/<design id>/<hash>.pdf`). If it's there it is served; if not, it is drawn and stored. So the sheet is made again exactly when its contents change: an order paid or packed, a garment added, a Pantone code entered, a pack approved or replaced, the ink system edited. The stored PDFs are a cache: they can be deleted at any time and are made again on the next open.
- **Who opens it.** Pre-press View or Production View, or the owner. It's linked from the pack page, the production table and the order card (for people with that access), and downloaded from `/api/job-sheets/<design id>`.
- **`manifest.json`.** The pack's own data in machine-readable form, plus the hash of every file and of the inputs.

### 6.4 Automatic checks (every pack, every re-upload)

Each file is re-opened with a decoder independent of the writer and must pass:

| Check | Rule |
|---|---|
| Size | Pixel size equals print size × ppi, and the ppi metadata agrees |
| Plates | Every plate is binary, neither empty nor solid, and its coverage matches the engine's render |
| Marks | Reg marks are identical on every plate and clear of the art |
| Screens | At most 15. More than 8 is flagged for the surcharge; more than the press heads is flagged for planning. |
| Features | No island or line below the printable minimum |
| DTG alpha | Strictly 0 or 255, with no garment-coloured pixels left in knocked-out areas |
| Whites | On white garments no RGB 255 is left (it would print white ink) |
| Proof | The print render, downsampled, matches the approved proof (SSIM threshold) |

AutoThresh shipped solid films, opaque "transparent" PNGs and all-black PSD composites without noticing (9 of 30 test exports were wrong). These checks are what make "ready to print" true.

## 7. Approval (Studio)

- **Scope.** One approval per design covers every product that uses it, replacing per-product artwork proofs. The existing bulk proof stays for bulk orders.
- **Two tabs:** "Shop products · DTG/DTF" (how every shop product prints) and "Runs · screen print". Each tab shows the print simulation on every chosen garment colour and placement, with:
  - a true-scale toggle and a 1:1 loupe to see the dots;
  - on the runs tab, ink chips with plain colour names (never Pantone codes), and the screen count with its price effect (€1 per piece for each screen above 8);
  - warnings (e.g. navy ink on a black tee, lines too thin).
- **Publishing.** A product can't be published until its design is approved for that product's garment, colours and placement. Existing approvals don't cover a colour or garment added later; those need their own approval.
- **What approval records.** The design version, the recipe, the ink set, garment colours, placements and the pack hashes. If the pack later changes in a way the proof check can see, approval is invalidated and the client is asked again (section 8).
- **Agent tools.**
  - New: `prepare_print` (run the engine), `get_print_proof`, `approve_design` (confirm-gated), `change_screen_count`.
  - `approve_proof` stays for bulk proofs.

## 8. Pre-press audit (admin)

- **Queue.** `/admin/prepress` lists packs waiting for audit. A pack enters the queue when the first order needs it: the DTG/DTF pack with the first shop sale or DTG/DTF run, the screen pack with the first screen-printed run. Option: audit at approval for priority clients.
- **The auditor sees** every plate, the proofs on each garment colour, the check results and the engine's choices (method and why, inks and ΔE, screen sets).
- **Actions:**
  - Approve.
  - Re-run with changes: method, screen count, ink substitution, lpi or angle, choke, traps.
  - Download the PSD, fix it in Photoshop and upload it back. The upload is parsed, the exports are regenerated from it, and the checks re-run. The design's job sheet shows the new pack the next time it is opened.
  - Send back to the client with a note.
- **Re-approval rule.** If the corrected proof differs from what the client approved beyond the threshold (an ink change, for example), the client re-approves. Minor fixes don't need it: specks, traps, choke.
- **Training pairs.** Every correction stores the automatic pack and the corrected pack as a pair, which feeds the dataset plan.
- **Who can do this.** Only staff with the right access to Pre-press (section 9).

## 9. Team and permissions (admin)

The owner gives each employee their own access, area by area. Today admin is all or nothing:
- `users.role` is `artist` or `admin` (`src/db/schema.ts:8`);
- admins come from the `ADMIN_EMAILS` list or Clerk metadata (`lib/services/users.ts:15-28`);
- 19 tools are scoped `admin` (`lib/tools/registry.ts:46`);
- pages and actions check `role === 'admin'` (`app/(chat)/admin/layout.tsx:11`, `app/(chat)/admin/actions.ts:13`).

This section applies to the whole admin, not only print prep.

**Roles.**
- **Owner** (today's `admin`) has everything, including the team and money. There is always at least one owner.
- **Staff** is an employee, who sees and does only what their access allows.
- **Artist** is unchanged.

**Levels.** For each area, the owner picks one level per employee. Each level includes the ones before it:
- **None:** the area is hidden.
- **View:** see it.
- **Work:** do the daily tasks.
- **Manage:** also change settings and do the costly or irreversible things.

**Areas.**

| Area | Work allows | Manage adds |
|---|---|---|
| Pre-press | Approve packs, upload corrected PSDs, enter Pantone codes, run again, send back to the artist | Engine defaults, ink system profile |
| Production | Advance production, add tracking, draft supplier orders | Production settings |
| Shop orders | Handle order issues | Refunds and cancellations |
| Runs | Prepare quotes and proofs | Run prices and discounts |
| Support | Reply to, assign and close tickets | Support settings |
| Applications | Approve or reject artists | Invite codes |
| Shops and artists | Help with products and domains | Suspend a shop |
| Catalogue and pricing | Edit blank details | Prices and print services |
| Money | View only | Payout and Stripe settings |
| Team | Owner only | Owner only |

**Presets.** Pre-press, Production, Support and Operations lead are starting points. The owner adjusts each person from there, so every employee can have their own mix.

**How it's enforced.**
- One server check, `can(session, area, level)`, lives in `platform/lib/auth/permissions.ts`.
- Every admin tool declares its area and level instead of `scope: 'admin'`. The assistant only gets the tools that employee may use, so it never offers what they can't do.
- Admin pages, server actions and API routes run the same check.
- The sidebar shows only the areas the person can see.
- The cross-shop checks that test `role === 'admin'` today (support, commerce, domains) move to the same check.
- A changed access level applies from the employee's next request. Removing someone ends their sessions.

**Invites.**
- The owner adds an employee by email and picks their access.
- The employee signs in through the normal door and lands in the admin with their areas.
- Staff accounts skip the artist registration (`lib/auth.ts:66`).
- `ADMIN_EMAILS` remains only to set up the first owner.

**Activity log.** Every staff action is recorded: who, what, which area and when. It builds on `lib/services/tools-audit.ts`, which today logs only actions taken through the assistant, so page actions are added. The owner can see it per employee and per item, for example who approved a pack.

**Screen.** `/admin/team` holds the employee list, invites, each person's grid of areas and levels, suspend or remove, and their activity. It gets a mock first, for the owner to approve.

## 10. Pricing

- **Shop products** always print DTG/DTF. Each garment has a base price that includes one print area up to A2, front or back; a second main print (front and back) adds €1 and sleeve prints add €2 once. The owner sets them in /admin/pricing, and artists see the breakdown when they add print areas. The screen surcharge never applies to them.
- **Runs** are screen printed or DTG/DTF. A screen-printed run is priced on screen count (both whites included), placements, print size and quantity. 1 to 8 screens is standard. From 9 to 15, each screen above 8 adds €1 per piece, so 12 screens add €4 per piece (confirmed 15 Oct).
- **Separations set the count.** The quote takes the screen count from the actual separations, not from the print service the client picked.
- **The Studio shows the effect.** It shows how the screen count changes the price, and the agent can offer fewer screens.
- **Seed prices go.** The placeholder screen-print prices in `platform/scripts/seed.ts` (screen_1c to screen_3c) are replaced by this rule.

## 11. Data model (Drizzle, `src/db/schema.ts`)

| Table | Purpose |
|---|---|
| `design_versions` | Immutable art versions: design, version number, art URL, sha256, size, source, parent version |
| `print_recipes` | Defaults per capsule plus overrides per design: method, max screens, lpi, angle, dot shape, choke, trap, min/max dot, DTG lpi, knockout tolerance |
| `ink_systems`, `pantone_library` | The ink system profile, and the house Pantone library: codes picked in MagnaMix, the colour each was picked for, and measured values once available (section 5) |
| `print_jobs` | Engine runs: input hash, recipe snapshot, garment colours, placement, status, timings, outputs. Also the job queue (section 12). |
| `production_packs` | Per design version, placement and technique: files, screen sets, screen count, check results, audit status, auditor, `corrected_from` |
| `design_approvals` | Design version, pack hashes, approved by, approved at |
| `users.role` | Gains `staff`. The owner stays `admin`. (section 9) |
| `staff_permissions` | One row per employee and area: user, area, level |
| `staff_invites` | Email, chosen access, invited by, accepted at |
| `staff_activity` | Who, area, action, item, when (page actions; assistant actions stay in `tool_invocations`) |
| `products.placements` | The print areas (16 Oct): `{ position, widthCm, offsetYcm?, designId }`, each with its own design. At most one front, one back, and the sleeves on garments with sleeves; each area at most A2 (a sleeve: its own size). Migration `0005` copied each product's one `placement` and its design into it; the old column is read as a fallback and no longer written. `products.design_id` is the first area's design. |
| `products.base_cost_lines` | What `base_cost_cents` is made of (podPrice): the garment with one print, front and back, sleeve prints. Both are taken again whenever the areas change, and at publish. |
| `product_colours.mockup_views` | The front and back mockups of each colour, every area on its side. A sleeve's picture is its flat proof from the print files. |

## 12. Infrastructure

Approved by the owner on 15 Oct.

- **Worker.** A Node 20 process (`platform/worker/print-worker.ts`) runs the same `lib/print` code. It pulls jobs from `print_jobs` with `FOR UPDATE SKIP LOCKED`, so no queue vendor is needed. A full-front render at 600 ppi with 8 plates needs a few GB of memory and runs for tens of seconds to minutes, which rules out request handlers. It runs on an EU container host with 4 to 8 GB of memory, chosen at setup.
- **Storage.** PSDs run to hundreds of MB, which suits neither fal storage nor Cloudinary. Files go to Cloudflare R2 (S3 API, no egress fees) behind the existing `lib/services/storage.ts` interface.
- **Packshots.** The mockup packshots move out of `public/` into storage. That also fixes the function size problem.

## 13. Studio changes this needs

- Final render at 4K before approval; drafts stay at 1K (`fal.ts` already supports `2K` and `4K`).
- Edits work on the current version, not the root, and send the edit history.
- Capsules:
  - add `printRecipe` and anchor images;
  - remove the painted halftone, grain and misregistration from the Riso, Halftone and Photocopy prompts, because print prep applies those effects deterministically;
  - generate each prompt's colour clauses from the recipe.
- Mockups come from the engine's proofs. Placement changes re-render them. A sleeve print is offered on garments with sleeves and shown as a flat, true-size proof (never on a photo); a position a garment doesn't take is refused, never silently moved.
- Ownership checks on `render_mockups` and `preview_on_blank`.
- DTF added to the techniques list.
- Shop products accept only DTG/DTF for print. Embroidery, where a blank offers it, is outside this plan.
- Runs choose screen print or DTG/DTF when they're quoted, instead of inheriting the product's print service.

## 14. Phases

Estimates are rough working days, for ordering only.

**Phase 0: prerequisites**

| Task | Size |
|---|---|
| Ink system profile seeded from the MagnaPrint HB data sheet | 0.5 d |
| R2 bucket and worker skeleton with the job table | 1-2 d |
| Test fixtures: `Assets/test_design.png`, one sample per capsule, a photo, a flat logo | 0.5 d |

**Phase 1: both outputs for flat art, end to end**

| Task | Size |
|---|---|
| Studio fixes: 4K finals, edit anchor, capsule recipes and prompts (section 13) | 2-3 d |
| Engine core: units, colour, clean, knockout, halftone, marks, proof render | 4-6 d |
| DTG/DTF branch and PNG export | 2 d |
| Spot separations: inks, traps, underbase, highlight white, screen sets | 4-5 d |
| Pantone codes from the house library (admin only; pre-press picks them in MagnaMix, the platform remembers) and plain colour names for clients | 1-2 d |
| PSD writer on `ag-psd` (plate layers, effects, smart object) and reader for re-uploads | 2-3 d |
| Job sheet, manifest, checks | 2-3 d |
| Schema, migrations, agent tools | 2-3 d |
| Approval screen with two tabs (mock first, owner approves) | 4-5 d |
| Audit queue with upload and re-check (mock first, owner approves) | 3-4 d |
| Team and permissions: staff role, the `can()` check across tools, pages and actions, invites, activity log, `/admin/team` (mock first, owner approves). Needed before employees use pre-press. | 4-6 d |

Art that needs index or simulated process is flagged to the auditor in Phase 1 and handled manually in NXT.

**Phase 1 acceptance:**
- Every fixture produces a pack that passes all checks.
- The screen PSD opens in Photoshop and the films print one by one, as with NXT.
- The PNG opens in GTX Graphics Lab and prints with correct transparency and white.
- A test print matches the proof closely enough for the owner to sign it off.
- An employee with Work access to Pre-press and nothing else can approve packs, can't see Money or Team, and isn't offered tools outside that access by the assistant.

**Phase 2: any art up to 15 screens**

| Task | Size |
|---|---|
| Index separations (built) | 3-4 d |
| Simulated process (print-model lookup table) (built) | 6-10 d |
| Dot-gain calibration from a printed test chart (built) | 2-3 d |
| Pricing by screen count with the 9-15 surcharge (built) | 2 d |

**Built after Phase 2 (16 Oct)**
- **Shop prices.** Each garment has a base price for shop products (DTG/DTF), with one print area up to A2 on the front or the back. A print on both front and back adds €1, and sleeve prints add €2 once (section 10).
- **Several print areas per product.** A product can have a front, a back and sleeve prints, each with its own design (section 11).
- **Sleeve prints.** A flat, true-size proof on a sleeve outline, with measurements, until real sleeve photos exist.

**Phase 3**
- Distress and texture library from our own scans.
- DTF gang sheets.
- Vectorising flat art.
- RIP hot folders.
- Per-ink screen angles (needs a mixing model for different angles).
- Embroidery prep. Only solid designs in solid colours can be embroidered, so embroidery needs its own checks and conversion. Left for later (owner, 15 Oct).

## 15. Risks

| Risk | Mitigation |
|---|---|
| Proofs miss the real print until the inks are measured | Target colours plus base opacity; "inks not measured" flag; the auditor; the test print in acceptance; the spectrophotometer later |
| Few codes in the house Pantone library at launch | Pre-press picks codes in MagnaMix; every pick is remembered, so the library grows with each job |
| PSD compatibility with Photoshop and with how the operator prints films | Test-open on the operator's machine; print the films of the first test job from it; PSD round-trip test |
| File size at 600 ppi with up to 15 plates | RLE or ZIP compression in the writer; measure in Phase 1; PSB if a file passes 2 GB |
| Brother white and transparency behaviour | Test prints on black and white blanks in Phase 1 |
| AI art noise and thin lines | Clean stage, feature checks, the audit |
| Simulated process quality | Phase 2 work; the auditor; NXT fallback until it's ready |
| A page, action or tool left without a permission check | One `can()` check; an admin tool can't be registered without an area and level; a test fails if any admin page or action skips the check |

## 16. Owner tasks

Answered on 15 Oct:
- No NXT sample file. The structure in 6.1 is final.
- Inks are Pantone colours mixed from Magna pigments.
- €1 per piece for each screen above 8, up to 15, on screen-printed runs only.
- Shop products are always DTG/DTF. Screen print is only for runs.
- R2 and the worker host are approved.
- The spectrophotometer comes later.
- Pantone is covered through MagnaMix (Magna licenses it), so there's no Pantone licence to get.

Open (optional): ask Magna whether customers may use the Pantone colour values in their own software (section 5).

## 17. Docs to update after approval

- `Documentation/PRD.md`: the print-prep architecture decision, and staff roles and permissions.
- `Documentation/06-Operations/ML-Training/Dataset-Pair-Generation-Guide.md`: decision log (separation automatic, audit corrections become training pairs).
- `Documentation/05-Shared/Image-Generation-Architecture.md`: drop the post-approval 4K regeneration.
- `Documentation/DEVLOG.md`.

## Vendor sources

- Brother GTX Graphics Lab manual (file formats, transparency, RGB 255 as white): https://garmentprinter.global.brother/-/media/ap2/gt/support/manual/manual-graphicslab.pdf
- MagnaPrint HB range data sheet (bases, underbase, mesh, flash, cure, pigments): https://jonespt.com.au/wp-content/uploads/2025/04/MagnaPrint-HB-Range-TDS-0123.pdf
- Separation Studio NXT, Save (PSD contents): https://solutionsforscreenprinters.com/sep-studio-nxt-guide/top-bar-buttons/save/
- Pantone licence terms as a licensee ships them (data kept inside the licensed product): https://documentation.globalgraphics.com/hqnc/copyright-notices-and-trademarks
- Brother GTXpro DTF driver listing: https://shop.fiery.com/en-gb/product/brother-gtx-pro-bulk-gtx-600-dtf-printer-driver/
- ag-psd 31.0.3 capabilities (RGB only, no spot channels; layers, smart objects, PSB): https://unpkg.com/ag-psd@31.0.3/README.md
