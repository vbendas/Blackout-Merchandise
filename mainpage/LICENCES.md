# Font licences

Owner: the static site in `mainpage/`. One entry per face: name, weights used, where used, licence, copyright, source. Verified against the CSS and the Google Fonts `<link>` URLs in the files named below (11 Oct 2026).

## Faces in use

The Google Fonts faces are linked from the Google Fonts CSS API in each page's `<head>` (`fonts.googleapis.com`, with `fonts.gstatic.com` for the files). They are not self-hosted. Mornsey is the only face shipped as a file in this folder. None of the OFL faces needs a receipt.

- **Inter** (body and UI, weights 400 and 600): SIL Open Font License 1.1. Copyright 2016 The Inter Project Authors (Rasmus Andersson). Source: Google Fonts, https://github.com/rsms/inter. Linked as `Inter:wght@400;600` in `mainpage/index.html`, `mainpage/faq/index.html`, `mainpage/agents/index.html` and `mainpage/watch/index.html`. Set as the page font-family (with system fallbacks) on all four. Not loaded by `mainpage/studio/index.html`.
- **IBM Plex Mono** (mono: counters, flaps, tags, code, timecodes). SIL Open Font License 1.1. Copyright 2017 IBM Corp., with Reserved Font Name "Plex". Source: Google Fonts, https://github.com/IBM/plex. Weights per page:
  - `mainpage/index.html`, `mainpage/faq/index.html`, `mainpage/watch/index.html`: 500 (`IBM+Plex+Mono:wght@500`).
  - `mainpage/agents/index.html`: 400 and 500 (`IBM+Plex+Mono:wght@400;500`).
  - `mainpage/studio/index.html`: 400 (`IBM+Plex+Mono:wght@400`).
- **Barlow** (weights 400 and 500; weight 300 is banned): SIL Open Font License 1.1. Copyright 2017 The Barlow Project Authors (Jeremy Tribby). Source: Google Fonts, https://github.com/jpt/barlow. Loaded only by `mainpage/studio/index.html` (`Barlow:wght@400;500`), used for the studio hero (`font-family:Barlow,Arial,Helvetica,sans-serif`); the rest of the studio page falls back to Arial and system fonts. Not loaded by the other pages.

## Stamp layer

- **Mornsey** (weight 400): owner confirmed it is licensed (decision 5, 6 Oct 2026). Source `Assets/Fonts/Mornsey-PUA.ttf`. Licensor, licence type and receipt reference are not in the repo: the owner adds them here when convenient. Cmap holes: only 12 of 128 Latin Extended-A letters (Œ/œ/Ÿ present), no inverted question and exclamation marks. Two copies of the same file (byte-identical, `Mornsey.woff2`, loaded through `@font-face`):
  - `mainpage/fonts/Mornsey.woff2`, loaded by `mainpage/index.html` for the printed marks drawn over the blanks (the `.tee .print` text, the preview strip mark `.mp-strip .mark` and the thumbnail mark `.th .mk`) and the canvas print drawn by `drawLogo()` in the merch preview (via `fitText`/`drawCentered`, after `document.fonts.load('400 100px Mornsey')`), with `Inter` or system fonts as the fallback.
  - `mainpage/watch/media/Mornsey.woff2`, loaded by `mainpage/watch/index.html` for the stamp drawn on the tee-back canvas in the film page.

  `mainpage/faq/`, `mainpage/agents/` and `mainpage/studio/` do not load Mornsey.

## OFL notice

Fonts under the SIL Open Font License 1.1 are used as delivered by Google Fonts. The licence text is at https://openfontlicense.org. They are not sold on their own and keep their reserved font names.

Records for faces considered and retired during the earlier website rounds (display and mono candidates, and the unlicensed GC Grind) are in git history, in `design-tokens/LICENCES.md`.
