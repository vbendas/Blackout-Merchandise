# Blackout Merchandise App

Main application with AI-powered Cat-Suite brand ambassadors, e-commerce, and workspace features.

## Getting Started

```bash
# Install dependencies (uses Bun)
bun install

# Copy environment file
cp .env.example .env.local

# Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server |
| `bun build` | Production build |
| `bun lint` | ESLint check |
| `bun typecheck` | TypeScript check |
| `bun test:unit` | Unit tests (Vitest) |
| `bun test:e2e` | E2E tests (Playwright) |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **React:** 19
- **Styling:** Tailwind CSS v4
- **UI:** HeroUI, shadcn/ui, Catalyst UI
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Clerk
- **Payments:** Stripe
- **AI:** MiniMax M2-her, MiniMax Speech 2.6

## Environment Variables

Required in `.env.local`:

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...
```

See `.env.example` for full list.

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── ai/        # AI chat, voice
│   │   ├── data-rights/  # GDPR endpoints
│   │   └── webhooks/  # Stripe, Clerk
│   └── app/           # Protected pages
│       ├── workspace/
│       ├── workshop/
│       └── showroom/
├── components/        # React components
├── hooks/             # Custom hooks
├── lib/               # Utilities
│   ├── ai/            # AI provider, responses
│   └── db/            # DB operations
└── types/             # TypeScript types
```

## API Routes

- `POST /api/ai/chat` - AI conversation (MiniMax M2-her)
- `POST /api/ai/voice` - Voice processing (MiniMax Speech)
- `GET /api/data-rights/access` - GDPR data export
- `DELETE /api/data-rights/deletion` - GDPR data deletion
- `GET /api/data-rights/portability` - GDPR data portability
- `POST /api/waitlist` - Waitlist signup
- `GET /api/waitlist/stats` - Signup analytics

## Development Notes

- Uses Bun as package manager
- Strict TypeScript mode
- ESLint with React hooks rules
- Vitest for unit tests
- Playwright for E2E tests
