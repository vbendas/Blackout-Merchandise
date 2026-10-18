# Contributing to Blackout Merchandise

> **Last Updated:** October 11, 2026

Thank you for your interest in contributing to Blackout Merchandise! This guide will help you get started.

---

## Quick Start (< 10 minutes)

### Prerequisites

- [Bun](https://bun.sh) installed (v1.0.0+) for the root and `app/`
- Git configured
- Node.js 20+ with npm for `platform/` (npm also runs the website's `dev` script)
- Python 3 for the website's local server (started with `npm run dev`, or directly with `python3 -m http.server 3000 --bind 127.0.0.1` from `mainpage/`)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd blackout-merchandise

# Install dependencies (mainpage needs no install)
bun install                          # Root (drizzle-kit, shared src/db)
cd app && bun install && cd ..       # Main application
cd platform && npm install && cd ..  # Platform

# Set up environment (mainpage needs no env file)
cp .env.example .env.local
# Edit .env.local with your values (the root drizzle config reads ./.env.local)
cp .env.local app/.env.local         # app/ reads its own .env.local
# platform/ also needs its own platform/.env.local. There is no example file for it
# and it reads variables the root .env.example does not list. To see them:
#   grep -rhoE "process\.env\.[A-Z_0-9]+" platform/app platform/lib platform/scripts | sort -u

# Run database migrations (root drizzle-kit, app/ database)
bun run db:migrate

# Platform has its own database and migration history (platform/drizzle):
# migrate it and seed the blank catalog
cd platform && npm run db:migrate && npm run seed && cd ..

# Start development (all three use port 3000: run one at a time)
cd mainpage && npm run dev   # Website (static, python3 http.server on 127.0.0.1:3000)
# OR
cd app && bun dev            # Main application
# OR
cd platform && npm run dev   # Platform
```

The website can also be started from the `mainpage` config in `.claude/launch.json` (same server, port 3000). To run platform next to another project, move it: `cd platform && npm run dev -- -p 3001`.

---

## Project Structure

```
blackout-merchandise/
├── app/           # Main application (Next.js + AI)
├── platform/      # Agent-first platform app (Next.js 16, npm)
├── mainpage/      # Public website: static HTML/CSS/JS, no framework, no build step
├── src/db/        # Shared database schema & operations
└── Documentation/ # Project docs
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow existing code patterns
- Use TypeScript strictly
- Run formatting (app): `cd app && bun run format`
- Website (`mainpage/`): edit the HTML and reload; there is nothing to format, lint or build

### 3. Verify Before Commit

```bash
# Run before committing (checks app/ only)
./verify.sh
```

### 4. Commit

We use conventional commits:

```bash
feat: Add new feature
fix: Fix a bug
docs: Update documentation
refactor: Code change that neither fixes bug nor adds feature
test: Add tests
chore: Build process or auxiliary tool changes
```

Example:
```bash
git commit -m "feat: Add waitlist form validation"
```

---

## Code Standards

### TypeScript

- Enable strict mode
- No `any` types without justification
- Use explicit return types on exports

### Components

- Use PascalCase for components: `UserCard.tsx`
- Use kebab-case for utilities: `format-date.ts`
- One component per file (mostly)

### Styling

- Tailwind CSS v4 (app and platform)
- Dark mode only (no light mode support)
- Use `cn()` utility for class merging

### Database

- Use Drizzle ORM (never Convex - it's deprecated)
- Add indexes for foreign keys and frequent queries
- Use migrations for schema changes

---

## Testing

```bash
cd app

# Unit tests (Vitest)
bun run test:unit

# End-to-end tests (Playwright)
bun run test:e2e

# Type checking
bun run typecheck
```

---

## Pull Request Process

1. **Before submitting:**
   - [ ] All tests pass
   - [ ] Linting passes (`cd app && bun run lint`, `cd platform && npm run lint`)
   - [ ] TypeScript checks pass (`cd app && bun run typecheck`)
   - [ ] Build succeeds (`cd app && bun run build && cd ../platform && npm run build`)
   - [ ] No secrets in code (`cd app && bun run secrets`)

2. **PR Description should include:**
   - What changed
   - Why it changed
   - How to test it
   - Screenshots (for UI changes)

3. **Review Process:**
   - At least one approval required
   - All CI checks must pass
   - Address review comments

---

## Environment Variables

Never commit secrets! Check with:

```bash
cd app && bun run secrets
```

If you need to add a new environment variable:

1. Add to the root `.env.example` with description
2. Add to your local `.env.local` (root, `app/` or `platform/`, whichever reads it)
3. Document in PR description
4. Add to Vercel (maintainers will do this)

---

## Database Changes

### Adding a New Table

1. Edit `src/db/schema.ts`
2. Generate migration:
   ```bash
   bunx drizzle-kit generate
   ```
3. Apply migration locally:
   ```bash
   bun run db:migrate
   ```
4. Platform builds from the same `src/db/schema.ts` but keeps its own migrations in `platform/drizzle`, so generate and apply them there too:
   ```bash
   cd platform && npm run db:generate && npm run db:migrate
   ```
5. Commit the schema change and the migration files in both `drizzle/` and `platform/drizzle/`

### Seeding Data

The blank catalog lives in `platform/lib/catalog` and is seeded by `platform/scripts/seed.ts` (`cd platform && npm run seed`). Add catalog data there.

---

## Getting Help

- **Documentation:** Check [CLAUDE.md](./CLAUDE.md) and [Documentation/](./Documentation/)
- **Troubleshooting:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Discord:** #dev-help channel

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn
- Respect the equal wage model

---

## Equal Wage Model

Blackout Merchandise operates on an equal wage model:

- Everyone earns the same base salary (€1,400/month)
- 30% of net quarterly profits distributed equally
- Vests after 6 months

Contributors are valued for their input, not their title.

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Biome Docs](https://biomejs.dev/guides/)

---

## Questions?

Open an issue or ask in Discord. We're happy to help!
