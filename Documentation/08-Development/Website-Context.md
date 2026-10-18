# Website - Claude Code Context

**Use this file when working on the marketing website with Claude Code. Copy all content below into your prompt.**

---

## 📋 Project Overview

### What is the Website?
Blackout Merchandise marketing landing page showcasing the platform and collecting waitlist signups.

### Current Phase
- **Phase**: Phase 1 - MVP
- **Timeline**: Jan - Feb 2026
- **Status**: In Progress (80% complete)

### My Role in the Roadmap
Website is responsible for:
1. Product marketing (Phase 1)
2. Waitlist signup (Phase 1)
3. Feature education (Phase 1)
4. Blog/content (Phase 2+)

---

## 🎯 PRD & Context

### Key Requirements (Phase 1)
- Hero section with strong value prop
- Feature showcase sections
- Social proof (avatars, testimonials)
- Waitlist CTA section
- Footer with navigation
- Mobile-responsive design
- Fast load times (< 2s)

### Success Metrics
- 1,000 waitlist signups
- 5-10% conversion rate
- < 2s page load time
- Mobile visitors: 60%+
- Core Web Vitals: All green

### Related Documents
- **PRD**: ../../00-PRD-Roadmap/PRD.md
- **Roadmap**: ../../00-PRD-Roadmap/Roadmap.md
- **Design System**: ../../05-Shared/Design-System.md
- **Feature Evaluations**: ../../00-Evaluations/Feature-Evaluations.md

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 19 + Next.js 16
- **Styling**: Tailwind CSS v4
- **Components**: HeroUI, Catalyst UI, custom
- **Animation**: Framer Motion, GSAP, Lenis (smooth scroll)
- **Icons**: Use HeroUI or custom SVG

### Package Manager
- **Website**: Use **npm** (npm install, npm run dev, npm run build)

---

## 🗂️ Project Structure

```
mainpage/                         # Website main folder
├── src/
│   ├── app/
│   │   ├── globals.css           # Global Tailwind styles
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page
│   │   └── [other pages]/        # Dynamic pages
│   ├── components/
│   │   ├── sections/             # Full-page sections
│   │   │   ├── cta/              # Call-to-action sections
│   │   │   ├── features/         # Feature showcase
│   │   │   ├── quality/          # Production quality
│   │   │   └── [more]/
│   │   ├── ui/                   # Atomic UI components
│   │   │   ├── morphing-text.tsx
│   │   │   ├── Button.tsx
│   │   │   └── [more]/
│   │   ├── layout/               # Layout components
│   │   │   ├── navbar.tsx
│   │   │   └── footer.tsx
│   │   ├── catalyst/             # Headless components (Tailwind Labs)
│   │   ├── floating-socials.tsx  # Utility components
│   │   └── [standalone].tsx      # Top-level components
│   ├── hooks/                    # Custom React hooks
│   │   └── use-is-mobile.tsx     # Mobile detection
│   ├── providers/                # React providers
│   └── public/                   # Static assets
│       ├── logo/
│       ├── avatars/              # Cat-Suite characters
│       └── [images]/
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind config
└── package.json                  # NPM dependencies
```

---

## 🎨 Design System

### Color Palette (Dark Mode Only)
- **Background**: #000000 (pure black for landing)
- **Text (Primary)**: #FFFFFF
- **Text (Secondary)**: #a3a3a3
- **Accent**: Gold Sheen Gradient (CTAs, highlights)
  - `linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)`
- **Gold Glow**: `box-shadow: 0 0 60px rgba(212, 175, 55, 0.15);`

### Typography
- **Headings**: Space Grotesk
- **Body**: Inter
- Font loading via `next/font`

### Spacing & Layout
- 12-column responsive grid
- Padding: 20px mobile, 40px tablet, 60px desktop
- Margins: Use Tailwind spacing scale

---

## 🚀 Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Run built version
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

---

## 📋 Component Organization

### Sections (Full-Page Components)
Organized by purpose (features, CTA, quality, etc.):
```
components/sections/
├── cta/
│   └── WaitlistCTA.tsx           # Waitlist form
├── features/
│   └── Features.tsx              # Feature showcase
├── quality/
│   └── ProductionQuality.tsx     # Quality specs
```

### UI Components (Atomic)
Reusable, small components:
```
components/ui/
├── Button.tsx                    # Button variants
├── morphing-text.tsx             # Animated text
├── Modal.tsx                     # Modal dialog
```

