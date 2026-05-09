# Design System

**Last Updated**: January 17, 2026
**Version**: 1.0
**Scope**: Landing page, PWA, all projects

---

## 🎨 Color Palette

### Primary Colors (Dark Mode Only)

| Name | Hex | Use Case | Tailwind |
|------|-----|----------|----------|
| Background (Landing) | #000000 | Landing page BG | black |
| Background (App) | #0a0a0a | App BG, cards | zinc-950 |
| Text Primary | #FFFFFF | All text | white |
| Text Secondary | #a3a3a3 | Muted text | zinc-400 |
| Border | #27272a | Card borders | zinc-800 |

### Accent Colors

| Name | Hex | Use Case | Tailwind |
|------|-----|----------|----------|
| Recording Red | #E11D48 | CTAs, active states | rose-600 |
| Gold (Gradient) | #D4AF37 - #F5E6A3 | Landing CTAs, highlights | gradient |
| Gold Glow | rgba(212, 175, 55, 0.15) | Box shadow | custom |
| Success | #22c55e | Success messages | green-500 |
| Error | #ef4444 | Error messages | red-500 |
| Warning | #f97316 | Warning messages | orange-500 |

### Gold Sheen Effect (Landing Page)

```css
background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
box-shadow: 0 0 60px rgba(212, 175, 55, 0.15);
```

---

## 🔤 Typography

### Font Families

| Use | Font | Provider | Weight |
|-----|------|----------|--------|
| Headings | Space Grotesk | Google Fonts | 400, 600, 700 |
| Body | Inter | Google Fonts | 400, 500, 600 |
| Code | Fira Code | Google Fonts | 400, 500 |

### Font Loading

```typescript
// app/layout.tsx
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-space-grotesk',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
});
```

### Type Scale

| Size | Class | px | Usage |
|------|-------|-----|--------|
| **xs** | text-xs | 12px | Labels, captions |
| **sm** | text-sm | 14px | Body text, input |
| **base** | text-base | 16px | Primary body |
| **lg** | text-lg | 18px | Larger text, buttons |
| **xl** | text-xl | 20px | Section subheading |
| **2xl** | text-2xl | 24px | Section heading |
| **3xl** | text-3xl | 30px | Page heading |
| **4xl** | text-4xl | 36px | Hero heading |
| **5xl** | text-5xl | 48px | Large hero |

### Text Styling

**Headings**
- Font: Space Grotesk
- Weight: 600-700
- Line height: 1.2
- Letter spacing: -0.5px (for emphasis)

**Body**
- Font: Inter
- Weight: 400
- Line height: 1.6
- Letter spacing: 0

**Buttons**
- Font: Inter
- Weight: 600
- Uppercase for CTAs
- Letter spacing: 0.5px

---

## 📏 Spacing & Layout

### Spacing Scale

```
0: 0px
1: 4px
2: 8px
3: 12px
4: 16px
6: 24px
8: 32px
10: 40px
12: 48px
16: 64px
20: 80px
24: 96px
```

### Component Padding

| Component | Padding | Example |
|-----------|---------|---------|
| Small button | px-4 py-2 | 16px × 8px |
| Regular button | px-6 py-3 | 24px × 12px |
| Large button | px-8 py-4 | 32px × 16px |
| Input field | px-4 py-2 | 16px × 8px |
| Card | p-6 | 24px all sides |
| Section | py-12 md:py-20 | Responsive padding |

### Responsive Breakpoints

```
Mobile:  < 640px
Tablet:  640px - 1024px
Desktop: > 1024px
```

### Container Widths

```
Mobile:  full (with padding)
Tablet:  90% (max 800px)
Desktop: 1200px (with padding)
```

---

## 🎯 Components

### Button

**Variants**
```tsx
// Primary (CTA)
<Button variant="primary">Sign Up</Button>
// bg-rose-600 text-white hover:bg-rose-700

// Secondary
<Button variant="secondary">Learn More</Button>
// bg-zinc-800 text-white hover:bg-zinc-700

// Outline
<Button variant="outline">Browse</Button>
// border-2 border-zinc-400 text-white hover:bg-zinc-900
```

**Sizes**
- **sm**: px-3 py-1.5, text-sm
- **md**: px-4 py-2, text-base (default)
- **lg**: px-6 py-3, text-lg

### Input Field

```tsx
<input
  className="
    px-4 py-2
    bg-zinc-900
    border border-zinc-800
    rounded-lg
    text-white placeholder-zinc-500
    focus:border-rose-600 focus:ring-1 focus:ring-rose-600
  "
/>
```

### Card

```tsx
<div className="
  bg-zinc-900
  border border-zinc-800
  rounded-lg
  p-6
  hover:border-zinc-700 transition
">
  {/* content */}
</div>
```

### Badge

```tsx
// Neutral
<span className="bg-zinc-800 text-zinc-200 px-3 py-1 rounded-full text-sm">
  Label
</span>

// Success
<span className="bg-green-900 text-green-200 px-3 py-1 rounded-full text-sm">
  Active
</span>

// Error
<span className="bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm">
  Error
</span>
```

---

## ✨ Animation Standards

### Timing Functions
- **Fast interactions**: 150ms (opacity, color)
- **Medium interactions**: 300ms (slides, fades)
- **Slow animations**: 500ms+ (hero, attention-grab)

### Easing
- Ease in/out for smooth motion
- Linear for continuous animations
- Custom cubic-bezier for special effects

### Accessibility
- Respect `prefers-reduced-motion`
- Never auto-play animations on load
- Keep motion under 500ms for accessibility

---

## 🌍 Dark Mode

**All designs are dark mode only.**

No light mode support per project requirements.

### Implementation
```tsx
// Tailwind config includes dark: 'class'
// No light mode variants needed
// All colors are for dark background
```

