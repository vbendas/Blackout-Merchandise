# Open-Source Strategy

> **Document Status:** Active Strategy
> **Last Updated:** May 9, 2026
> **Reference:** [[AI-Stack]], [[EU-AI-Act-Compliance]]

---

## Executive Summary

Blackout Merchandise is committed to **strategic open-sourcing** of our tooling, integration layers, and AI governance frameworks. We do not open-source our core revenue engine (the generation-to-print pipeline and proprietary color separation), but we actively contribute back to the ecosystem in ways that build trust, create network effects, and establish technical leadership.

**Philosophy:** Open-source the *connection layer*. Keep the *production layer* proprietary.

---

## Strategic Rationale

### Why Open-Source?

| Benefit | How We Capture It |
|---------|------------------|
| **Trust & Transparency** | Artists and investors can audit our non-critical code |
| **Ecosystem Lock-In** | Developers build on our SDK → more integrations → stickier platform |
| **Talent Signal** | High-quality open-source work attracts engineering talent |
| **Marketing & SEO** | GitHub presence drives developer mindshare and backlinks |
| **Community Contribution** | External bug fixes, features, and translations |
| **EU AI Act Alignment** | Transparency obligations met through actual open code |

### What We Keep Proprietary

| Asset | Rationale |
|-------|-----------|
| **Generation-to-print pipeline** | Core production moat; color separation logic is proprietary |
| **Style Capsule reference libraries** | Curated style reference images and prompt templates used for reference-guided generation |
| **Prompt engineering templates** | Optimized for our specific aesthetic and print requirements |
| **Agent routing logic** | Conversational intelligence tuned for our domain |
| **Revenue/commission algorithms** | Commercially sensitive |

---

## Open-Source Projects

### 1. Blackout Merchandise CLI (`blackoutmerch-cli`)

**Status:** Planned — MVP after platform beta
**License:** MIT
**Repository:** `github.com/blackoutmerch/cli`

**What it is:**
An open-source command-line interface for artists to manage their Blackout Merchandise catalog, generate mockups, and track orders — without using the web dashboard.

**Why it works for us:**
- Artists self-serve via CLI → still routes printing/fulfillment to us
- Power users love CLI tools → increases engagement and retention
- Developers extend it → ecosystem of plugins and integrations
- We control the API it calls → platform lock-in through convenience

**Features:**
```bash
# Authentication
blackoutmerch auth login

# Catalog management
blackoutmerch products list
blackoutmerch products create --name "Luna Tee" --image ./design.png
blackoutmerch products update --id prod_123 --price 34.99

# Mockup generation
blackoutmerch mockup generate --product prod_123 --model "FLUX-2-Flex"
blackoutmerch mockup list --product prod_123

# Order tracking
blackoutmerch orders list --status shipped
blackoutmerch orders track --id ord_456

# Analytics
blackoutmerch analytics sales --period 30d
blackoutmerch analytics top-products
```

**Architecture:**
- TypeScript + Bun runtime
- Wraps Blackout Merchandise public API
- Plugin system for custom integrations
- Configurable output formats (JSON, table, CSV)

---

### 2. Blackout Merchandise SDK (`@blackoutmerch/sdk`)

**Status:** Planned — parallel with CLI
**License:** MIT
**Repository:** `github.com/blackoutmerch/sdk`

**What it is:**
A TypeScript/JavaScript SDK for developers to integrate Blackout Merchandise into their own applications, websites, and tools.

**Use Cases:**
- E-commerce platforms adding print-on-demand
- Artist portfolio sites with embedded shops
- Discord bots (see below)
- Custom dashboards and analytics tools

**Example:**
```typescript
import { BlackoutMerchClient } from '@blackoutmerch/sdk';

const client = new BlackoutMerchClient({
  apiKey: process.env.BLACKOUTMERCH_API_KEY,
  environment: 'production'
});

// Create a product
const product = await client.products.create({
  name: 'Luna Tee',
  designUrl: 'https://cdn.example.com/design.png',
  basePrice: 34.99,
  variants: [
    { size: 'S', color: 'Black', sku: 'LUNA-TEE-S-BLK' },
    { size: 'M', color: 'Black', sku: 'LUNA-TEE-M-BLK' }
  ]
});

// Generate mockup
const mockup = await client.mockups.generate({
  productId: product.id,
  model: 'flux-2-pro',
  scene: 'flat-lay'
});
```

**Why it works:**
- "Stripe for merchandise" positioning
- Every integration is a distribution channel
- SDK usage drives API usage → revenue
- Community-built integrations we never imagined

---

### 3. Discord Bot Templates (`blackoutmerch-discord-bots`)

