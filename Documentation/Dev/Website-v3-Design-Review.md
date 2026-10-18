> Status: review · 6 Oct 2026 · read-only audit of `website-v3/` (plus `platform/` and `aurora-dashboard/` as the app bridge).
> Method: 7 reviewers (typography, colour & material, components & system, layout & pages, motion, Aurora template, art direction), each fact-checked adversarially; refuted claims removed. Screenshot names (`home-desktop-NN` etc.) refer to the scroll-through captures taken on 6 Oct 2026 at 1440x900 and 390x844, kept in `v3-review-shots-2026-10-06/scroll/`.
> Owner decisions taken after this review: Pressroom Terminal direction, hazard-orange accent, display face via specimen test, Mornsey cleared as a stamp layer. Implementation plan: `Website-v3-Round9-Pressroom-Terminal-Plan.md`.

# Blackout Merchandise website-v3: consolidated design review

Scope: read-only review of website-v3, with the platform app and the Aurora template as the bridge. Seven reviewers contributed. Refuted claims are removed and "partly" claims are corrected. Citations are repo-relative file:line, or screenshot names from the scroll captures.

## 1. Diagnosis

V3 is well built but speaks the wrong dialect. Its grammar is fashion and editorial (Our Legacy, Kinfolk), not metal, hardcore, tattoo, festival or agent-tooling culture. Five causes, strongest first.

1. **The tech half of the pitch is not on screen.**
   - No screen shows the assistant, a mockup, a quote or the app, anywhere in home-desktop-00..14.
   - The only tech moment is the Agents mono table (home-desktop-11/12), and its STATUS row says "Soon" (en.ts:268). The one proof point advertises a non-live endpoint.
   - The brief composer that sells the AI sits about 1.8 viewports below the fold. It is a single-line `<input>` that truncates its own placeholder (Cover.tsx:198, home-desktop-01, home-mobile-00).
   - The fold shows a wordmark, a mono facts row and a photo. The value proposition is a 12px mono line ("Premium merchandise for artists.", en.ts:31).
2. **The display voice is polite.**
   - Barlow Condensed 600 (masthead, globals.css:463-473) and 700 (outline word) are clean, rounded, DIN-like. They sit above photos of death-metal logo tees (home-desktop-00) that are far louder than the type.
   - Light weights and tracked caps are the strongest fashion-magazine signal in type: 300-weight, centred statements (globals.css:625-628, 692-702), 12px tracked mono labels, and 1px outlined words (globals.css:531-534).
   - There is no tension and no texture. The mono is stock IBM Plex Mono, which reads corporate dev-docs.
3. **The ground and the material are heritage-luxury.**
   - Ecru #ece5da with warm brown-black is a heritage and wellness palette (globals.css:56-66).
   - Paper, raised and surface are the same tone, so everything is one flat plane. Hairlines are 1.3:1.
   - Nothing looks printed, photocopied or cloth-made beyond the CSS halftone.
   - "No accent colour" (globals.css:4) leaves no brand signal and no live or agent state.
4. **One device is repeated.** Giant outlined or fitted words carry the cover, CLOTH, ZERO, APPLY, the page words and the footer. Four inner pages share one two-column template. The result is rhythm without variety.
5. **The system is not systematised, so the problem cannot be fixed in one place.**
   - There are about six button shapes, three input specs and about 210 inline style sites.
   - `--font-display` points at Barlow, not the condensed face (globals.css:36-38), so catalog and gallery headings are a different voice from home.
   - The platform forks the palette and font: tokens.css redeclares `--paper #221f1c` and Helvetica over the site's #141414 and Barlow.

Corrected framing: the home is roughly half ink already (black hero, ZERO, Shop & Run, Agents, footer). The cream problem is the home middle plus every inner page. The plan's "Issue 01 / Autumn-Winter" framing is in Redesign-Plan.md (lines 332, 380) but is not in shipped code. The shipped residue is the INDX.nn labels and the cream surfaces.

## 2. Keep

- **Halftone B&W photography of real tattooed people in metal and hardcore tees.** This is the most on-scene asset. Halftone.tsx and globals.css:487-510 stay. The hover-to-tone idea is good.
- **The fitted edge-to-edge condensed BLACKOUT MERCHANDISE masthead on black** (home-desktop-00) and the FittedWord mechanic. It works with any heavier face once the width factor is retuned.
- **Ink bands cutting the paper** (`data-theme='ink'`, globals.css:73-84). Black is the right alt base.
- **Token architecture.** `--paper`/`--signal` re-scoped per theme means a swap is mostly token work. Primary text contrast is excellent: 14.27:1 on paper, 14.69:1 on dark.
- **Set List** (SetList.tsx, home-desktop-06/07). It is the closest thing to a walkthrough.
- **The ink-block button with squeegee wipe** (globals.css:893-957), the link draw-underline, and the outline-to-ink fill as signature motion. All are silkscreen metaphors.
- **Mono SKU, spec and numbered-row captions.** Good raw material for the tech half.
- **The copy voice that already works.** "Printed for the ones who play loud.", "Doors: free. Merch: yours.", "Your agent, our press.", and the 404 line "Off registration." Round 8 copy map is Redesign-Plan.md lines 402-413.
- **Engineering hygiene.**
  - The resting state works without JS.
  - ScrollScenes uses `matchMedia` with a separate mobile branch and one pin.
  - Reduced-motion is mostly honoured.
  - Latin subsets already cover pt/es/fr/nl/de accents.

