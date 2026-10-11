# Deployment Guide

> **Last Updated:** October 11, 2026

This guide covers deploying the MerchFrom applications to Vercel.

---

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed: `bun i -g vercel`
- Access to the MerchFrom Vercel team
- Environment variables ready for `/app` (see [Environment Variables](#environment-variables)); the website needs none

---

## Project Structure

We deploy two separate projects from this monorepo:

| Project | Directory | Vercel Project | Domain |
|---------|-----------|----------------|--------|
| Website (static) | `/mainpage` | `merch-from-mainpage` | `merchfrom.com` |
| Main App | `/app` | `merch-from-app` | `app.merchfrom.com` |

`/platform` (the agent-first Next.js 16 app, npm) is not covered by this guide yet: no Vercel project for it is documented. `Documentation/Dev/Platform-Plan.md` plans it on Vercel region `fra1` and puts fan storefronts at `merchfrom.com/[slug]` (or an artist's custom domain). That would clash with the website on `merchfrom.com` above; the domain split between the website and the platform is not decided yet.

The root `vercel.json` (a daily cron, `0 2 * * *`, on `/cron/retention`) belongs to neither project above, and no route in `app/`, `platform/` or `mainpage/` serves `/cron/retention`. Git-integration builds read `vercel.json` from the project's Root Directory (`mainpage` for the website), and the app's CLI deploy (see [Main App](#main-app-appmerchfromcom)) runs inside `app/` and uploads only that folder, so neither picks the root file up. A CLI deploy of the website run from the repo root does: when `mainpage/` has no `vercel.json` of its own, the CLI prints a warning that the file should be inside the root directory and then applies the repo-root `vercel.json`, cron included. This is one reason the website deploys through the Git integration only (see below).

---

## Quick Deploy

### Website (merchfrom.com)

`/mainpage` is plain HTML, CSS and JS: no framework, nothing to install or build, no environment variables. Set the `merch-from-mainpage` project once in **Project Settings → Build and Deployment**:

| Setting | Value |
|---------|-------|
| Framework Preset | `Other` |
| Root Directory | `mainpage` |
| Build Command | Override on, field left empty (skips the build step) |
| Output Directory | Default. With `Other`, Vercel serves `public/` if it exists, otherwise the Root Directory itself. `mainpage` has no `public/`, so `index.html`, `faq/`, `agents/`, `watch/` and `studio/` are served as they are |
| Install Command | Default. `mainpage/package.json` has no dependencies and no `build` script, only `dev` |
| Environment Variables | None |

Do not add a `public/` folder to `mainpage`: with `Other`, Vercel would then serve only that folder.

Deploy through the Git integration: connect the `merch-from-mainpage` project to the GitHub repo, and a push to the production branch deploys to production. The Git integration builds from the committed files only.

Do not deploy the website with the CLI from this repo. Because the project's Root Directory is `mainpage`, the CLI joins it to the folder it runs in: run inside `mainpage/`, it looks for `mainpage/mainpage` and stops, so it has to run from the repo root, and from there:

- The CLI uploads everything in the repo root except `.vercelignore` entries and Vercel's default ignore list (`.git`, `node_modules`, `.next`, `.vercel`, `.env.local`, ...). It does not read `.gitignore`. This repo has no `.vercelignore`, so git-ignored local files (for example `.claude/settings.local.json`, `.crush/`) and the untracked `Assets/` folder (about 5 GB) would be uploaded.
- The repo-root `vercel.json` and its cron would be applied to the website deployment (see [Project Structure](#project-structure)).
- The repo has no `.vercel` link folder, and the project lives in the MerchFrom Vercel team, so a bare `--project` would be looked up in whatever scope is currently active unless `--scope` is passed.

> **Sample data:** the members area, keys, the "On the press now" board and apply results run on front-end sample data inside `index.html`, not a backend. Until a backend exists, a public deploy shows the three sample members (their emails are in the page source) and sample press rows, not real orders.

### Main App (app.merchfrom.com)

```bash
# From project root
cd app

# Deploy to production
vercel --prod
```

---

## Environment Variables

### Website (`/mainpage`)

None. The site is static and reads no environment variables; it has no database connection and no analytics scripts.

### Main App (`/app`)

Required variables:
- `DATABASE_URL` - Neon PostgreSQL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth
- `CLERK_SECRET_KEY` - Clerk auth
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe payments
- `STRIPE_SECRET_KEY` - Stripe payments
- `STRIPE_WEBHOOK_SECRET` - Stripe webhooks
- `OPENROUTER_API_KEY` - AI/LLM access
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Image CDN
- `UPSTASH_REDIS_REST_URL` - Redis cache
- `UPSTASH_REDIS_REST_TOKEN` - Redis cache
- `CRON_SECRET` - Cron job security

Optional:
- `DEEPGRAM_API_KEY` - Voice features
- `OPENAI_API_KEY` - Whisper STT fallback

---

## Deployment Checklist

Before each production deploy:

- [ ] All tests pass: `bun run test`
- [ ] Linting passes: `bun run lint`
- [ ] TypeScript checks pass: `bun run typecheck`
- [ ] Build succeeds locally: `bun run build`
- [ ] Environment variables set in Vercel
- [ ] Database migrations applied (if needed): `bun run db:migrate`
- [ ] No secrets in code (run: `bun run secrets:check`)

The website has nothing to test, lint or build. Before deploying it, run it locally (`cd mainpage && npm run dev`, then open `http://127.0.0.1:3000`) and click through the pages.

---

## Database Migrations

Always run migrations before deploying:

```bash
# Generate migration (after schema changes)
bun run db:generate

# Apply to production database
bun run db:migrate
```

---

## Preview Deployments

With the Git integration, every push to a branch creates a preview deployment for each connected project. That is the only way to preview the website: do not run the `vercel` CLI for it (see [Website](#website-merchfromcom)).

For `/app`, a CLI preview runs inside `app/`, as in [Main App](#main-app-appmerchfromcom):

```bash
# Deploy preview (non-production), /app only
cd app
vercel

# The CLI will output a preview URL
```

---

## Rollback

If something goes wrong:

1. **Quick rollback via Vercel Dashboard:**
   - Go to the project in Vercel
   - Find the last working deployment
   - Click "Promote to Production"

2. **Git rollback:**
   ```bash
   git revert HEAD
   git push
   ```

---

## Domain Configuration

### Primary Domains

| Domain | Project | Use |
|--------|---------|-----|
| `merchfrom.com` | mainpage | Website (static) |
| `www.merchfrom.com` | mainpage | Redirect to non-www |
| `app.merchfrom.com` | app | Application |

### Setting up in Vercel

1. Go to Project Settings → Domains
2. Add domain and follow DNS instructions
3. Enable SSL (automatic on Vercel)

---

## Monitoring

- **Vercel Analytics:** Built-in performance monitoring
- **Clerk Dashboard:** Auth metrics
- **Stripe Dashboard:** Payment analytics
- **Neon Dashboard:** Database metrics

---

## Troubleshooting

### Build Failures

```bash
# Clean and rebuild
bun run clean:cache
bun run build
```

The website has no build. If a website deploy runs a build step or serves the wrong files, check its project settings: Framework Preset `Other`, Root Directory `mainpage`, Build Command override on and empty, no `public/` folder in `mainpage`.

### Environment Issues

```bash
# Pull env from Vercel
vercel env pull .env.local
```

### Database Connection Issues

1. Check `DATABASE_URL` is correct
2. Verify IP allowlist in Neon (should be 0.0.0.0/0 for Vercel)
3. Check connection pool limits

---

## Related

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [CLAUDE.md](./CLAUDE.md) - Development guide