**Status:** Planned — Phase 9 (Social Commerce Hub)
**License:** MIT
**Repository:** `github.com/blackoutmerch/discord-bots`

**What it is:**
Open-source Discord bot templates that artists can self-host or invite to their own servers. Includes both artist-facing and customer-facing bot implementations.

**Templates:**

| Template | Purpose | AI Backend |
|----------|---------|------------|
| `artist-support-bot` | Pre-launch campaigns, polls, analytics, order follow-ups | Mistral Small 4 |
| `customer-support-bot` | Order tracking, FAQ, artist interaction | Mistral Small 4 |
| `drop-announcement-bot` | Auto-post new products, countdown timers, inventory alerts | Rule-based (no AI) |

**Example:**
```bash
# Self-host artist support bot
git clone github.com/blackoutmerch/discord-bots
cd discord-bots/artist-support-bot
cp .env.example .env
# Edit .env with Discord token + Blackout Merchandise API key
bun install
bun run start
```

**Why it works:**
- Artists customize their own bot experience
- Community contributes new features and language packs
- Bot usage drives Blackout Merchandise API adoption
- Positions us as the open, extensible platform vs. closed competitors

---

### 4. AI Transparency & Governance Toolkit (`blackoutmerch-ai-governance`)

**Status:** Planned — Q3 2026
**License:** Apache 2.0
**Repository:** `github.com/blackoutmerch/ai-governance`

**What it is:**
A collection of tools, templates, and documentation for AI governance compliance — starting with EU AI Act, extensible to other jurisdictions.

**Contents:**
- Risk classification questionnaire and flowchart
- Transparency disclosure templates (multilingual)
- Human oversight dashboard components
- AI provider register template (hosted models in use and the data each receives)
- Audit trail standard format
- Consent management utilities

**Why it works:**
- Positions Blackout Merchandise as a thought leader in responsible AI
- Other startups use our tools → brand recognition
- Contributes to EU AI ecosystem → regulatory goodwill
- Meets our own transparency obligations efficiently

---

## Contribution Guidelines

### For External Contributors

- All repositories include `CONTRIBUTING.md` with clear standards
- CLA (Contributor License Agreement) required for substantial contributions
- Code of Conduct based on Contributor Covenant
- Issue templates for bugs, features, and security reports

### For Internal Team

- 10% of engineering time allocated to open-source maintenance
- Quarterly open-source roadmap review
- Internal hackathons focused on community-requested features
- Recognition program for top external contributors (swag, credits, shoutouts)

---

## Revenue Protection

### Open-Core Model

| Layer | Open | Proprietary |
|-------|------|-------------|
| **API access** | Basic rate limits | Higher tiers for paying artists |
| **Mockup generation** | Standard quality | Premium FLUX 2 Max for subscribers |
| **Support** | Community + Discord | Priority human support for paid tiers |
| **Analytics** | Basic dashboard | Advanced insights, forecasting |
| **Integrations** | Self-hosted bots | Managed bot hosting by Blackout Merchandise |

**Rule:** Open-source tools are free to use. Premium features, higher limits, and managed services generate revenue. The open-source layer is the top of the funnel.

---

## Competitive Impact

### How This Changes the Game

| Competitor Approach | Our Approach | Advantage |
|--------------------|-------------|-----------|
| Closed platform, no API | Open SDK + CLI | Developers choose us |
| Black-box AI | Open governance toolkit | Regulators and enterprises trust us |
| English-only | Open European language data | EU market dominance |
| Generic support bots | Open Discord bot templates | Community customizes and promotes |

---

## Timeline

| Quarter | Milestone |
|---------|-----------|
| **Q2 2026** | Publish `blackoutmerch-ai-governance` toolkit (templates + docs) |
| **Q3 2026** | Beta `blackoutmerch-cli` with core catalog + mockup commands |
| **Q4 2026** | Release `@blackoutmerch/sdk` v1.0 with full API coverage |
| **Q1 2027** | Launch Discord bot templates (artist + customer support) |
| **Year 2+** | Community-driven plugin ecosystem, SDK v2.0 |

---

## Related Documents

- [[AI-Stack]] — Technical AI infrastructure
- [[EU-AI-Act-Compliance]] — Regulatory transparency requirements
- [[../07-Community/05-Community-Ownership/DISCORD_STRATEGY]] — Discord community and bot strategy
- [[../07-Community/04-TUI/MerchStation-Plan]] — Internal CLI architecture

---

**Document Owner:** Victor Bendas
**Created:** May 9, 2026
**Status:** Active Strategy
**Next Review:** August 9, 2026
