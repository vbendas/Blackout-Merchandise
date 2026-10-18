# Design References: Blackout Merchandise Visual Strategy

## Overview
This document serves as the aesthetic and structural guide for **Blackout Merchandise**, covering both the public-facing homepage and the authenticated app experience.

> **Architecture Pivot (Jan 10, 2026):** Adopted "Velvet Rope" strategy — mysterious portfolio homepage for anonymous visitors, full AI app for authenticated users.

---

## 1. The "Velvet Rope" Homepage Strategy

### Concept
Invite-only platforms don't explain themselves. The public homepage should create **intrigue and exclusivity**, not marketing conversion.

| Visitor Type | Experience |
|--------------|------------|
| **Anonymous** | Portfolio showcase — "If you know, you know" |
| **Authenticated** | Full Leopoldo AI chat interface |

### Logo & Brand Identity: "Chrome Metal"
**Style:** Aggressive, sharp, Y2K/Metalheart chrome aesthetic.
- **Wordmark ("BLACKOUT MERCHANDISE"):** High-detail chrome text.
  - *Usage:* Desktop Hero headers, packaging, large format prints.
- **Monogram ("B"):** Single initial; the current placeholder is a plain white "B" on black.
  - *Usage:* App icon, favicon, mobile headers, social avatars.
- **Vibe:** "Not a tech company. A culture brand."


### Design References

#### Primary Reference: [Qi143](https://qi143.qodeinteractive.com/)
- Masonry/grid portfolio layout
- Minimal text, maximum visual impact
- Editorial photography feel
- High-impact hover interactions

#### Secondary Reference: [Terrible*](https://www.terrible.group/)
- "We don't work with everyone" messaging
- Portfolio-first, minimal marketing
- Premium but rebellious aesthetic
- Warm introductions preferred

### Homepage Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  BLACKOUT MERCHANDISE              [Portfolio]  [About]  [Login]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│      "We help artists to produce, design and                   │
│              source premium merchandise"                        │
│                                                                 │
│                     🐱 Leopoldo Avatar                          │
│                   (shadow fade transition)                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    [Masonry Grid: Portfolio of printed garments]               │
│    - Artist collaborations                                      │
│    - Festival merch                                            │
│    - Premium blanks showcase                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Design Elements
- **Menu**: HeroUI components, minimal, dark theme
- **Leopoldo**: Avatar with shadow effect as section transition
- **Portfolio**: Qi143-style image grid with hover effects
- **Footer**: Minimal — Instagram, contact email only

---

## 2. Artist E-Shop Base Template

### Primary Reference: [BoldLab Shop](https://boldlab.qodeinteractive.com/shop-home/)
- Clean grid product layout
- Editorial/lookbook feel
- Neutral enough for any artist genre
- Dark/light theme ready

### V0 Customization Scope
Artists can customize via Francisca + V0:
- ✅ Hero banner (image/video)
- ✅ Color palette
- ✅ Menu items (custom links)
- ✅ Layout style (grid/masonry/list)
- ✅ Typography (within approved fonts)

Locked elements:
- 🔒 Checkout flow (Stripe)
- 🔒 Cat-Suite placement
- 🔒 Core navigation (Cart, Account)

---

## 3. Visual Language & Theme

### Color Palette: Deep Dark Mode
- **Background**: Zinc-950 (`#09090b`)
- **Surfaces**: `rgba(255,255,255,0.05)` with subtle borders
- **Primary Accent**: Gold (`#D4AF37`) — used sparingly
- **Typography**: White primary, Grey secondary (`#a1a1aa`)
- **Borders**: Thin, low opacity (`border-white/10`)

### Typography
- **Display (Headings)**: Premium serif (*Instrument Serif*, *Playfair Display*)
- **Body/UI**: Modern sans-serif (*Inter*, *Geist Sans*)
- **Effect**: Editorial/high-fashion feel

---

## 4. Avatar Design: "The Bento Portrait"

### Concept
AI Avatars (Leopoldo, Francisca, Antônia) as premium UI elements in glassmorphism containers.

### Visual Structure
- **Framing**: Waist-up, front-facing
- **Container**: Dark glassmorphism (`zinc-900/50` + blur)
- **Break-Out Effect**: Tail/ears animate outside box bounds

### Animation (Puppet System)
1. Static body (shoulders/chest)
2. Dynamic t-shirt (display case for designs)
3. Floating head (subtle bobbing when speaking)
4. Active paws (peek when typing)
5. Tracking eyes (follow cursor)

---

## 5. Implementation Stack

- **Framework**: Next.js 14 (App Router)
- **UI Components**: HeroUI (dark theme with official Figma kit)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **AI Streaming**: Vercel AI SDK
- **Auth**: Clerk (for login → app transition)
- **Design Tool**: Figma (for layout iteration)

---

## 6. Photography Style: Analog Aesthetic

> **Added (Jan 10, 2026):** Unified visual identity using film/analog photography style across all brand touchpoints.

### Concept
All photography — portfolio, social media, crowdfunding, founder storytelling — uses an **analog film aesthetic** to reinforce the brand's underground, craft-first, rebel positioning.

**Why Analog:**
- **Craft signal** — Grain, texture, imperfection = human touch, not corporate polish
- **Underground credibility** — Streetwear, indie music, zine culture all embrace analog
- **Differentiation** — Printful/Printify = sterile product shots; Blackout Merchandise = editorial, raw, alive
- **Storytelling** — Documentary feel for founder journey, crowdfund, behind-the-scenes

### Film Stock References
| Film Stock | Vibe | Use Case |
|------------|------|----------|
| **Kodak Portra 400** | Warm, soft, fashion editorial | Portfolio, lifestyle product shots |
| **Kodak Gold 200** | Punchy, nostalgic, vibrant | Social media, casual content |
| **Cinestill 800T** | Moody, blue shadows, night | Urban, streetwear, events |
| **Ilford HP5 (B&W)** | Gritty, documentary, raw | Behind-the-scenes, founder story |

### Workflow & Tools

| Context | Tool | Notes |
|---------|------|-------|
| **On-the-go (iPhone)** | **VSCO** (iOS app) | Quick capture → preset → post. Same standard everywhere. |
| **Batch editing (Mac)** | **VSCO Studio** (web) | Larger screen, batch processing, full-res export. |
| **AI-generated images** | Flux 2 / image gen | Prompt: "35mm film photography, Kodak Portra colors, natural grain" |

### Style Guidelines
- **Grain:** Subtle, not sandpaper — "feels like film" not "trying to look like film"
- **Colors:** Slightly muted highlights, warm shadows, avoid oversaturation
- **Framing:** Editorial/fashion — lifestyle contexts, not sterile product shots
- **Flash:** Acceptable for behind-the-scenes, club/event vibes (indie aesthetic)
- **Avoid:** Heavy vignettes, obvious light leaks, over-processed "vintage" filters

### Application Areas
- ✅ Website portfolio (Velvet Rope homepage)
- ✅ @blackoutmerch Instagram
- ✅ Founder personal Instagram (storytelling)
- ✅ Crowdfunding campaign visuals
- ✅ AI-generated portfolio mockups
- ✅ Behind-the-scenes printing content
    