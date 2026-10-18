# PWA - Claude Code Context

**Use this file when working on the PWA with Claude Code. Copy all content below into your prompt.**

---

## 📋 Project Overview

### What is the PWA?
Progressive web app for Blackout Merchandise artists and customers to browse, interact with products, and manage accounts.

### Current Phase
- **Phase**: Phase 1 - MVP
- **Timeline**: Jan - Feb 2026
- **Status**: Foundation work (week 5-6)

### My Role in the Roadmap
PWA is responsible for:
1. Product catalog (Phase 1)
2. User authentication (Phase 1)
3. Cart & checkout (Phase 2)
4. Artist dashboard (Phase 2+)

---

## 🎯 PRD & Context

### Key Requirements (Phase 1)
- Browse product catalog
- User signup/login
- Product filtering and search
- Product detail pages
- 80% of waitlist visitors should access PWA

### Success Metrics
- 80% of waitlist signups visit catalog
- 70% signup completion rate
- Average session: > 2 minutes
- Page load: < 2 seconds
- Return visitors (7-day): > 30%

### Related Documents
- **PRD**: ../../00-PRD-Roadmap/PRD.md
- **Roadmap**: ../../00-PRD-Roadmap/Roadmap.md
- **Database Schema**: ../../05-Shared/Database-Schema.md
- **Design System**: ../../05-Shared/Design-System.md
- **Feature Evaluations**: ../../00-Evaluations/Feature-Evaluations.md

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 19 + Next.js 16
- **State**: Zustand
- **Styling**: Tailwind CSS v4
- **Components**: HeroUI + shadcn/ui + custom
- **Animation**: Framer Motion, GSAP

### Backend (API)
- **Runtime**: Node.js 20
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Authentication**: Clerk (passkeys, magic links)
- **Hosting**: Vercel

### Package Manager
- **PWA**: Use **Bun** (bun install, bun dev, bun build)

---

## 🗂️ Project Structure

```
app/                          # PWA main folder
├── src/
│   ├── app/                  # Next.js App Router routes
│   │   ├── api/              # API routes
│   │   ├── app/              # Protected routes (workshop, showroom)
│   │   └── layout.tsx        # Root layout
│   ├── components/           # React components
│   │   ├── ui/               # Atomic UI components (new)
│   │   ├── sections/         # Page sections (new)
│   │   └── [feature]/        # Feature-specific components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities (ai/, demo/)
│   ├── types/                # TypeScript definitions
│   ├── store/                # Zustand stores
│   └── public/               # Static assets
├── convex/                   # LEGACY - IGNORE (being replaced by Drizzle)
├── bun.lock                  # Bun lock file
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind config
└── tsconfig.json             # TypeScript config
```

---

## 📚 Key Files

### Source of Truth
| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Database schema (Drizzle) |
| `tailwind.config.ts` | Tailwind config + colors |
| `app/middleware.ts` | Clerk auth middleware |
| `Documentation/05-Shared/Design-System.md` | Design tokens |

### Component Patterns
```tsx
// Use PascalCase for React components
export function ProductCard() {
  return <div>Product</div>;
}

// Use kebab-case for utilities/providers
export function useIsMobile() {
  // Check hasMounted to prevent hydration mismatches
}
```

---

## 🎨 Design System

### Color Palette (Dark Mode Only)
- **Background**: zinc-950 or #0a0a0a
- **Text (Primary)**: #FFFFFF
- **Text (Secondary)**: #a3a3a3
- **Accent (Red)**: #E11D48 (recording red for CTAs)
- **Borders**: #27272a
- **Success**: #22c55e
- **Error**: #ef4444

### Typography
- **Headings**: Space Grotesk (quirky, tech-inspired)
- **Body**: Inter (clean, invisible)
- Font loading via next/font

### Spacing
- Use Tailwind defaults (4px base unit)
- px-4 py-2 for small, px-6 py-3 for medium

