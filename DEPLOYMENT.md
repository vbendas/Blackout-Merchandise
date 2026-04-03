# Deployment Guide

> **Last Updated:** January 30, 2026

This guide covers deploying the MerchFrom applications to Vercel.

---

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed: `bun i -g vercel`
- Access to the MerchFrom Vercel team
- Environment variables ready (see `.env.example` in each project)

---

## Project Structure

We deploy two separate projects from this monorepo:

| Project | Directory | Vercel Project | Domain |
|---------|-----------|----------------|--------|
| Marketing Site | `/mainpage` | `merch-from-mainpage` | `merchfrom.com` |
| Main App | `/app` | `merch-from-app` | `app.merchfrom.com` |

---

## Quick Deploy

### Marketing Site (merchfrom.com)

```bash
# From project root
cd mainpage

# Login to Vercel (first time only)
vercel login

# Link to existing project (first time only)
vercel link

# Deploy to production
vercel --prod
```

### Main App (app.merchfrom.com)

```bash
# From project root
cd app

# Deploy to production
vercel --prod
```

---

## Environment Variables

### Marketing Site (`/mainpage`)

Set these in Vercel dashboard or via CLI:

```bash
vercel env add DATABASE_URL
```

Required variables:
- `DATABASE_URL` - Neon PostgreSQL connection string

Optional:
- `NEXT_PUBLIC_GA_ID` - Google Analytics
- `NEXT_PUBLIC_META_PIXEL_ID` - Meta Pixel

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

Every push to a branch creates a preview deployment:

```bash
# Deploy preview (non-production)
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
| `merchfrom.com` | mainpage | Marketing site |
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
