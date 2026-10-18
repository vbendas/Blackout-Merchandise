# Font licences

Owner: the static site in `mainpage/`. One entry per face: name, weights used, where used, licence, copyright, source. Verified against `fonts/fonts.css` and the CSS in the files named below (13 Oct 2026).

## Faces in use

All faces are self-hosted, so no visitor request goes to Google. Inter and IBM Plex Mono were downloaded from Google Fonts (13 Oct 2026, latin and latin-ext subsets, woff2) into `mainpage/fonts/` and declared in `mainpage/fonts/fonts.css`, which every page links (`fonts/fonts.css` or `../fonts/fonts.css`). None of the OFL faces needs a receipt.

- **Inter** (body and UI, weights 400 and 600): SIL Open Font License 1.1. Copyright 2016 The Inter Project Authors (Rasmus Andersson). Source: Google Fonts, https://github.com/rsms/inter. Files: `inter-latin.woff2` and `inter-latin-ext.woff2` (one variable file per subset, declared for 400 and 600). Set as the page font-family (with system fallbacks) on `mainpage/index.html`, `faq/`, `agents/` and `watch/`.
- **IBM Plex Mono** (mono: counters, flaps, tags, code, timecodes). SIL Open Font License 1.1. Copyright 2017 IBM Corp., with Reserved Font Name "Plex". Source: Google Fonts, https://github.com/IBM/plex. Weights per page:
  - 500 on every page (`ibm-plex-mono-500-latin.woff2`, `ibm-plex-mono-500-latin-ext.woff2`).
  - 400 for code blocks and endpoint values on `mainpage/agents/index.html` (`ibm-plex-mono-400-latin.woff2`, `ibm-plex-mono-400-latin-ext.woff2`).

## Stamp layer

- **Mornsey** (weight 400): a commercially licensed display face. Its licence does not cover redistribution, so the font file is not included in this repository. `mainpage/index.html` and `mainpage/watch/index.html` still declare it through `@font-face` (`fonts/Mornsey.woff2` and `watch/media/Mornsey.woff2`); without the file the printed marks fall back to Impact, Inter or system fonts. To use it, place your own licensed copy at those paths.

## OFL notice

Fonts under the SIL Open Font License 1.1 are used unmodified, as delivered by Google Fonts (subset files, self-hosted). The licence text is at https://openfontlicense.org. They are not sold on their own and keep their reserved font names.

Barlow was loaded only by the retired `mainpage/studio/` mock (deleted 13 Oct 2026); no page uses it now.