### Component Library
- Use HeroUI for premium components
- Use shadcn/ui for simple components
- Build custom for unique Merch designs
- Always check Design-System.md before building

---

## 🔐 Authentication

### Clerk Setup
- Middleware already configured in `app/middleware.ts`
- Protected routes: `/app/*`
- Public routes: `/`, `/blog`, etc.
- User data available via `useUser()` hook

### User Data
```tsx
import { useUser } from '@clerk/nextjs';

export function MyComponent() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) return <LoadingSpinner />;
  if (!user) return <SignIn />;
  
  return <div>Hello {user.firstName}</div>;
}
```

---

## 💾 Database Access

### Drizzle Queries
```typescript
import { db } from '@/db';
import { products, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Get all products
const allProducts = await db.select().from(products);

// Get specific product
const product = await db
  .select()
  .from(products)
  .where(eq(products.id, productId));
```

### Schema Location
See `src/db/schema.ts` for complete table definitions including:
- users
- products
- artistStores
- orders
- orderItems
- campaigns

---

## 🚀 Development Commands

```bash
# Install dependencies
bun install

# Development server (http://localhost:3000)
bun dev

# Production build
bun build

# Run built version
bun start

# Type check
bun tsc --noEmit

# Lint
bun lint
```

---

## 📋 Component Naming Conventions

### For React Components
- **PascalCase.tsx** for components: `ProductCard.tsx`, `CategoryFilter.tsx`
- File name matches component name

### For Utilities
- **kebab-case.tsx** for utilities: `use-mobile.tsx`, `smooth-scrolling.tsx`
- Lowercase with hyphens

### Example Structure
```
components/
├── ProductCard.tsx              # React component
├── ProductGrid.tsx              # Container component
├── ui/
│   ├── Button.tsx               # Atomic component
│   └── Modal.tsx                # Atomic component
├── hooks/
│   └── use-product-filter.ts    # Custom hook
└── sections/
    └── ProductCatalog.tsx       # Full-page section
```

---

## 🎯 Styling Best Practices

### Tailwind + Custom Classes
```tsx
import { cn } from '@/lib/utils'; // Tailwind merge utility

export function Button({ variant = 'primary', className, ...props }) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700',
  };
  
  return (
    <button 
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
}
```

### Component Variants Pattern
Use Tailwind for styling, avoid CSS-in-JS when possible.

---

## 🚨 Common Pitfalls

### Hydration Mismatches
Always check `hasMounted` before rendering client-only content:
```tsx
export function useIsMobile() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // ...logic...
  }, []);

  return { isMobile, hasMounted };
}

// In component
if (!hasMounted) return null;
```

### API Route Authentication
Always check Clerk session in API routes:
```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Proceed with authenticated logic
}
```

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile-First Approach
Design for mobile first, then enhance for larger screens:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
</div>
```

---

## 🐛 Debugging Tips

### Check Clerk Session
```tsx
import { currentUser } from '@clerk/nextjs/server';
const user = await currentUser(); // Use in server components
```

### View Database
```bash
bunx drizzle-kit studio  # Opens Drizzle Studio GUI
```

### Browser DevTools
- React DevTools: Check component state/props
- Network tab: Check API responses
- Console: Check errors

---

## 📚 Related Commands

```bash
# Database
bunx drizzle-kit generate  # Generate migrations
bunx drizzle-kit migrate   # Apply migrations
bunx drizzle-kit studio    # Open Drizzle GUI

# Clerk
# Check CLERK_SECRET_KEY is set in .env.local

# Build verification
bun build  # Always run after changes
```

---

## 🔗 Quick Links

- **Codebase Root**: `/path/to/blackout-merchandise`
- **PWA App**: `/path/to/blackout-merchandise/app`
- **Database Schema**: `/path/to/blackout-merchandise/src/db/schema.ts`
- **Design System**: `Documentation/05-Shared/Design-System.md`
- **CLAUDE.md** (in repo): Core development guide

---

**Last Updated**: January 17, 2026
**Ready for Claude Code**: ✅ Yes