---

## ♿ Accessibility

### WCAG 2.1 AA Compliance

**Colors**
- Text contrast ratio: 4.5:1 minimum
- Interactive elements: 3:1 minimum
- Gold text: Consider contrast (may need outline)

**Typography**
- Minimum font size: 14px for body text
- Line height: 1.5 minimum
- Line length: 50-75 characters for readability

**Interactive Elements**
- Minimum touch target: 44×44px
- Focus indicators: Visible and clear
- Keyboard navigation: Full support

### Best Practices
- Use semantic HTML (`<button>`, `<a>`, `<label>`)
- Provide alt text for images
- Use ARIA labels for icons
- Test with keyboard navigation
- Use screen reader testing tools

---

## 📏 Responsive Images

### Image Optimization
```tsx
<Image
  src="/path/to/image"
  alt="Descriptive text"
  width={400}
  height={300}
  priority={isAboveFold}
  className="w-full h-auto"
/>
```

### Image Sizes

| Use | Dimensions | Notes |
|-----|-----------|-------|
| Hero | 1920×1080 | Full width, optimized |
| Product | 400×400 | Square, optimized |
| Avatar | 200×200 | Circle crop in CSS |
| Icon | 24×24 or 32×32 | SVG preferred |
| Thumbnail | 150×150 | Small preview |

### CDN Optimization
Use Cloudinary for production images:
- Auto format (WebP/AVIF)
- Auto quality
- Responsive sizing
- Example: `f_auto,q_auto,w_400`

---

## 🎬 Avatar System

### Cat-Suite Characters

| Character | Color | Personality |
|-----------|-------|-------------|
| **Leopoldo** | Orange | Friendly guide, warm |
| **Francisca** | Pink/Red | Creative, energetic |
| **Antonia** | Purple | Professional, supportive |

### Expressions (20 per character)
- neutral
- speaking_a, speaking_b
- happy, excited
- thinking, confused
- shocked, sad
- angry_annoyed, wink
- love, sleepy
- mischievous, proud
- mouth_closed, mouth_o_shape
- mouth_wide_open, mouth_teeth_showing
- blep

### Using Avatars
```tsx
<Image
  src={`/avatars/${character}/${expression}`}
  alt={`${character} looking ${expression}`}
  width={200}
  height={200}
/>
```

---

## 📱 Mobile-First Approach

### Design for Mobile First
1. Design core experience for small screens
2. Enhance for tablet breakpoints
3. Optimize for desktop

### Responsive Pattern
```tsx
<div className="
  // Mobile default
  grid-cols-1 gap-4 px-4
  // Tablet
  md:grid-cols-2 md:gap-6 md:px-8
  // Desktop
  lg:grid-cols-3 lg:gap-8 lg:px-12
">
```

---

## 🔗 Design System Files

| File | Location |
|------|----------|
| Tailwind Config | app/tailwind.config.ts, mainpage/tailwind.config.ts |
| Color Palette | This file |
| Component Library | app/src/components/ui/, mainpage/src/components/ui/ |
| Token Reference | This file (typography, spacing) |

---

## 🎙️ CatChat Voice Input Modes

### Input Area Layout
```
┌──────────────────────────────────────────────────────────┐
│  CatChat Input Area                                      │
│                                                          │
│  [Type message...]                    [🎤] [🗣️] [➤]    │
│                                                          │
│  🎤 = Speak-to-Text (hold to speak, one-shot)            │
│  🗣️ = Talk (continuous conversation mode)               │
│  ➤  = Send text message                                  │
└──────────────────────────────────────────────────────────┘
```

### Speak-to-Text Mode (🎤)
- **Trigger:** Hold mic button (mouseDown/touchStart)
- **Behavior:** Records audio while held, sends on release
- **Visual:** Pulsing red ring around button while recording
- **Result:** Transcript appears as user message, agent replies with text + optional audio
- **One-shot:** Single turn, then returns to idle

### Talk Mode (🗣️)
- **Trigger:** Click talk button
- **Behavior:** Starts continuous voice conversation
- **Visual States:**

| State | Button Style | Indicator |
|-------|-------------|-----------|
| **Idle** | Default outline | No indicator |
| **Listening** | Red pulsing glow | "Listening..." text |
| **Agent Thinking** | Amber pulse | Avatar shows `thinking` expression |
| **Agent Speaking** | Green glow | Avatar cycles `speaking_a`/`speaking_b` |
| **Ended** | Returns to idle | Click button again or say "stop" |

### Talk Mode UI Overlay
When Talk mode is active, a minimal overlay appears:
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    ┌──────────┐                          │
│                    │  🐱 🗣️  │  ← Agent avatar           │
│                    │ Speaking │     with expression       │
│                    └──────────┘                          │
│                                                          │
│              "I found your order in Madrid!"             │
│                    ← Transcript bubble →                 │
│                                                          │
│                    [⏹ Stop Talking]                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Voice Cloning Reference
Each agent voice is configured via ElevenLabs TTS with a 30-second reference audio sample:
- **Leopoldo:** Confident male, São Paulo accent
- **Francisca:** Expressive female, Porto accent
- **Antônia:** Upbeat female, Dublin Irish accent

---

## ✅ Quality Checklist

Before shipping components:
- [ ] Mobile responsive (< 640px)
- [ ] Tablet responsive (640-1024px)
- [ ] Desktop responsive (> 1024px)
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets 44px+ (mobile)
- [ ] Keyboard navigation works
- [ ] Animations under 500ms
- [ ] Images optimized
- [ ] Type scale consistent
- [ ] Spacing aligns to scale

---

**Owner**: Victor Bendas
**Last Updated**: January 17, 2026
**Version**: 1.0 (Stable)
