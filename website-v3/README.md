This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Verification harness (Round 9)

Everything lives in `scripts/verify/` and is registered as `npm run verify:*`. A dev server must be running on `http://localhost:3004` (`npm run dev`). Output folders under `.verify/` are gitignored.

```bash
# 1. capture (1440x900 desktop, 390x844 mobile, 1440x900 reduced motion; scrolled through)
npm run verify:shots -- --out .verify/before --lang en
npm run verify:shots -- --out .verify/after  --lang pt --routes /,/about --shots desktop

# 2. compare two folders; fails when more than --max-diff percent of pixels differ
npm run verify:diff -- .verify/before .verify/after --max-diff 0.1
```

- Locale is `localStorage['mf-lang']`, not a cookie. The harness seeds it before page scripts run, then waits for `<html lang>` (set only once the dictionary chunk has loaded) and `document.fonts.ready`. Non-English captures warn when the header text is still the English string.
- Files are named `<route>-desktop|mobile|reduced-NN.jpg` (`/` is `home`), compatible with `.verify/baseline-2026-10-06/`. `heights.json` records scroll height/width, horizontal-scroll flag, status and page errors per route and viewport.
- The one-time load intro is skipped by default (`sessionStorage['mf-intro-seen']`) so captures are deterministic; pass `--intro` to keep it.
- `--specimen` (WP3) captures `/dev/specimen` full-page per language (`--query`, `--themes`). `--storage-state <file>` replays a Playwright session for platform pages.
- `verify:hex` and `verify:type` are report-only until WP21; both take `--files a,b` (or a list file) for per-WP acceptance and `--strict` to fail on hits.
- `verify:preflight` re-checks the plan's facts and rewrites `scripts/verify/hook-contract.json` (the DOM hooks `ScrollScenes` and `LoadIntro` depend on).
- `verify:budgets`, `verify:stamps` and `verify:prodguard` are documented stubs until WP6b and WP3 fill them in. `verify:tokens`, `verify:contrast`, `verify:i18n` and `measure-face` skip with a message until their script lands.
- Chromium for Playwright: `npx playwright install chromium`.