## 3. Issues by theme

### Typography

| Sev | Issue | Evidence | Fix |
|---|---|---|---|
| Critical | Display face is clean and unscarred, so it reads fashion | layout.tsx:21-26; globals.css:463-473 (masthead 600, -0.03em, lh 0.82); home-desktop-00 | Replace the display face in masthead, outline word, footer word, set list and h1/h2 with a heavier, flatter, squarer condensed (Anton, Big Shoulders Display 800-900, or GC Grind if licensed). Keep caps. |
| Major | `--font-display` aliases Barlow, so inner pages use another headline voice. Gallery h1 is sentence-case 600 at clamp(3.25rem,11vw,9.5rem). | globals.css:36-38; GridView.tsx:539,582,609,753; GalleryView.tsx:74; ProductModal.tsx:960; FilterDrawer.tsx:206 | Point `--font-display` at the new face. Define `.t-display-xl/l/m` classes and remove inline fontFamily, size and tracking. Update the stale "Barlow everywhere" comment. |
| Major | Light 300 and centred statements flip the tone to luxury. This is a tone problem, not a contrast problem; --soft/--signal on ink pass at roughly 10:1. | globals.css:625-628, 692-702; EditorialPage.tsx:57; SiteFooter.tsx:36; ApplySection.tsx:48 | Drop 300. Statements go to 500, left-aligned. Key claims go in condensed caps 40-56px. Ban centred long copy. |
| Major | Mono is stock Plex at a uniform 12px caps and 0.08em, duplicated in about six places. Contrast is fine: muted on paper is about 4.7-4.8:1. | layout.tsx:36-42; styles.ts:11-17; GridView.tsx:29-34; EditorialPage.tsx:5-11; FilterDrawer.tsx:8-13 | Pick a mono with character. Define `.t-label` and `.t-mono` once, at 12.5-13px with 0.04-0.06em tracking. Let mono carry agent/MCP content in sentence case (prompts, tool status), not just caps labels. |
| Major | Outlined words use a 1px stroke at 300px | globals.css:531-534 | Use a heavier face and a plain 2-3px stroke. Do not rely on `paint-order` for HTML text; support is unreliable. |
| Major | No type scale: sizes are ad hoc (globals.css has about 35 font-size declarations) plus Tailwind arbitrary values and inline styles | ZeroUpfront.tsx:39-40; SiteFooter.tsx:36; ApplySection.tsx:48 | Define the scale as tokens: poster (fitted), display XL/L/M, lead, body, UI, label, stats. No inline sizes. |
| Major | Inline MONO/style objects duplicate the type system across 10+ files, so a face swap needs many edits | GridView, EditorialPage, FilterDrawer, GalleryView | Move to shared classes before changing faces. |
| Minor | Stats are plain Barlow 600 with a tiny suffix and no tabular figures | globals.css:766-800 | Display face or mono, tabular, 72-96px. Unit suffix in mono caps. |
| Minor | Two grammars on the ZERO band: sentence-case Barlow headings and mixed buttons | ZeroUpfront.tsx:39 | Caps headings, full-contrast body, CTAs only via `.btn-ink` / `.link-ink`. |
| Minor | Tracking and case rules are inconsistent. Nav caps are Barlow sans, not condensed. | globals.css:474-481, 966-969, 1017-1023, 1087; SiteHeader.tsx:44-52 | Display caps -0.01 to -0.02em, never below -0.025em. UI caps in the display face at 0.04em. Mono only in mono. No tracked Barlow caps. |
| Minor | Fitted words use lh 0.8-0.82 inside overflow:hidden, so tilde/umlaut clipping is a plausible risk. Not reproduced in a screenshot. | globals.css:469,522,1086; FittedWord.tsx:88 | Pad the wrapper about 0.12em. Re-derive the width factor (0.5em/char at about line 1132) for the new face. Test pt/de/es/fr/nl strings. |
| Minor | OG, icon and apple-icon bake Barlow Condensed Bold and Plex Mono from static TTFs. The Latin Extended subset claim for that TTF is unverified. | opengraph-image.tsx:9-13; icon.tsx:22; apple-icon.tsx:22; scripts/fonts | Add TTF swap and OG regeneration to the migration checklist. |
| Minor | Subsets are latin only. This covers pt/es/fr/nl/de accents. Artist names are user content and can contain Latin Extended-A. | layout.tsx | Use `['latin','latin-ext']` on the replacement faces. |

### Colour & material

