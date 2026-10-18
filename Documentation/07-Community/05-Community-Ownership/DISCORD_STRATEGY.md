# Blackout Merchandise Discord Strategy

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

Discord is not a support channel. It is the **private room where artists watch Blackout Merchandise get built and have a real voice in shaping it.**

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
BLACKOUT MERCHANDISE
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

> **Welcome to Blackout Merchandise.**
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

**Goal:** Make the Discord valuable *to artists*, not just to Blackout Merchandise. If artists find collaborators, feedback, and peers here — it grows itself.

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

**Why this works:** Low-cost for Blackout Merchandise (a sample print), high-value for artists (visibility + free merch), creates recurring engagement cadence, and generates real product content for social media.

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
- Artist answers questions about their work, their process, their experience with Blackout Merchandise
- Builds social proof that real artists use the platform
- Builds community *between* artists (not just artist → Blackout Merchandise)

---

## 5. Layer 3 — Bot + Commerce Integration

**Reference:** PRD.md Section — Phase 9: Social Commerce Integration Hub

This layer automates and scales what Layers 1 and 2 build manually.

### Stage A — Manual Previews (Now, Zero Code)

Before the bot exists, run the concept manually to train the community to expect it:

- Weekly "Top Drops" digest in `#drop-alerts`
- Weekly "This week on Blackout Merchandise" with stats (units sold, new artists, active designs)
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
- **CTA:** "Get It" button redirects to Blackout Merchandise direct (not IAP — see revenue note below)

**Revenue Note:** Discord takes 15-30% on in-app purchases. The Embedded Activity is optimized for **discovery and engagement**, not direct checkout. Always redirect to Blackout Merchandise direct where the artist keeps their full margin. The bot should link out — not complete the transaction inside Discord.

**Platform Fee Impact (€35 Tee example):**
| Checkout Path | Fee | Artist Net |
|---------------|-----|------------|
| Blackout Merchandise Direct | 0% | €20 |
| Discord IAP (15-30%) | €3-6 | €14-17 |

**Decision:** Default to off-site checkout. Embedded Activity is a discovery tool.

### OAuth Integration Flow

From PRD Phase 9 — artists connect from `/dashboard/integrations`:

1. Artist clicks "Connect Discord" on their dashboard
2. OAuth flow authorizes Blackout Merchandise bot on their server
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
| `🔥 Drop Creator` | Launched first product on Blackout Merchandise | In production |
| `💎 Founding Artist` | Beta cohort member | Pioneer |
| `🏆 Top Seller` | Leaderboard recognition (monthly) | Proven seller |
| `🔒 Founding Supporter` | Crowdfunding Tier 2+ backer | Financial believer |
| `🤝 Strategic Partner` | Crowdfunding Tier 3+ backer | Advisory level |

**Role assignment:**
- `🌱 Seedling` — auto on join via bot
- `🎨 Studio Artist` — manual or bot-triggered on first WIP post
- `🔥 Drop Creator` — webhook from Blackout Merchandise platform on first product launch
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

---

## 11. Discord Bot Strategy — AI-Powered Artist & Customer Support

### Overview

Discord bots are not just utility tools — they are **extensions of the Cat-Suite AI agents** into the community layer. Artists and customers interact with the same Leopoldo, Francisca, and Antonia personalities whether they're in the app or on Discord.

**Architecture principle:** Shared context layer. When a customer asks the Discord bot about their order, and the artist asks MerchStation about the same order, both draw from the same knowledge graph. The AI maintains continuity across channels.

---

### Artist-Facing Bot (Powered by Mistral Small 4)

**Deployed in:** Artist's own Discord server (via OAuth)
**AI Model:** Mistral Small 4 (primary), Mistral Large 3 (escalation)
**Persona:** Configurable — Leopoldo (admin), Francisca (design), or Antonia (support)

#### Core Features

| Feature | Description | AI Role |
|---------|-------------|---------|
| **Pre-launch campaigns** | "Create a poll for my fans about colorways" → bot generates poll, posts it, summarizes results | Small 4 |
| **Analytics Q&A** | "How did my drop perform last week?" → queries Blackout Merchandise API, returns formatted stats with insights | Small 4 |
| **Order follow-ups** | "Remind me to check on the Portugal shipment" → scheduled natural language reminders | Small 4 |
| **Support triage** | Handles 80% of artist questions; escalates 20% to human Head of Customer Success | Small 4 → Large 3 |
| **Fan engagement ideas** | "What should I post before my drop?" → creative campaign suggestions | Large 3 |
| **Poll generation** | "Ask my fans about hoodie vs tee" → structured poll with options | Small 4 |
| **Collaboration matching** | "Find artists who do botanical prints" → searches community catalog | Small 4 |

#### Example Interactions

```
@blackoutmerch-bot How did my Luna Tee drop do?

🐱 Antonia: Grand news! Your Luna Tee drop did well:
   • 42 units sold in 7 days
   • €1,469 revenue (your cut: €880)
   • Top buyer location: Lisbon (12 orders)
   • 3 customers left reviews — all 5 stars
   
   That's your best-performing product so far. 
   Want me to remind you when inventory hits 10 left?
```

```
@blackoutmerch-bot Create a poll: should my next drop be hoodies or tees?

🎭 Francisca: Claro! Here's your poll:

📊 Next Drop: Hoodie or Tee?
🧥 Hoodie — cozy season is coming
👕 Tee — classic, wearable year-round

Post this in #announcements? [Yes] [Edit] [Cancel]
```

---

### Customer-Facing Bot (Powered by Mistral Small 4)

