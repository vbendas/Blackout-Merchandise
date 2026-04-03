# Contributing to MerchFrom

> **Last Updated:** January 30, 2026

Thank you for your interest in contributing to MerchFrom! This guide will help you get started.

---

## Quick Start (< 10 minutes)

### Prerequisites

- [Bun](https://bun.sh) installed (v1.0.0+)
- Git configured
- Node.js 20+ (for some tools)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd Merch-From

# Install dependencies for all projects
bun install
bun run install:all

# Set up environment
cp app/.env.example app/.env.local
cp mainpage/.env.example mainpage/.env.local
# Edit both .env.local files with your values

# Run database migrations
bun run db:migrate

# Seed the database (optional, for development)
bun run db:seed

# Start development
bun run dev:mainpage  # Marketing site
# OR
bun run dev:app       # Main application
```

---

## Project Structure

```
Merch-From/
├── app/           # Main application (Next.js + AI)
├── mainpage/      # Marketing site (Next.js)
├── src/db/        # Shared database schema & operations
├── Documentation/ # Project docs
└── .vscode/       # VS Code settings (recommended extensions)
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
- Run formatting: `bun run format`

### 3. Verify Before Commit

```bash
# This runs automatically on pre-commit
bun run verify
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

- Tailwind CSS v4
- Dark mode only (no light mode support)
- Use `cn()` utility for class merging

### Database

- Use Drizzle ORM (never Convex - it's deprecated)
- Add indexes for foreign keys and frequent queries
- Use migrations for schema changes

---

## Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Type checking
bun run typecheck
```

---

## Pull Request Process

1. **Before submitting:**
   - [ ] All tests pass
   - [ ] Linting passes (`bun run lint`)
   - [ ] TypeScript checks pass (`bun run typecheck`)
   - [ ] Build succeeds (`bun run build:all`)
   - [ ] No secrets in code (`bun run secrets:check`)

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
bun run secrets:check
```

If you need to add a new environment variable:

1. Add to `.env.example` with description
2. Add to `.env.local` (your local copy)
3. Document in PR description
4. Add to Vercel (maintainers will do this)

---

## Database Changes

### Adding a New Table

1. Edit `src/db/schema.ts`
2. Generate migration:
   ```bash
   bun run db:generate
   ```
3. Apply migration locally:
   ```bash
   bun run db:migrate
   ```
4. Commit both schema changes and migration files

### Seeding Data

Add to `src/db/seed.ts` if it's useful for all developers.

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

MerchFrom operates on an equal wage model:

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
