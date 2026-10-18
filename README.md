# Blackout Merchandise

AI-powered premium merchandise platform for artists and creators. Features three AI "Cat-Suite" brand ambassadors (Leopoldo, Francisca, Antonia) that guide artists through design, production, and sales.

## Quick Start

### Prerequisites
- Node.js 20+
- Bun (for /app)
- npm (for /platform)
- Python 3 (static server for /mainpage)
- PostgreSQL database (Neon)
- Clerk account (auth)
- Stripe account (payments)

### Setup

1. **Clone and install dependencies**
   ```bash
   # App (uses Bun)
   cd app
   bun install

   # Platform (uses npm)
   cd ../platform
   npm install
   ```
   Mainpage is a static site: nothing to install.

2. **Configure environment**
   ```bash
   # Copy and configure .env files
   cp .env.example app/.env.local
   cp .env.example platform/.env.local   # platform reads its own .env.local
   ```
   The root `.env.example` lists the app's variables. Platform needs more keys than it lists (see Environment Variables below).

3. **Run database migrations**
   ```bash
   bunx drizzle-kit generate
   bunx drizzle-kit migrate
   ```

4. **Start development servers**
   ```bash
   # Main app (port 3000)
   cd app && bun dev

   # Platform (port 3000)
   cd platform && npm run dev

   # Website, static (127.0.0.1:3000)
   cd mainpage && npm run dev
   ```
   All three use port 3000: run one at a time or move one, e.g. `cd platform && npm run dev -- -p 3001`.

## Project Structure

```
/blackout-merchandise
├── /app              # Main application (Next.js 16, React 19)
│   └── src/
│       ├── app/      # API routes & protected pages
│       ├── components/
│       ├── hooks/
│       ├── lib/      # AI, utilities
│       └── types/
├── /mainpage         # Website: static HTML/CSS/JS, no framework, no build step
│                     #   (members-only door, apply flow, press board, faq/, agents/, watch/, studio/)
├── /platform         # Agent-first platform app (Next.js 16, React 19)
│   └── lib/catalog/  # Blank-catalog source of truth
├── /src              # Shared backend (Drizzle ORM)
│   └── db/           # Database schema & operations
└── /Documentation    # Project docs
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 (app, platform) |
| Website | Static HTML/CSS/JS (mainpage) |
| UI Components | shadcn/ui (app, platform) |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Clerk |
| Payments | Stripe |
| AI (app) | Mistral, MiniMax, ElevenLabs |
| AI (platform) | Anthropic, fal, ElevenLabs |

## Commands

### App
```bash
cd app
bun install          # Install deps
bun dev              # Dev server
bun run build        # Production build
bun lint             # ESLint
bun typecheck        # TypeScript
bun test:unit        # Unit tests
```

### Platform
```bash
cd platform
npm install          # Install deps
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm run db:migrate   # Apply platform migrations (platform/drizzle)
npm run seed         # Seed the blank catalog (needs DATABASE_URL in platform/.env.local)
```

### Mainpage
```bash
cd mainpage
npm run dev          # Static server (python3 http.server, 127.0.0.1:3000)
```
No install, build or lint step.

### Database
```bash
bunx drizzle-kit generate   # Create migration
bunx drizzle-kit migrate    # Apply migration
bunx drizzle-kit studio     # GUI editor
```

## Documentation

- [Full Documentation](./Documentation/)
- [Product Requirements](./Documentation/PRD.md)
- [Development Roadmap](./Documentation/05-Roadmap/Roadmap.md)
- [AI System Prompts](./Documentation/03-Cat-Suite/AI-System-Prompts.md)

## Environment Variables

See the root `.env.example` for the app's variables (mainpage needs none):

- `DATABASE_URL` - PostgreSQL connection
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - Auth
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` - Payments
- `MISTRAL_API_KEY` - AI
- `ELEVENLABS_API_KEY` - Voice

Platform reads `platform/.env.local`, and the root `.env.example` does not list every key it uses (for example `FAL_API_KEY`, `ELEVENLABS_AGENT_ID` and `RESEND_API_KEY`). See `process.env` usage in `platform/lib`, `platform/app` and `platform/scripts`, and [Platform-Plan.md](./Documentation/Dev/Platform-Plan.md).

## License

Proprietary - All rights reserved.
