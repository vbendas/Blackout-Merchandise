# Roadmap

What is planned next for Blackout Merchandise. Each item comes from the existing planning docs and was checked against the code as not built yet. The detailed history and longer-term phases are in [Documentation/05-Roadmap/Roadmap.md](./Documentation/05-Roadmap/Roadmap.md) and [Documentation/Dev/Print-Prep-Plan.md](./Documentation/Dev/Print-Prep-Plan.md).

## Next up

- [ ] **Distress and texture library.** A library of distress and texture effects made from our own scans, for use in print prep (Print Prep Phase 3).
- [ ] **DTF gang sheets.** Lay out several DTF prints on one transfer sheet (Print Prep Phase 3).
- [ ] **Vectorise flat art.** Convert flat, few-colour raster designs to vector shapes before separation (Print Prep Phase 3).
- [ ] **RIP hot folders.** Hand finished print files to the printer software through watched folders (Print Prep Phase 3).
- [ ] **Per-ink screen angles.** Separations with a different halftone angle per ink, which needs a colour-mixing model that accounts for the angles (Print Prep Phase 3).
- [ ] **Embroidery prep.** Checks and conversion for designs that can be embroidered (solid shapes in solid colours); print prep currently covers screen printing, DTG and DTF only (Print Prep Phase 3).
- [ ] **MCP server for artists' own agents.** Serve the MCP endpoint described on the website's agents page, with tools for catalogue search, styles, design generation and mockups (`plans/2026-05-19_mcp-server-artist-tools.md`); the platform has no MCP server yet.
- [ ] **Style pick grid.** A one-time grid where an artist picks images they like, stored per user and used to choose the reference images in their Style Capsule (`Documentation/05-Shared/Image-Generation-Architecture.md`, section 6).
- [ ] **Shop SEO.** Sitemaps and structured product data for artist shops (Roadmap Phase 8.5).
- [ ] **Admin analytics.** Sales volume, artist retention and order satisfaction in the admin area (Roadmap Phase 7).
- [ ] **Social catalogue sync.** Push shop products to Meta and TikTok shop catalogues; Discord is already connected (Roadmap Phase 9).

## How items are picked

Work on the print pipeline comes first, because it is what turns a generated design into something the shop can print, and each item there removes a manual step that happens today. Items that need an outside decision, such as real prices or a printer test, wait until that check is done. Everything else is ordered by how directly it helps an artist sell a printed product. Image generation stays on hosted APIs; model training is out of scope.
