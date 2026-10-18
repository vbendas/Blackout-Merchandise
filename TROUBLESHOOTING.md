# Troubleshooting Guide

> **Last Updated:** January 30, 2026

Common issues and solutions for Blackout Merchandise development.

---

## Quick Fixes

### "Module not found" errors

```bash
# Clean install everything
bun run clean
bun install
cd app && bun install
cd ../mainpage && bun install
```

### Build failures

```bash
# Clear Next.js cache
bun run clean:cache

# Then rebuild
bun run build:all
```

### Database connection errors

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Test connection
bun run db:studio
```

---

## Package Manager Issues

### Error: "Cannot find module" after switching from npm

**Cause:** Old `node_modules` or lockfiles

**Fix:**
```bash
# Remove all node_modules and lockfiles
rm -rf node_modules app/node_modules mainpage/node_modules
rm -f package-lock.json app/package-lock.json mainpage/package-lock.json

# Reinstall with Bun
bun install
cd app && bun install
cd ../mainpage && bun install
```

### Error: "bun: command not found"

**Fix:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or update
bun upgrade
```

---

## Database Issues

### "relation does not exist" error

**Cause:** Database not migrated

**Fix:**
```bash
# Run migrations
bun run db:migrate

# Or reset and reseed (dev only!)
bun run db:reset
bun run db:seed
```

### "too many connections" error (Neon)

**Cause:** Connection pool exhausted

**Fix:**
1. Check for connection leaks in code
2. Ensure you're using the serverless driver
3. Consider adding connection pooling (PgBouncer)

### Drizzle Studio won't start

```bash
# Make sure you're in project root
cd /path/to/blackout-merchandise

# Run with explicit config
bunx drizzle-kit studio --config=drizzle.config.ts
```

---

## Authentication Issues

### "Unable to verify JWT" (Clerk)

**Cause:** Missing or incorrect Clerk environment variables

**Fix:**
1. Check `.env.local` has:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
2. Verify keys are for the correct environment (dev vs prod)
3. Restart dev server after changing env vars

### Clerk webhook failing

**Cause:** Webhook secret mismatch or payload verification failing

**Fix:**
1. Check `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
2. Ensure webhook URL is correct in Clerk dashboard
3. Check Vercel logs for webhook errors

---

## Build & Type Errors

### "Cannot find module '@/db/schema'"

**Cause:** Path alias not resolving

**Fix:**
1. Check `tsconfig.json` has paths configured:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. Restart TypeScript server in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

### Tailwind classes not working

**Cause:** Tailwind v4 uses different config

**Fix:**
1. Ensure you're using `@import "tailwindcss"` in CSS
2. Check `postcss.config.mjs` exists and is correct
3. Clear `.next` cache: `bun run clean:cache`

### Biome formatting not working in VS Code

**Fix:**
1. Install Biome extension
2. Check `.vscode/settings.json` has:
```json
{
  "editor.defaultFormatter": "biomejs.biome"
}
```
3. Reload VS Code window

---

## AI / OpenRouter Issues

### "401 Unauthorized" from OpenRouter

**Cause:** Invalid or missing API key

**Fix:**
1. Check `OPENROUTER_API_KEY` is set
2. Verify key at https://openrouter.ai/keys
3. Check if billing is set up on OpenRouter

### AI responses are slow

**Cause:** Model latency or rate limiting

**Fix:**
1. Check OpenRouter status page
2. Consider using a faster model for initial responses
3. Implement response streaming

---

## Stripe Issues

### "No such payment_intent" webhook error

**Cause:** Webhook from different Stripe environment

**Fix:**
1. Ensure `STRIPE_WEBHOOK_SECRET` matches your environment
2. Check if webhook is configured for test vs live mode
3. Re-create webhook endpoint if needed:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Payment confirmation fails

**Cause:** Publishable key mismatch

**Fix:**
1. Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` matches your account
2. Ensure frontend and backend keys are from same environment (test/live)

---

## Git / Pre-commit Issues

### Pre-commit hook failing

```bash
# Run verification manually to see errors
./verify.sh

# Or skip hook (emergency only!)
git commit --no-verify
```

### "husky - .git can't be found"

**Cause:** Running husky from subdirectory

**Fix:** This is a warning, not an error. The hook still works from root.

---

## Development Server Issues

### Port 3000 already in use

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
bun dev -- --port 3001
```

### "Cannot GET /" after navigation

**Cause:** Next.js App Router routing issue

**Fix:**
1. Check `app/page.tsx` exists
2. Ensure no conflicting `pages/index.tsx`
3. Clear `.next` cache

---

## Environment Variables

### Variables not loading

**Checklist:**
1. File is named `.env.local` (not `.env`)
2. No spaces around `=` in the file
3. Variables start with `NEXT_PUBLIC_` to be accessible in browser
4. Server restarted after changing env vars

### Secret leaking in build

**Fix:**
1. Never commit `.env.local`
2. Check `.gitignore` includes `*.local`
3. Run `bun run secrets:check`

---

## Getting Help

If you're stuck:

1. Check logs: `bun run dev` output or Vercel logs
2. Review [CLAUDE.md](./CLAUDE.md) for conventions
3. Check recent commits for breaking changes
4. Ask in Discord #dev-help channel

---

## Common Command Reference

```bash
# Full reset (nuclear option)
bun run clean
bun install
bun run db:migrate
bun run db:seed

# Verify everything works
bun run verify

# Build both projects
bun run build:all
```
