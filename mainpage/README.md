# MerchFrom Marketing Page

Public landing page showcasing the MerchFrom platform with Cat-Suite AI ambassadors.

## Getting Started

```bash
# Install dependencies (uses npm)
npm install

# Copy environment file
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or port 3000 if app not running)

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI:** HeroUI, Catalyst UI
- **Animation:** Framer Motion, GSAP

## Project Structure

```
src/
├── app/
│   ├── waitlist/      # Waitlist signup page
│   └── layout.tsx     # Root layout
├── components/
│   ├── sections/      # Page sections (CTA, features, quality)
│   ├── layout/        # Navbar, Footer
│   └── ui/            # Atomic components
└── hooks/             # Custom hooks
```

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

See `.env.example` for full list.