| Sev | Issue | Evidence | Fix |
|---|---|---|---|
| Critical | Palette reads warm luxury editorial | globals.css:56-66; catalog-desktop-01, gallery-desktop-01 | Move to a cooler utilitarian stock (newsprint or concrete) with true ink #0b0b0c. Flip dominance toward ink so paper becomes a print-stock insert and the packshot surface. |
| Critical | No accent, so no brand signal, no CTA hierarchy and no app continuity. Platform `--chart-1..5` are all `var(--signal)`. | globals.css:4; platform/app/globals.css:48-52 | Add one spot-ink accent via `--accent` tokens in both apps. Strict budget of 3-5% of a viewport. See directions. |
| Major | Hairlines are 1.3-1.4:1 and carry all separation. Platform `--border` is about 1.84:1. | globals.css:14,65,81; comment at globals.css:52-55 | Two tokens: decorative `--hairline`, and structural `--rule` (about 0.55 alpha) for inputs, tiles and spec tables. The 3:1 criterion applies to control boundaries only. |
| Major | Paper, raised and surface are identical (#ece5da), so no elevation | globals.css:59-61 | Real ground / panel / well ladder, or a print-process surface. |
| Major | No tactile material. grep for texture, grain or noise in app and components is empty. Assets/FABRIC TEXTURE PNGs (25-33MB each) are unused. | globals.css:496-505 | SVG grain at 4-6%. Cloth weave from a derived ~80KB WebP crop on ink bands only. A 2px accent misregistration on outlined words. Never ship the 30MB PNGs. Gate on licence and provenance of the .fig source. |
| Major | Photography has two worlds. B&W halftone hides ink colour and print quality; the gallery is saturated colour that clashes with ecru. | Halftone.tsx; gallery-desktop-01; GridView.tsx:575 | One grading recipe. Colour or single-ink at rest for product proof, halftone for editorial. Replace the neutral black catalog scrim (GridView.tsx:575, rgba(0,0,0,.6)) with a solid caption bar. The scrim contradicts the "no gradients" comment. |
| Minor | Dimming relies on opacity. `.mf-dim` (.62) is used only on mono meta labels; it is 4.61:1 if the colour is `--signal` and fails if the label is already muted. The role-choice colour-mix at 52% is 3.40:1. Disabled buttons at .4 are 2.44:1. | globals.css:289-291, 954, 1156; GridView.tsx:438-513; FilterDrawer.tsx:259,272 | Replace opacity with a `--dim` token no lighter than `--muted` (#6b6258). Raise the 52% mix to 62% or more, or use `--muted`. |
| Minor | Hardcoded hex in the footer, `themeColor` fixed #141414 on mostly paper pages, and the halftone dot colour hardcoded (it vanishes on ink bands) | globals.css:1028-1103, 496-505; layout.tsx:61 | Lift into tokens. Per-route `themeColor`. Drive the dot colour from a token and use screen/lighten on ink. |
| Minor | The halftone is a uniform CSS dot screen, not real AM halftone. The moiré claim is untested. | globals.css:496-505 | Pre-process hero plates offline. |

### Components & system

| Sev | Issue | Evidence | Fix |
|---|---|---|---|
| Critical | The cover brief input and the Apply email field have no focus indicator. `outline:none` on `.home-brief-input-row input` (unlayered, 0,1,1) beats the global `:focus-visible` rule (globals.css:91-93) and the Tailwind `FOCUS_RING` utilities (styles.ts:62), which sit in a lower layer. | globals.css:646-652; Cover.tsx:198-206; ApplySection.tsx:64-72 | `.home-brief-input-row:focus-within` with a 2px bottom rule, plus an outline on the input. Delete `FOCUS_RING`. Fix first, before any visual work. |
| Critical | Platform forks palette and font. tokens.css redeclares `--paper #221f1c` and Helvetica after globals. Mono var names differ (`--font-plex-mono` vs `--font-ibm-plex-mono`). `--hairline` is a colour on the site but a border shorthand in the platform. Both (chat) and admin layouts import tokens.css. | platform/components/chat/tokens.css:2-7; platform/app/globals.css:11-14; lib/fonts.ts:14 | Delete the duplicate :root. Both apps import one shared token source. |
| Critical | About six button shapes: `.btn-ink` 56px, PRIMARY/SECONDARY 48px with 4px radius (styles.ts:19-52), the header apply button 40px (36 mobile), the FilterDrawer button 48px, and a WaitlistForm inline 64px override | globals.css:893-915; Cover.tsx:85-89; ZeroUpfront.tsx:48; SiteHeader.tsx:41-53,220; FilterDrawer.tsx:384-400; WaitlistForm.tsx:224 | One Button primitive: primary, secondary and link variants; sizes 40/48/56/64. Delete PRIMARY_BTN, SECONDARY_BTN, MORE_LINK, applyButton and the inline override. |
| Major | Platform shape language contradicts the site. `--radius:1rem`, 999px pills, 32px composer, shadcn `rounded-lg`. The site is radius 0, with 4px and 8px legacy exceptions. | platform/app/globals.css:39,88-94; tokens.css:62-80,357-365 | Base radius 0 with a small scale. Hand-edit the literal 999/32/16/20/12px values in tokens.css; they will not follow `--radius`. |
| Major | Platform has no condensed face (only Barlow 400/500/600 and Plex), so `.mf-display` (weight 700 uppercase, EmptyState.tsx:20) is synthesised bold and `.btn-ink` cannot be ported | platform/lib/fonts.ts; tokens.css:22-26; platform/app/globals.css:54 | Add the new display face to platform/lib/fonts.ts under the same variable name. |
| Major | Input spec forked three ways: cover/apply 48px/16px, waitlist 56px/22px, catalog search 140px mono | globals.css:638-659; WaitlistForm.tsx:210-211; GridView.tsx:817-850 | One Field primitive with default, hover, focus, invalid and disabled states. |
| Major | Token architecture is incomplete. `--font-condensed` is used 8 times but not mapped in `@theme`; `--bone` and `--scrim` are not mapped. `--well` has three values (#101010 vintage/:root, #1a1714, #0c0b0a). The footer hardcodes the ink palette. :root says "no mode switching" while layout.tsx:92 wraps everything in vintage. There are no radius, spacing, z-index or motion tokens. | globals.css:3-6,25-39,1028-1103 | Three layers (primitive, semantic, component). Make the footer a `data-theme='ink'` element. Add z, duration and ease tokens. CI grep for raw hex in components. |
| Major | Style authoring is split across globals.css (1327 lines), Tailwind arbitrary values and about 210 inline style sites (GridView 55, ProductModal 52, FilterDrawer 23, SiteHeader 18, GalleryView 9, Cover 9). Inline styles cannot express hover or focus. Two dead selectors: `.catalog-card-caption`, `.home-nav-cap`. | | Components get classes; inline only for dynamic values. Split the CSS file. |
| Major | Chips, toggles and filter rows have no primitive and no hover; selection is shown four different ways. The 14px checkbox and 8-16px swatches are small. Details at FilterDrawer.tsx:300-345 not individually re-read. | | Chip, Toggle, Swatch (44px hit area) and Tab primitives. |
| Minor | Nav hover is opacity-only; the mobile hamburger and apply button are 36px (SiteHeader.tsx:220,232). Nav items are in-page anchors (SiteHeader.tsx:33-38), and Gallery, About and Contact are only in the mobile menu. | | 44px hit areas. A real site map with an active state. |
| Minor | No forced-colors, prefers-contrast or reduced-transparency handling. Aurora has all of them. | Aurora index.html:26-28,42 | Add a forced-colors block to the shared base. |
| Minor | The platform duplicates primitives: Chip vs badge, Modal vs dialog, Hairline vs separator | platform/components/ui | Pick one of each before building shared primitives. |

### Layout & pages

| Sev | Issue | Evidence | Fix |
|---|---|---|---|
| Critical | The hero fold has no product and no composer. `.home-cover-media` is max(640px,100vh), the photo is a front-print tee crop, and the composer is 1.8 viewports down. | Cover.tsx:119-185; globals.css:587-603, 599; home-desktop-00/01 | Re-compose the cover as an "app on the cover". Wordmark at about 40-60% height, one-sentence promise, composer with artist-specific chips above 900px, and a 2-line textarea instead of an input. |
| Critical | The platform is never shown; there is no product UI anywhere on the site | home-desktop-00..14 | Add a Product band: a framed app window (rail, chat, mockup card, quote, approve) built from Aurora structure in Blackout Merchandise tokens. Honest about MCP status. |
| Major | The giant-word device is overused: cover, CLOTH, ZERO, APPLY, page words and footer. The CLOTH and ZERO frames look sparse partly because they are scroll-scrub states. | Cloth.tsx:50; ZeroUpfront.tsx:30; ApplySection.tsx:44; EditorialPage.tsx:46-52 | Keep giant words for BLACKOUT MERCHANDISE (cover, footer) and APPLY. Elsewhere use a mono-indexed condensed h2 at 56-72px with content in the first viewport. |
| Major | Vertical padding is large and information density low. `.home-section` is 96-120px with 48-64px gaps; `.home-statement` is 96px. | globals.css:675-720 | Halve the padding. Fold the Statement into Cloth. Merge Zero and Paths into one "How you earn" band with a worked price example. Target about 8 desktop screens. |
| Major | Catalog and gallery titles use a different system. "The blanks." and "Work" are Barlow sentence case; GalleryView.tsx:75 is clamp(3.25rem,11vw,9.5rem), about 152px at 1440. | GridView.tsx; GalleryView.tsx:75,81; catalog-desktop-00; gallery-desktop-00 | Use the EditorialPage header pattern. Catalog already has the mono index and stat strip, so do not add another. Rename "Work" (needs six-locale copy at en.ts:139). Add Gallery to the desktop nav. |
| Major | No role-specific entry points. PrintedFor is disabled (`CLIENTS_ARE_REAL=false`, PrintedFor.tsx:11-17). The RolePicker (six options) looks like disabled grey text. | RolePicker.tsx; waitlist-desktop-00 | "Who it is for" tiles with real photos, example run and lead time. Restyle RolePicker as bordered chips with an ink-filled selected state. |
| Major | Mobile. The composer is far down and truncates ("...chest emb"). Blanks are stacked 1-up. The dev badge overlaps the footer legal row. The site has no `svh`/`dvh`. | home-mobile-00..04,14; Cover.tsx:158-181 | A 2-line composer under the wordmark. Blanks as a scroll-snap strip. Set List as an accordion. Use `100svh`. The cover is a clip-path scene, so re-point it rather than just swapping the unit. |
| Major | The only tech proof says "Status: Soon" | en.ts:268; home-desktop-11 | Do not lead with a non-live endpoint. Make it a dated roadmap line or tie the promise to the live brief flow. |
| Minor | Photography is B&W by default. Priority images (cover, EditorialPage plates) never get hover colour: `tone = hoverTone && !priority` (Halftone.tsx:39). | Halftone.tsx:39 | Decouple colour behaviour from the LCP flag. |
| Minor | The Statement scroll-scrub leaves "We print it when it sells." at low contrast mid-scrub | home-desktop-02 | Ensure the final and static states are full contrast. |
| Minor | Inner pages are one template. The 404 has one button over a 720px plate. The PRESS row has a title and no body. About's empty area is under the plate (about 140px), not under the text. | EditorialPage.tsx:44-84; notfound-desktop-00; about-desktop-01 | A density prop: form vs story. 404 gets three link rows. Real About proof (needs real stats and names). |
| Minor | Catalog tiles use 11px mono captions with no price-from or MOQ | catalog-desktop-00; home-desktop-11 | 12-13px captions, price-from and spec line. |
| Minor | CTA hierarchy is split three ways (APPLY, START YOUR BRIEF, SEND). The header differs between ink and paper. | home-desktop-00, catalog-desktop-00 | One verb per context. |

### Motion

| Sev | Issue | Evidence | Fix |
|---|---|---|---|
| Critical | The motion vocabulary is luxury: 0.9s expo.out line masks, 1s wipes, a 0.55s paper-on-paper page sweep | ScrollScenes.tsx:259-263,283-286,295-301; LoadIntro.tsx:88-92; PageTransition.tsx:49-53 | Keep the print metaphors. Add a machine layer: stepped type-on, ticking counters, hard clip cuts at 160-240ms. Shorten reveals to 400-600ms. |
| Major | Lenis duration 2.2 plus scrub 0.8 stacked gives a heavy floaty lag (about 3s, an estimate). Lenis is not gated by width. | SmoothScroll.tsx:39-44,59; ScrollScenes.tsx:57,77,110,135,198 | Lenis about 1.0-1.2 and scrub 0.15-0.3, or drop Lenis. |
| Major | The cursor rAF loop never sleeps, uses `mix-blend-mode: difference`, and remounts per route (mounted in template.tsx). The selector is `a, button, [role=button], input`. | Cursor.tsx:5,49-54,117; template.tsx:10 | Move to layout, stop the loop when settled, use quickTo, hide on document leave, widen the selector. |
| Major (profile first) | The cover animates clip-path plus image scale over a dot-screen layer. Jank is unmeasured. | ScrollScenes.tsx:77-85 | Profile it, then consider transform-based alternatives. |
| Minor | Reduced-motion is read once at mount in five places. Easings and durations are not tokenised. The brief typewriter is English-only and writes to the placeholder attribute. The count-up triggers off the section, not the stat row, and uses no tabular figures. | SmoothScroll.tsx:37; Cursor.tsx:22; PageTransition.tsx:35; FooterEcho.tsx:24; useBriefPlaceholder.ts:5-11,24; ScrollScenes.tsx:161-177 | One `useReducedMotion` hook with a change listener. Motion tokens. Locale-aware overlay typing with a caret. Trigger on the stat row. |
| Minor | The mobile branch is a desktop leftover (0.8s fade-rise). The page transition costs about 0.6s per navigation. The 3s failsafe is longer than the intro. | ScrollScenes.tsx:330-372; globals.css:1270-1304 | A short stepped mobile vocabulary. A hard 200ms cut. A 1.5-2s failsafe. |
| Minor | A second halftone tone image is fetched on hover-capable devices. It is already lazy, so this is bytes only for in-viewport plates. | Halftone.tsx:39-43 | Load on first pointerenter. |

### Site-to-app bridge / Aurora

| Sev | Issue | Evidence | Fix |
|---|---|---|---|
| Critical | Aurora is brand-neutral: cool greys (#080808/#f6f6f4/#c8c8c8), Arial (index.html:10), grey-gradient name text, silver strands, beam, Logoipsum mark. Ported as-is, the app looks like a generic AI chat and breaks continuity. | aurora-dashboard/index.html:9-14; aurora-desktop.png | Adopt layout and behaviour only. Re-skin with site tokens and type. |
| Critical | App greeting is not the site's display type. `.mf-display` asks for 700 and the platform loads Barlow 400/500/600, so the browser fake-bolds it. | tokens.css:22-26; fonts.ts; EmptyState.tsx:19-22 | Load the shared display face in the platform. One token moves both apps. |
| Major | Composer shape conflict: platform 64px pill (tokens.css:357-365), Aurora 24px two-row card (about 175px), site 4px blocks | Composer.tsx; tokens.css | Adopt Aurora's two-row anatomy at about 160px. Send is a square ink block. Radius 0-8px. This means changing the InputGroup structure in Composer.tsx, not only CSS. |
| Major | The platform has top-bar-only navigation (TopBar.tsx:29-44). Aurora's rail items are local prompt panels, not routes. | TopBar.tsx; Aurora index.html:103-114 | Take the visual shell; build real routes (Projects, Designs, Orders, Shop, Agent). Bottom tab bar under 48rem. |
| Major | liquidGL WebGL glass is heavy and off-brand. The CSS panel fallback (rgba(18,18,18,.35) + blur 12px) is the part to keep. | Aurora index.html:21,4801-4823 | Reject liquidGL for v1. Use a CSS "ink glass". Optional flagged add-on later. |
| Major | Aurora atmosphere (strand canvas, beam) clashes with flat print language | Aurora index.html:12-13,4771-4799 | Reject. Use a static halftone dot field at 3-4% or an outlined-word watermark. |
| Major | The platform is dark-only (platform/app/globals.css:8-10) while the site is paper-first. Hairline is 22% in the platform and rgba(.12) on the site. | | Decide the theme model first (see Decisions). |
| Major | Placeholder and licence items: Logoipsum #mark and placeholder copy must not ship. lil-gui is loaded from jsDelivr only when `options.helper` is set, and it is never set, so it is dead code. Use lucide-react (ISC), already installed. | Aurora CREDITS.md | Strip them. |
| Minor | Chips: Aurora's gradient border and lift vs the platform's 999px pills. Aurora's radius is 8px. | Aurora index.html:19; EmptyState.tsx:43-58 | 4px, hairline, mono caps, bone-invert hover, 2x2 on mobile, merch-specific starters. |
| Minor | A11y gaps in the platform. Focus is a 22%-to-40% border change (tokens.css:367-370). No forced-colors or reduced-transparency. Aurora's own focus is a #c4c7ce inset, not bone. | | A 2px ring via `:has(textarea:focus-visible)`. Keep Enter-to-send (Composer.tsx:249); Cmd+Enter only as an alias. |
| Minor | Aurora's negative tracking (-1.6px, -0.6px, -0.45px) is Arial-specific | Aurora index.html:14-19 | Drop copied letter-spacing values. |
| Minor | The hero input does not look like the app composer. The mark is a raster (website-v3/public/brand/mark.png) vs an inline RegisterMark crosshair in the platform. | Cover.tsx:188-210 | Make the hero composer a miniature of the app composer. Vectorise the mark once. |

### Brand & copy

| Sev | Issue | Evidence | Fix |
|---|---|---|---|
| Major | Copy is polished and restrained. "Premium" and "Eco-friendly" are lifestyle vocabulary (en.ts:31, 213). The strongest approved line is not on the hero. | home-desktop-00,03 | Spec-sheet-meets-flyer voice: concrete and blunt (no minimums, no warehouse, no middleman). Put "Printed for the ones who play loud." in the hero. Keep GOTS and OEKO-TEX as proof rows. |
| Major | No scene proof. No credits on plates, and the cover caption is generic. | PrintedFor.tsx:11-17; en.ts:210 | Credit every plate: act, piece, run, year. Add a roster once there are 5+ real names. |
| Minor | Seasonal "Issue 01 / Autumn-Winter" framing is in the plan only. The live INDX.nn labels are fine. | Redesign-Plan.md:332,380 | Move to run, batch and catalogue numbers (RUN 0042, MF-0001). |
| Minor | Single-material texture: halftone only. The plan rule "no tickers, stickers, tickets, stamps, barcodes, rotations" (about Plan line 329) removed the DIY layer. | | A capped raw layer: one per viewport, at most two per page. |
| Minor | The 404 and the footer are the safest places for loud personality | notfound-desktop-00 | Loudest type and a band-culture easter egg there. |
| Housekeeping | Docs disagree. globals.css:1-6 still says "no light/charcoal mode switching", the plan's rounds 3-6 are stale, and CLAUDE.md styling is stale. | | Rewrite the comment. Mark plan rounds as superseded. Treat the shipped tree as baseline. |

## 4. Candidate directions

### Type systems

- **T1. Tour Poster, lowest risk, all OFL.**
  - Display: Anton 400 (single weight; `weight:'400'` is mandatory in next/font/google), caps, -0.01em, lh 0.9.
  - Body and UI: keep Barlow 400/500. This is the lowest-delta route. Avoid Space Grotesk: it is the stale CLAUDE.md face and very common in AI/SaaS pages.
  - Mono: JetBrains Mono 400/500.
  - Rules: no 300, no tracked sans caps, no centred paragraphs, outline stroke 2.5px.
  - Scale (desktop/mobile, px): display XL 120/64, L 72/44, M 44/30, lead 24/20, body 17/16, UI 14, label 12/12.5, stats 96/56.
  - Anton covers latin, latin-ext and vietnamese. It is common (sport look), so pair it with grit.
- **T2. Gig Flyer x Spec Sheet, gated on a licence.**
  - Display: GC Grind (single weight, WOFF2 17KB, next/font/local).
  - Text: Archivo variable. next/font needs `axes:['wdth']` and a variable config, with no weight array; wdth 62-125.
  - Mono: Space Mono or Martian Mono (variable, width axis).
  - Licence: the zip has no licence file. The name table says "(c) 2025 Glyphonic, all rights reserved". It has 262 glyphs and covers ã ç é ñ ö ü ß ø å œ æ ¿ ¡ « ». It lacks Latin Extended-A and arrows. Needs a purchase receipt and a webfont licence with a pageview tier. Fall back to T1 or T3 if unproven.
- **T3. Heavier-condensed alternative, all OFL.**
  - Display: Big Shoulders Display 800-900 (variable, next/font id `Big_Shoulders_Display`).
  - Body: Barlow or Archivo.
  - Mono: JetBrains Mono or IBM Plex Mono.
  - Gives a wider-cut option for set-list titles.
- **Accent layer (optional).** Mornsey Regular (brush caps, Letterhend Studio, "all rights reserved"), as a rare stamp.
  - Budget: one use per viewport, two per page, 64-160px, rotated -3 to -6 degrees, never in sentences.
  - Coverage: 212 glyphs. It covers ã ç é ñ ö ü ß ø å œ æ « », and lacks ¿ ¡ · ĳ and Latin Extended-A. Coverage was reported by one reviewer and not re-verified.
  - Needs a webfont licence proven first. Convert the TTF to WOFF2.
  - The glyph holes mean it can never carry text containing diacritic-critical strings.

Shared constraints:
- All faces need `latin-ext`.
- Re-derive the FittedWord width factor for any new face.
- Test pt/de/es/fr/nl strings in fitted words.
- Swap OG, icon and apple-icon TTFs, and the platform fonts, in the same change.
- Specimen renderings exist only for the local fonts (specimens/local-diacritics-test.jpg; the earlier shots/local-font-specimens.jpg was removed with the rename). Anton, Big Shoulders and the rest were not rendered.

### Palettes (contrast figures corrected)

- **P-A. Hazard Press** (ink, newsprint, hot red-orange)
  - Light: paper #e9e7e1, raised #f2f0ea, surface #dedcd4, ink/signal #0b0b0c, soft #2b2926, muted #5c5852 (5.71:1 on paper), hairline rgba(11,11,12,.14), rule rgba(11,11,12,.55).
  - Accent #ff4a1c is 2.72:1 on paper, so use it as fill, rule or non-text mark only, never small or large text. #0b0b0c on the accent fill is 5.85:1. For large text on paper, darken to about #e63a0c.
  - Dark/ink: paper #0b0b0c, raised #141414, surface #1e1e1e, signal #f2efe8, muted #a8a49c (7.92:1), accent #ff5a2c (6.32:1 on #0b0b0c).
  - Platform charts: accent, bone #f2efe8, #8a867e, #5a5750, #ffb199.
  - Material: SVG grain 5%, cloth weave 7% soft-light on ink bands, 2px misregistration, accent fill only on the single primary CTA.
  - Risk: orange can read as dev-tool or hazard-adjacent.
- **P-B. Acid Terminal** (chrome-black, bone, acid lime)
  - Light: paper #ecece6, raised #f4f4ee, surface #e0e0d8, ink #09090a, muted #55554f. Lime #c6ff2e is fill-only under ink text; it is about 1.0:1 on paper.
  - Dark: paper #09090a, raised #131314, surface #1c1c1e, signal #f4f4ee, muted #a3a39b. Lime is 16.8:1 on #09090a, so it is safe for text and links on dark.
  - Closest fit to the Aurora dark composer and the agent theme. Risks: reads crypto/AI-startup, clashes with olive and khaki garments, weakest craft link.
- **P-C. Plastisol Spot** (bone and cobalt)
  - Light: paper #e6e4dc, raised #efede5, surface #d9d7ce, ink #0c0d10, muted #55565a. Cobalt #1f3cff is 5.24:1 on paper (passes AA).
  - Dark: paper #0c0d10, raised #14161a, surface #1d2026, signal #efede5, accent #5b74ff (4.98:1, barely passes; fails for small text on any tint).
  - Red #ff3b2f is 2.79:1 on paper, so it is fill or icon only.
  - Rare in the category and reads as UV or blueprint. Risk: the default SaaS blue, weak punch.
  - Correction to the earlier rationale: cobalt is not uniquely AA-safe on both grounds, and it is not a measured match to Aurora, which has no chroma.
- **Neutral baseline.** Whichever accent is chosen, keep the near-black #0b0b0c/#141414 ink and bone #ede4dd or #f2efe8 shared with the platform.

### Art-direction territories

1. **A. Pressroom Terminal (recommended).** Ink-first, product-first. Black default ground with paper only for packshot grids. Aurora glass composer plus real or staged app UI in bordered frames with registration marks. Mono metadata on every card. Closest to what the owner likes, because the masthead, halftones and Set List survive.
   - Type: heavy condensed plus mono (T1 or T3). Palette: P-A or P-B.
   - References are principles, not marks to copy: Nothing's single red signal, Linear's product-first dark hero, teenage engineering's spec-sheet voice.
   - Paid faces named by the reviewer (ABC Monument Grotesk, Neue Machina, Berkeley Mono) need web licences. Nothing's red is closer to #D71921 than #FF3B1F.
2. **B. Label Catalogue.** Archival, strict grid, catalogue numbers (MF-0001), 1-bit and duotone scans, spec-sheet tech rows. Referenced scene sites are Relapse, Sacred Bones, Deathwish and Southern Lord. Weakest on tech signal and risks austerity for tattoo and festival users. Familjen Grotesk and Hanken Grotesk are OFL. The Velvetyne blackletter suggestion was never named, so verify or drop.
3. **C. Drop Culture.** Loud streetwear, marquees, stickers, full-bleed colour blocks. It reverses the Round 6 "no tickers/stickers/stamps" rule and has the highest risk of reading as a fashion label rather than a tool. Fontshare Clash Display, Satoshi and Cabinet Grotesk are under the ITF Free Font License. Clash is not extended or condensed. Collletttivo faces are separately licensed and not Fontshare. The Brain Dead domain was unverified.
4. **D. Tour Poster Machine.** Extends Set List into a festival-bill system, with lineup-style type lists, ticket-stub CTAs and the assistant framed as a tour manager.
   - Big Shoulders Display and Plex Mono are OFL. Bricolage Grotesque has a wdth axis of only about 75-100, so it is not truly condensed.
   - Mornsey only after licence. Drop the placeholder URL in the original text.
   - Risk: kitsch and extra production work.
   - Plausible hybrid: A for structure plus D for the Set List device.

### Material and system direction

- A shared CSS token package, taking the **relative `@import` route first**.
  - The repo-root workspaces are `["app","mainpage"]`, so a new package needs that list edited, or start with a relative import.
  - Do not write `--font-display: var(--font-display)` in `@theme inline`; it is circular. Export a differently named variable.
- Three layers: primitive, semantic (re-scoped by `data-theme`), component.
- Then in order: Button, Field, Chip, Dialog and Card.
- Optionally a `/styleguide` route that renders every variant in paper and ink.

## 5. Aurora template

| Element | Verdict | Note |
|---|---|---|
| Layout skeleton: rail, centred greeting, composer, chips, status line | Adopt | Maps to EmptyGreeting, Composer and QuickActionsRow in ChatShell.tsx. |
| Two-row composer with toolbar (mode select, attach, web, mic, send), aria-pressed toggles, attachment chips | Adopt | Map Auto/Fast/Think to agent modes. Needs InputGroup restructuring. |
| 72px icon rail | Adapt | Use 64px, hairline edge, bone-fill active state, mono labels, Lucide icons. Aurora's rail items are not routes, so real routes (Projects, Designs, Orders, Shop, Agent) need building. Bottom tab bar under 48rem. |
| Responsive breakpoints (65/42/23rem, short height) and safe-area handling | Adopt | |
| Accessibility set: skip link, sr-only label, aria-invalid, aria-live, reduced-motion, reduced-transparency, forced-colors | Adopt | Missing in both site and platform. |
| Suggestion chips | Adapt | 4px, hairline, mono caps, numbered, bone-invert hover, 2x2 on mobile, merch starters ("Tour tee, 50 pcs", "Flash sheet drop", "Festival crew hoodies"). |
| Glass composer material | Adapt | CSS-only "ink glass" (about rgba(20,20,20,.72), 8px blur, hairline, 8% inset sheen) on composer and popovers only. |
| Greeting | Adapt | Mono label, display-face caps headline at 56-72px (32 on mobile), light tagline. Weight 300 needs adding to the platform fonts, and the platform greeting is uppercase. No gradient text. |
| Ink and surface brightness ladder | Adapt | The discipline is fine; re-tint with site tokens. |
| liquidGL WebGL refraction | Reject (main chat) | Cost, brand mismatch, fragile with streaming content. Optional flagged add-on for voice or a proof-approved moment. |
| Silver strand canvas, beam, vignette, grey-gradient name | Reject | Replace with a static halftone field or outlined-word watermark. |
| Arial stack and negative tracking values | Reject | |
| 24px glass radius, 8px chip radius, translateY(-2px) lift | Reject | Square-to-4/8px with bone-invert hover. |
| Logoipsum mark, placeholder copy ("Marcelo", etc.), lil-gui | Reject / do not ship | lil-gui is dead code. Use lucide-react (ISC) and keep the Lucide and any liquidGL MIT notices in a third-party file. |
| `--line #343434` as a structural border | Reject | 1.61:1 on #080808; 1.31:1 on #202020. |
| Cmd/Ctrl+Enter send | Adapt | Alias only; keep Enter-to-send. |

## 6. Decisions the owner must make

1. **Territory.** A (Pressroom Terminal), B, C or D, or a hybrid of A structure plus D set-list. This sets everything else.
2. **Accent.** Is one accent acceptable, given the rounds 6-8 decision "no accent colour"? Hazard orange, acid lime or cobalt? Is it allowed across both site and app for agent and live states, and capped at about 3-5% of a viewport?
3. **Paper.** Keep warm ecru as a deliberate stock nod, move to cooler newsprint, or flip the site to ink-dominant with paper only for packshot grids?
4. **Fonts and licences.** Do you hold webfont licences (with receipts) for GC Grind (Glyphonic) and Mornsey (Letterhend Studio)? Otherwise Anton or Big Shoulders is the fallback and both remain moodboard-only. Are Latin Extended-A languages (pl, tr, cs) on the roadmap? Neither local face covers them.
5. **Platform theme.** Dark-only, paper mode, or both via shared `data-theme` blocks? Handoff is currently paper to dark.
6. **Rules to reverse.** May the "no stickers, stamps, tickers" rule be relaxed in a capped form (one raw element per viewport)? Is a signature-motion keeper decision needed on the outline-to-ink fill? Should motion differ on paper pages vs ink bands?
7. **Product on the page.** Lead the hero with the composer and app mock, or keep the photo-led cover with the composer secondary? Is there a real or high-fidelity app view to show? Remove or date "Soon" on MCP?
8. **Scroll feel.** Keep Lenis' heavy glide, or go native with a short scrub? Keep the 0.6s page transition?
9. **Glass.** Any WebGL or liquid glass at all, or CSS fallback only?
10. **Shared tokens.** A shared package or relative import first, and does the platform keep shadcn restyled or replace it with first-party primitives? Is a fully square-cornered platform acceptable?
11. **Proof and content.** Real named artists, stats, team, price-from, MOQ and lead time to show? Are the AI-looking gallery photos staying or being regraded? Are the FABRIC TEXTURE PNGs licensed for web, and may a crop be derived?
12. **Copy.** Approve the move from "premium / eco-friendly / Issue 01" language to the blunt run, batch and spec voice, and who translates the brief typing examples into the five other locales.

### Suggested sequencing (for the implementation plan)

1. Fix the focus bug on the cover and apply inputs (DS-1).
2. Consolidate tokens and delete the platform fork.
3. Decide the territory, accent and licences.
4. Swap the display and mono faces through one token, including OG and icons, and the platform.
5. Button, Field and Chip primitives.
6. Home re-composition: composer on the cover and the Product band.
7. Inner-page alignment, then motion retune, then the platform shell built from the Aurora structure.