### Naming Conventions
- **PascalCase.tsx** for components: `WaitlistCTA.tsx`
- **kebab-case.tsx** for utilities: `floating-socials.tsx`

---

## 🎬 Current Sections

### Completed ✅
- Hero section
- Avatar trio (Leopoldo, Francisca, Antonia)
- Masonry grid portfolio
- Feature marquees
- Horizontal scroll section
- Production quality specs
- Waitlist CTA
- Footer

### In Progress 🔄
- Form validation & submission
- Email integration
- Analytics tracking

### Pending ⏳
- /waitlist dedicated page
- Blog section
- Testimonials

---

## 🌟 Key Features to Understand

### Morphing Text Animation
See `components/ui/morphing-text.tsx` for animated text that cycles through phrases.

### Marquee Component
Auto-scrolling text, used for feature highlights. Check imports from shadcn/ui.

### Floating Social Links
See `components/floating-socials.tsx` - sticky sidebar with social icons.

### Gradual Blur Effect
See `components/gradual-blur-bottom.tsx` - fade effect at bottom of sections.

---

## 🖼️ Asset Management

### Avatar Assets
Location: `public/avatars/[character]/[expression]`

Characters:
- Leopoldo (male cat, orange)
- Francisca (female cat, pink/red)
- Antonia (female cat, purple)

Expressions (20 per character):
- neutral, speaking_a, speaking_b
- happy, excited, thinking, confused
- shocked, sad, angry_annoyed
- wink, love, sleepy, mischievous
- proud, mouth_closed, mouth_o_shape
- mouth_wide_open, mouth_teeth_showing, blep

### Using in Components
```tsx
import Image from 'next/image';

<Image
  src="/avatars/leopoldo/happy"
  alt="Leopoldo cat happy expression"
  width={200}
  height={200}
/>
```

### Cloudinary Integration
In production, images optimized via Cloudinary CDN:
```
f_auto,q_auto - auto format and quality
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind)
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Mobile-First Pattern
```tsx
<div className="
  px-4 md:px-8 lg:px-16              // Responsive padding
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  // Grid cols
  text-sm md:text-base lg:text-lg    // Font sizes
">
  {/* Content */}
</div>
```

---

## 🔗 Navigation Structure

### Header/Navbar
- Logo (clickable → home)
- Navigation links (About, Features, etc.)
- Waitlist CTA button

### Footer
- Company info
- Links (Privacy, Terms, etc.)
- Social media
- Newsletter signup
- Copyright

---

## 🐛 Common Issues

### Hydration Mismatches
Always check `hasMounted` in client components:
```tsx
export function useIsMobile() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null; // Prevent mismatch
}
```

### Image Optimization
Always use Next.js `Image` component:
```tsx
import Image from 'next/image';

<Image
  src="/path/to/image"
  alt="Description"
  width={400}
  height={300}
  priority  // For above-fold images
/>
```

### Viewport Metadata Warning
✅ Next.js recommends moving viewport to separate export. See `app/layout.tsx`.

---

## 🎯 Forms & Validation

### Waitlist Form Requirements
- Email input (required)
- Name input (optional)
- Submit button
- Success message
- Error handling
- Spam protection (CAPTCHA if needed)

### Form Data
Should post to API endpoint that:
1. Validates email
2. Checks for duplicates
3. Stores in database
4. Sends confirmation email

---

## 📊 Analytics Setup

### Events to Track
- Page views
- Form submissions
- Button clicks (CTA sections)
- Section views (scroll tracking)
- Bounce rate
- Session duration

### Tools
- Google Analytics 4 (or alternative)
- Set up in layout.tsx

---

## 🚨 Performance Tips

### Optimize Images
- Use Next.js Image component
- Provide width/height
- Use `priority` for LCP images
- Convert to WebP when possible

### Code Splitting
- Use dynamic imports for heavy components
- Lazy load below-fold content

### CSS
- Tailwind purges unused styles
- Minimize custom CSS

### Load Time Targets
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1

---

## 📚 Related Files

- **Design System**: ../../05-Shared/Design-System.md
- **CLAUDE.md**: Root development guide
- **Tailwind Config**: `tailwind.config.ts`

---

**Last Updated**: January 17, 2026
**Ready for Claude Code**: ✅ Yes
