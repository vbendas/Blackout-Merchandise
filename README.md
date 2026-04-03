# MerchFrom

AI-powered premium merchandise platform for artists and creators. Features three AI "Cat-Suite" brand ambassadors (Leopoldo, Francisca, Antonia) that guide artists through design, production, and sales.

## Quick Start

### Prerequisites
- Node.js 20+
- Bun (for /app)
- npm (for /mainpage)
- PostgreSQL database (Neon)
- Clerk account (auth)
- Stripe account (payments)

### Setup

1. **Clone and install dependencies**
   ```bash
   # App (uses Bun)
   cd app
   bun install

   # Mainpage (uses npm)
   cd mainpage
   npm install
   ```

2. **Configure environment**
   ```bash
   # Copy and configure .env files
   cp app/.env.example app/.env.local
   cp mainpage/.env.example mainpage/.env.local
   ```

3. **Run database migrations**
   ```bash
   bunx drizzle-kit generate
   bunx drizzle-kit migrate
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Main app (port 3000)
   cd app && bun dev

   # Terminal 2 - Marketing page (port 3001)
   cd mainpage && npm run dev
   ```

## Project Structure

```
/Merch-From
├── /app              # Main application (Next.js 16, React 19)
│   └── src/
│       ├── app/      # API routes & protected pages
│       ├── components/
│       ├── hooks/
│       ├── lib/      # AI, utilities
│       └── types/
├── /mainpage         # Marketing landing page
├── /src              # Shared backend (Drizzle ORM)
│   └── db/           # Database schema & operations
└── /Documentation    # Project docs
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| UI Components | HeroUI, Catalyst UI, shadcn/ui |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Clerk |
| Payments | Stripe |
| AI | MiniMax M2-her (LLM), MiniMax Speech 2.6 (Voice) |

## Commands

### App
```bash
cd app
bun install          # Install deps
bun dev              # Dev server
bun build            # Production build
bun lint             # ESLint
bun typecheck        # TypeScript
bun test:unit        # Unit tests
```

### Mainpage
```bash
cd mainpage
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
```

### Database
```bash
bunx drizzle-kit generate   # Create migration
bunx drizzle-kit migrate    # Apply migration
bunx drizzle-kit studio     # GUI editor
```

## Documentation

- [Full Documentation](./Documentation/)
- [Product Requirements](./Documentation/PRD.md)
- [Development Roadmap](./Documentation/02-Roadmap/Roadmap.md)
- [AI System Prompts](./Documentation/05-Shared/AI-System-Prompts.md)

## Environment Variables

See `.env.example` in each project for required variables:

- `DATABASE_URL` - PostgreSQL connection
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - Auth
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` - Payments
- `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID` - AI (LLM + Voice)

## License

Proprietary - All rights reserved.
