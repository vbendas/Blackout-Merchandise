# Font licences

Owner: WP3 / WP4 (Round 9 plan, decisions 4-5 and section 4.6). One entry per face: name, source, licence, who confirmed it.

`website-v3/scripts/verify/prod-guard.mjs` reads this file. It treats GC Grind as licensed only when the marker line below says `recorded` (set it together with the receipt details in the GC Grind entry). Until then a production build containing GC Grind fails the guard.

<!-- gc-grind-licence: pending -->

## Display candidates (gate G1, the `/dev/specimen` board)

- **GC Grind**: licence NOT recorded. Source file `website-v3/app/fonts/GCGrind.ttf`, from `grind-bold-condensed-fonts-2026-04-07-06-20-04-utc.zip`. The zip has no licence file; the name table says "(c) 2025 Glyphonic, all rights reserved"; only 12 of the 128 Latin Extended-A letters are present (Latin-1 accents, Œ/œ and Ÿ are; the specimen board marks any missing glyph). The owner supplies a receipt and a webfont licence with a pageview tier (decision 4), or the plan uses the runner-up. It is loaded only by the dev-only specimen (`website-v3/app/dev/specimen/faces.ts`), which is not part of a production build. To record it: change the marker comment to `gc-grind-licence: recorded` and replace this line with the licensor, licence type and pageview tier, receipt reference, and who confirmed it on which date.
- **Anton**: SIL Open Font License 1.1 (Google Fonts, via `next/font/google`). No confirmation needed.
- **Big Shoulders** (the "Display" cut is opsz 72 of this variable font; loaded as `Big_Shoulders`, the name Next 16's font data uses): SIL Open Font License 1.1 (Google Fonts).
- **Barlow Condensed 700** (current interim display face): SIL Open Font License 1.1.

## Mono candidates

- **JetBrains Mono**, **Space Mono**, **Martian Mono**, **IBM Plex Mono** (control): all SIL Open Font License 1.1 (Google Fonts, via `next/font/google`).

## Body

- **Barlow** (400/500): SIL Open Font License 1.1.

## Stamp layer

- **Mornsey**: owner confirmed it is licensed (decision 5, 6 Oct 2026). Source `Assets/Fonts/Mornsey-PUA.ttf`. Licensor, licence type and receipt reference are not in the repo: the owner adds them here when convenient. Cmap holes: only 12 of 128 Latin Extended-A letters (Œ/œ/Ÿ present), no inverted question and exclamation marks (the specimen board prints the per-locale result). Two copies exist: the dev-only `website-v3/app/dev/specimen/Mornsey-specimen.woff2` (WP3, never in a production build; the guard fails if a `specimen` font is emitted) and the production `website-v3/app/fonts/Mornsey.woff2` (WP6b, loaded only through `Stamp`).

## OFL notice

Fonts under the SIL Open Font License 1.1 are used as delivered by Google Fonts. The licence text is at https://openfontlicense.org. They are not sold on their own and keep their reserved font names.