**Deployed in:** Blackout Merchandise community server + artist servers
**AI Model:** Mistral Small 4 (primary), Mistral Large 3 (escalation)
**Persona:** Antonia (friendly, direct, helpful)

#### Core Features

| Feature | Description | AI Role |
|---------|-------------|---------|
| **Order tracking** | "Where's my Luna Tee?" → natural language tracking, no copy-pasting numbers | Small 4 |
| **Artist interaction** | "Ask [Artist] when the next drop is" → bot surfaces it or schedules notification | Small 4 |
| **Support** | Return policies, shipping info, initiate refunds | Small 4 |
| **Product discovery** | "Show me eco-friendly tees" → searches catalog, returns embeds | Small 4 |
| **Escalation** | Complex disputes or emotional customers → human Head of Customer Success | Large 3 → Human |

#### Example Interactions

```
@blackoutmerch-bot Where's my order?

📦 Antonia: No bother, let me check...
   
   Order #1089 — Luna Tee (Black, M)
   Status: Shipped 🚚
   Tracking: CTT Expresso #PT123456789
   Estimated: May 12-14
   
   [Track on CTT] [Contact Support]
```

---

### Bot Architecture

```
Discord Bot (Node.js / Bun)
├─ Artist Bot Module
│  ├─ OAuth connection to Blackout Merchandise API
│  ├─ Command parser (/merch drop, /merch analytics, /merch poll)
│  ├─ Mistral Small 4 client (natural language)
│  └─ Escalation router (to Large 3 or human)
│
├─ Customer Bot Module
│  ├─ Order tracking API integration
│  ├─ Catalog search
│  ├─ Mistral Small 4 client
│  └─ Support ticket creation
│
├─ Shared Layer
│  ├─ Knowledge graph (same DB as MerchStation)
│  ├─ Context persistence (cross-channel memory)
│  ├─ Human handoff protocol
│  └─ Analytics logging
│
└─ Deployment
   ├─ Self-hosted (open-source template)
   └─ Managed hosting (Blackout Merchandise-hosted, paid tier)
```

**Tech Stack:**
- Runtime: Bun (fast, TypeScript-native)
- Discord library: discord.js or @discordjs/core
- AI client: @mistralai/mistral-sdk
- Database: Same Neon PostgreSQL via Drizzle ORM
- Cache: Upstash Redis for session state

---

### Why Mistral for Discord Bots

| Requirement | How Mistral Delivers |
|-------------|---------------------|
| **Multilingual** | Portuguese, English, Spanish, German without model switching |
| **Fast** | Small 4 delivers sub-second responses for chatty Discord UX |
| **Cheap at scale** | $0.15/1M tokens means unpredictable support volume won't break the bank |
| **Persona consistency** | Same models power in-app Cat-Suite and Discord bots |
| **Shared context** | Single knowledge graph across app, MerchStation, and Discord |
| **EU data residency** | Artist/customer conversations stay in Europe |

---

### Open-Source Strategy

The Discord bot templates will be open-sourced under MIT license:

| Template | Repository | Target User |
|----------|-----------|-------------|
| `artist-support-bot` | `github.com/blackoutmerch/discord-bots/artist-support` | Self-hosting artists |
| `customer-support-bot` | `github.com/blackoutmerch/discord-bots/customer-support` | Community managers |
| `drop-announcement-bot` | `github.com/blackoutmerch/discord-bots/drop-announcement` | Any Discord server |

**Self-host:**
```bash
git clone github.com/blackoutmerch/discord-bots
cd discord-bots/artist-support-bot
cp .env.example .env
# Add Discord token + Blackout Merchandise API key
bun install
bun run start
```

**Managed hosting (paid):**
- Blackout Merchandise hosts and manages the bot
- Artist connects via dashboard OAuth
- Higher rate limits, priority support, custom branding

---

### Human-in-the-Loop on Discord

Every bot interaction follows the same human oversight model as the app:

- **Automatic flagging:** Negative sentiment, refund requests, legal mentions → immediate human alert
- **Artist escalation:** Any user can type `/human` to request a human team member
- **Human lead dashboard:** Head of Customer Success sees all Discord bot conversations in MerchStation
- **Response time promise:** < 4 hours during business hours for human requests

**Example handoff:**
```
@blackoutmerch-bot /human

📦 Antonia: No bother at all, I'm getting Marta (Head of Customer Success) 
           for you now. She'll be with you within 4 hours.
           
           In the meantime, is there anything I can help prepare 
           for her? Your order number or question would be grand.
           
           [Marta will reply here]
```

---

### Integration Timeline

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| **Phase 1** | Q3 2026 | Basic slash commands (/merch drop, /merch shop) — rule-based, no AI |
| **Phase 2** | Q4 2026 | AI-powered support bot (Mistral Small 4) in Blackout Merchandise server |
| **Phase 3** | Q1 2027 | Artist-facing bot templates (open-source) |
| **Phase 4** | Q2 2027 | Full Cat-Suite persona integration, cross-channel context |
| **Phase 5** | Q3 2027 | Embedded Activity (Discord storefront), advanced analytics |

---

### Success Metrics (Discord Bots)

| Metric | Target |
|--------|--------|
| Bot response accuracy | > 90% |
| Human escalation rate | 10-20% |
| Average response time | < 2 seconds |
| Artist bot adoption | > 30% of active artists |
| Customer satisfaction (bot) | > 4.0/5 |
| Cost per conversation | < €0.01 |

---

**See also:**
- [[../04-TUI/MerchStation-Plan]] — Internal admin TUI with shared AI context
- [[../../02-Architecture/AI-Stack]] — Full AI model architecture
- [[../../02-Architecture/Human-in-the-Loop]] — Human oversight specification
