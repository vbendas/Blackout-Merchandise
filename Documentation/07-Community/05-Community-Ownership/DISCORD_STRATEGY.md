# MerchFrom Discord Strategy

> **Document Status:** Active Strategy
> **Phase Coverage:** Pre-Launch → Post-Launch → Phase 9
> **Last Updated:** April 4, 2026
> **Reference:** PRD.md Sections — Crowdfunding Tiers, Phase 9

---

## Table of Contents

1. [Vision](#1-vision)
2. [Server Architecture](#2-server-architecture)
3. [Layer 1 — Pre-Launch Community](#3-layer-1--pre-launch-community)
4. [Layer 2 — Artist Networking Flywheel](#4-layer-2--artist-networking-flywheel)
5. [Layer 3 — Bot + Commerce Integration](#5-layer-3--bot--commerce-integration)
6. [Role System](#6-role-system)
7. [Cat-Suite Presence](#7-cat-suite-presence)
8. [Crowdfunding Tier Perks Delivery](#8-crowdfunding-tier-perks-delivery)
9. [Growth Flywheel](#9-growth-flywheel)
10. [Success Metrics](#10-success-metrics)

---

## 1. Vision

Discord is not a support channel. It is the **private room where artists watch MerchFrom get built and have a real voice in shaping it.**

Three jobs to do at different stages:

| Stage | Job |
|-------|-----|
| Pre-Launch | Build credibility and warmth before the platform exists |
| Post-Beta | Become the place artists find peers, feedback, and collaborators |
| Post-Launch | Become a direct sales and discovery surface via bot + integrations |

The architecture of the Discord is the first impression. A well-structured server with strong copy signals seriousness. A messy server with 5 members signals abandonment.

---

## 2. Server Architecture

```
MERCH FROM
├── 📣 #announcements          (admin only — product updates, drops, milestones)
├── 🎟️ #waitlist-updates       (automated or manual — countdown, cohort news)
│
COMMUNITY
├── 🎨 #studio-wip             (artists share work-in-progress, get feedback)
├── 💬 #general-chat
├── 🙋 #introductions          (new members introduce themselves + their work)
├── 🔥 #drop-alerts            (artists announce new product drops)
│
CAT-SUITE DESK
├── 🐱 #leopoldo-desk          (platform Q&A, onboarding, account questions)
├── 🎭 #francisca-studio       (design feedback, visual inspo, catalog curation)
├── 📦 #antonia-support        (orders, logistics, shipping, first-tier support)
│
FOUNDING CIRCLE (role-gated: Tier 2+)
├── 🔒 #founders-lounge        (direct access to founder + early decisions)
├── 🗳️ #feature-voting         (vote on roadmap priorities)
├── 👁️ #build-in-public        (raw dev updates, screenshots, early previews)
└── 📞 #event-scheduling       (quarterly call coordination)
```

**Setup priorities:**
- Each channel gets a pinned message explaining its purpose and tone
- Cat-Suite channels have persona-consistent descriptions (not generic)
- `#announcements` is locked — no replies, only reactions. Forces high signal.
- `#founders-lounge` is the single highest-value perk in the entire crowdfunding campaign — it must feel that way

---

## 3. Layer 1 — Pre-Launch Community

**Goal:** Make the server feel inhabited and purposeful before the platform launches. No ghost towns.

### Welcome Message (in #announcements)

Post this (or a variant) as the first pinned message when the server opens:

> **Welcome to MerchFrom.**
>
> This is the place where artists, builders, and believers watch something get made.
>
> We're building the platform that lets creators design, source, and sell premium merchandise without upfront costs — vegan, fair-trade, in-house. No middlemen. No compromises.
>
> This server exists so the people who care most have a front-row seat.
>
> Start in #introductions. Tell us who you are and what you make.
> — Victor

### Waitlist → Discord Pipeline

The moment someone signs up on the landing page, the thank-you page offers the Discord invite link. This is the single most important conversion step for the community:

- Waitlist member who joins Discord = **10x more likely to convert** to beta artist or backer
- Discord join = first signal of genuine intent beyond an email address
- The `🌱 Seedling` role is auto-assigned on join (see Role System)

### Early Content Calendar (Pre-Launch)

Run these even with zero members — content builds the culture before the crowd arrives.

| Cadence | Channel | Content |
|---------|---------|---------|
| Weekly | #announcements | Short build-in-public update (1 paragraph, honest) |
| Weekly | #studio-wip | Founder posts a design mock or UI screenshot for feedback |
| Bi-weekly | #francisca-studio | Francisca (in character) shares a design reference or inspo |
| Monthly | #waitlist-updates | Waitlist milestone update (e.g., "500 signups — thank you") |

**Character posting:** Posting in the Cat-Suite channels in character costs 10 minutes but makes the brand feel alive before the app exists. Francisca sharing a design reference. Leopoldo explaining what the onboarding flow will feel like. These posts are not marketing — they are trust-building.

---

## 4. Layer 2 — Artist Networking Flywheel

**Goal:** Make the Discord valuable *to artists*, not just to MerchFrom. If artists find collaborators, feedback, and peers here — it grows itself.

### Recurring Programs

| Program | Cadence | Channel | Mechanic |
|---------|---------|---------|---------|
| **Studio WIP threads** | Always-on | #studio-wip | Artists post WIPs, community gives feedback |
| **Ink Challenge** | Monthly | #announcements + #studio-wip | Themed challenge (e.g., "April: Botanical prints"), community votes winner |
| **Artist Spotlight** | Bi-weekly | #announcements | Feature one artist's story — their work, their why |
| **Collab Matchmaking** | Quarterly | #general-chat | Post your style + what you're looking for, find collabs |
| **Drop Alerts** | Per artist | #drop-alerts | Artists announce new products to the whole community |

### Monthly Ink Challenge Format

1. Theme announced on the 1st in `#announcements`
2. Entries posted in `#studio-wip` with `[CHALLENGE]` tag during the month
3. Community votes via reactions in the last week
4. Winner announced in `#announcements` — prize: free sample print or priority production slot
5. Winner featured in the bi-weekly Artist Spotlight

**Why this works:** Low-cost for MerchFrom (a sample print), high-value for artists (visibility + free merch), creates recurring engagement cadence, and generates real product content for social media.

### Cross-Promotion Engine

`#drop-alerts` is the highest-leverage channel in the server long-term:

1. Artist shares their new drop in `#drop-alerts`
2. They share the Discord link with their own followers to drive traffic
3. Their followers join the server → discover other artists
4. New members see other drops → the cycle continues

This is the flywheel. Seed it with the first 10-15 beta artists and it becomes self-sustaining.

### Artist AMAs

Monthly AMA with one beta artist. Format:
- 48h async thread (no voice required)
- Artist answers questions about their work, their process, their experience with MerchFrom
- Builds social proof that real artists use the platform
- Builds community *between* artists (not just artist → MerchFrom)

---

## 5. Layer 3 — Bot + Commerce Integration

**Reference:** PRD.md Section — Phase 9: Social Commerce Integration Hub

This layer automates and scales what Layers 1 and 2 build manually.

### Stage A — Manual Previews (Now, Zero Code)

Before the bot exists, run the concept manually to train the community to expect it:

- Weekly "Top Drops" digest in `#drop-alerts`
- Weekly "This week on MerchFrom" with stats (units sold, new artists, active designs)
- Monthly leaderboard post ("Top 3 selling artists this month")

This creates appetite for the automated version before it ships.

### Stage B — Bot MVP (Post-Beta)

Core slash commands (per PRD Phase 9):

```
/merch drop       — artist announces a new product drop in the server
/merch shop       — pulls up their storefront embed with a preview card
/merch leaderboard — top sellers this week/month
```

Additional command not in PRD:

```
/merch collab @artist — propose a collab, creates a private thread between two artists
                        with a structured brief template
```

### Stage C — Discord Embedded Activity (Phase 9)

Full interactive storefront inside Discord voice/text channels via Discord Embedded App SDK:

- **Cat-Suite Presence:** Leopoldo greets users in the Activity
- **Browsable catalog** without leaving Discord
- **Artist profile** with their story and full product range
- **CTA:** "Get It" button redirects to MerchFrom direct (not IAP — see revenue note below)

**Revenue Note:** Discord takes 15-30% on in-app purchases. The Embedded Activity is optimized for **discovery and engagement**, not direct checkout. Always redirect to MerchFrom direct where the artist keeps their full margin. The bot should link out — not complete the transaction inside Discord.

**Platform Fee Impact (€35 Tee example):**
| Checkout Path | Fee | Artist Net |
|---------------|-----|------------|
| MerchFrom Direct | 0% | €20 |
| Discord IAP (15-30%) | €3-6 | €14-17 |

**Decision:** Default to off-site checkout. Embedded Activity is a discovery tool.

### OAuth Integration Flow

From PRD Phase 9 — artists connect from `/dashboard/integrations`:

1. Artist clicks "Connect Discord" on their dashboard
2. OAuth flow authorizes MerchFrom bot on their server
3. Bot joins with `Send Messages`, `Use Slash Commands`, `Create Public Threads` scopes
4. Artist selects which channel receives drop alerts
5. All future drops auto-post to that channel via `/merch drop`

---

## 6. Role System

Roles are visible in the server and create social proof at a glance. A new member sees a `💎 Founding Artist` in chat and immediately understands the hierarchy and aspires to it.

| Role | Trigger | Meaning |
|------|---------|---------|
| `🌱 Seedling` | Joined server (waitlist) | On the journey |
| `🎨 Studio Artist` | Posted first WIP in #studio-wip | Active creative |
| `🔥 Drop Creator` | Launched first product on MerchFrom | In production |
| `💎 Founding Artist` | Beta cohort member | Pioneer |
| `🏆 Top Seller` | Leaderboard recognition (monthly) | Proven seller |
| `🔒 Founding Supporter` | Crowdfunding Tier 2+ backer | Financial believer |
| `🤝 Strategic Partner` | Crowdfunding Tier 3+ backer | Advisory level |

**Role assignment:**
- `🌱 Seedling` — auto on join via bot
- `🎨 Studio Artist` — manual or bot-triggered on first WIP post
- `🔥 Drop Creator` — webhook from MerchFrom platform on first product launch
- `🏆 Top Seller` — auto-assigned monthly by bot from leaderboard data
- Crowdfunding roles — assigned manually after Kickstarter/crowdfunding confirmation

---

## 7. Cat-Suite Presence

Each character has a designated channel and a defined posting style. These channels are not customer support queues — they are character-driven spaces that make the brand feel alive.

| Character | Channel | Tone | Posts About |
|-----------|---------|------|-------------|
| **Leopoldo** | #leopoldo-desk | Warm, administrative, patient | Platform updates, onboarding tips, account guidance |
| **Francisca** | #francisca-studio | Creative, opinionated, encouraging | Design references, WIP reactions, visual inspo drops |
| **Antonia** | #antonia-support | Direct, practical, reliable | Order updates, shipping info, logistics FAQs |

**Pre-launch character cadence (manual, in-character posting):**

- Francisca: 1x/week in `#francisca-studio` — drop a design reference or mood board with a short in-character caption
- Leopoldo: 1x/two weeks in `#leopoldo-desk` — explain an upcoming platform feature as if briefing a new artist
- Antonia: as needed in `#antonia-support` — answer logistics questions with her characteristic directness

**Post-launch:** Character channels become the front-end of the AI chat system. The Discord presence and the in-app experience use the same agent definitions.

---

## 8. Crowdfunding Tier Perks Delivery

Discord is the primary delivery vehicle for crowdfunding backer value. This is what makes the tiers feel real.

| Tier | Discord Perk | How Delivered |
|------|-------------|---------------|
| **Tier 1 — Early Access Artist (€49)** | `🌱 Seedling` role + early feature previews in #announcements | Auto role on verification |
| **Tier 2 — Founding Supporter (€199)** | `🔒 Founding Supporter` role + access to #founders-lounge, #feature-voting, #build-in-public | Manual role after backer confirmation |
| **Tier 3 — Strategic Partner (€499)** | Everything above + `🤝 Strategic Partner` role + quarterly call scheduling via #event-scheduling | Manual role after backer confirmation |
| **Tier 4 — Founding Patron (€1,999)** | Everything above + dedicated 1-on-1 call coordination + permanent advisory board seat visible in profile | Manual + custom setup |

**#founders-lounge** is the single highest-value perk in the campaign. It needs to feel like the room where decisions get made — not a newsletter in chat form. Post raw decisions, ask for input, share things you wouldn't post publicly. The exclusivity is the value.

---

## 9. Growth Flywheel

```
Waitlist signup
     ↓
Discord invite (thank-you page) → 🌱 Seedling role auto-assigned
     ↓
Artist posts WIP in #studio-wip → earns 🎨 Studio Artist role
     ↓
Ink Challenge → wins free sample print → shares win publicly
     ↓
Artist launches first product → earns 🔥 Drop Creator role
     ↓
Drop announced in #drop-alerts → artist shares with their followers
     ↓
Followers join Discord → discover other artists → follow #drop-alerts
     ↓
New artist joins waitlist from community recommendation
     ↓
Founding Supporters see the build live in #founders-lounge → crowdfunding conversions
     ↓
Bot automates drop alerts → leaderboard surfaces top sellers
     ↓
Top Seller role creates visible social proof → more artists want it → more drops
```

---

## 10. Success Metrics

### Pre-Launch
| Metric | Target |
|--------|--------|
| Waitlist → Discord conversion rate | >30% |
| Discord members at beta launch | 200+ |
| #studio-wip posts in first 30 days | 50+ |
| Founding Supporter role assignments (Tier 2+) | 20+ |

### Post-Launch
| Metric | Target |
|--------|--------|
| Monthly active members | >500 |
| #drop-alerts posts/month | 30+ |
| Artist Spotlight engagement (reactions + replies) | >50 per post |
| Ink Challenge participation/month | 15+ entries |
| Bot slash command usage/month | 200+ |

### Phase 9 (Post-Bot)
| Metric | Target |
|--------|--------|
| Artists with Discord server connected | >25% of active artists |
| Click-through from #drop-alerts to store | >15% CTR |
| Embedded Activity sessions/month | 1,000+ |
| Community-driven referrals (tracked UTM) | >10% of new signups |
