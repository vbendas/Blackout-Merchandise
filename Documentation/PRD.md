# Merch From: Product Requirements Document

> **Version**: v3.5  
> **Last Updated**: October 17, 2026  
> **Status**: Active

---

## What This Document Is

This is the **master navigation document** for the Merch From Product Requirements. The full PRD was split into focused documents for easier maintenance and navigation.

---

## Document Map

### Product Vision & Strategy
→ [[01-Product/Vision]] — Mission, competitive positioning, moats  
→ [[01-Product/Market-Analysis]] — Comprehensive market sizing, TAM/SAM/SOM, competitive landscape, creator economics  
→ [[01-Product/Business-Model]] — Pricing, revenue model, Merch Coins, exit strategy  
→ [[01-Product/User-Journeys]] — Personas, day-in-the-life, waitlist flow

### Technical Architecture
→ [[02-Architecture/Tech-Stack]] — Full technology stack with decisions  
→ [[02-Architecture/AI-Stack]] — AI model routing, costs, scaling economics  
→ [[02-Architecture/Database-Schema]] — Drizzle ORM schema (source of truth)  
→ [[05-Shared/Image-Generation-Architecture]] — fal.ai image pipeline — reference-guided generation (Nano Banana 2), Style Capsules, prompt-template styles (v2.0, Aug 2026 pivot)

### Cat-Suite Team
→ [[03-Cat-Suite/System-Prompts]] — Full system prompts  
→ [[03-Cat-Suite/Leopoldo-Detailed]] — Extended Leopoldo personality  
→ [[03-Cat-Suite/README]] — Agent overview and expression system

### Design & Brand
→ [[04-Design/Design-System]] — Colors, typography, components  
→ [[04-Design/Brand-Guidelines]] — Voice, tone, messaging

### Development Roadmap
→ [[05-Roadmap/Roadmap]] — Development phases and milestones  
→ [[05-Roadmap/Accessories-Expansion]] — Phase 10: 3D-printed jewelry

### Operations
→ [[06-Operations/Production-Automation]] — Screen print automation pipeline  
→ [[06-Operations/Contingency-Plans]] — Viral spikes, equipment failure

### Community & Funding
→ [[07-Community/Tokenization]] — MRCH tokens, Stellar blockchain  
→ [[07-Community/04-Crowdfunding-Landing/Overview]] — Campaign tiers and timeline

### Development
→ [[08-Development/README]] — Dev guides, ADRs, Claude contexts

---

## Print Prep and Staff Access (Oct 2026)

The owner decided these on 15 and 16 October 2026. Full detail is in [[Dev/Print-Prep-Plan]].

- **One engine.** Print prep is one engine, in physical units (mm, lpi, ppi, degrees). Every design gets a DTG/DTF version and a screen-print version.
- **Channels.** Shop products always print DTG/DTF. Screen print is for runs (bulk orders) only.
- **Shop prices and print areas (16 Oct).** Shop garments have a base price for one print area up to A2, plus €1 for a front and back print and €2 once for sleeves. A product can have several areas, each with its own design.
- **Separations.** Automatic, at 1 to 8 screens as standard. The count includes the white underbase and the highlight white. A screen-printed run can go to 15 screens, at €1 per piece for each screen above 8. A person audits every production pack before production.
- **Methods.** Separations are spot, index or simulated process, with dot-gain calibration from a printed chart and screen-count pricing for runs.
- **Inks.** Screen inks are Pantone colours. The shop mixes them from Magna pigments and matches them in MagnaMix. Pantone codes appear only in admin. Clients see plain colour names.
- **Screen PSD.** One layer per ink. The films print one by one from that file.
- **Staff roles.** Three roles: owner, staff and artist. The owner sets each staff member's level for each admin area: none, view, work or manage. Each level includes the ones before it.
- **Production stations (16 Oct).** Job sheets go to iPads at `/station`, not to print, and production moves each job through to folding. Shipping stays in admin. The public "On the press" feed carries no personal data, and clients read "Private" unless they opt in. The website board is not wired to the feed yet.

---

## Full Historical Record

The complete v3.2 PRD (7,000+ lines, all update summaries from v1.0 → v3.2) is preserved in [[99-Archive/PRD-v3.2-Full-Historical]].

**v3.3 (Aug 24, 2026)**: [[05-Shared/Image-Generation-Architecture]] bumped to v1.1 after verification against current fal.ai/BFL docs. Architecture confirmed sound (FLUX.2 Dev + fal trainer + LoRA inference). Flagged: fal endpoint names drifted (`fal-ai/flux-2/lora`, `fal-ai/flux-2/lora/edit`); LoRA-aware editing now possible and should be prototyped for the edit loop; ADR-001 fallback upgradeable to a BFL klein warm standby with pre-uploaded LoRAs. No PRD-level architecture changes. (Superseded the same day by v3.4.)

**v3.4 (Aug 24, 2026)**: Same-day strategy pivot away from custom-trained style LoRAs. A quality failure in LoRA output plus head-to-head model tests showed off-the-shelf reference-guided generation matches or beats trained styles without the training overhead. New primary model: Nano Banana 2 (Google, via fal.ai), with Seedream 5.0 Pro (ByteDance, via fal.ai) as fallback. Styles are now "Style Capsules" — prompt templates plus curated reference images, surfaced through a Netflix-style pick-grid personalization flow, with attributes extracted to structured JSON by Claude Sonnet 5 via OpenRouter (Gemini 3.7 Flash fallback). Typography-in-designs is back in scope (Nano Banana 2 renders text reliably, reversing the earlier no-typography call). The upscaler step is removed — Nano Banana 2 renders native 4K finals directly. Estimated per-design cost ~$0.57. LoRA training was retired for good on 2026-08-24; no model training or fine-tuning is planned. Full detail in [[05-Shared/Image-Generation-Architecture]] v2.0.

**v3.5 (Oct 15, 2026)**: Print prep and staff access decided (see the section above and [[Dev/Print-Prep-Plan]]). [[05-Shared/Image-Generation-Architecture]] bumped to v2.1: the final 4K render now runs before approval, and nothing regenerative runs after it.

---

## Quick Reference

| | |
|---|---|---|
| **Mission** | Help artists design, source, and sell premium merchandise |
| **Investment** | €300,000 for 16-18% equity |
| **MVP Launch** | March 30, 2026 |
| **Tech Stack** | Next.js 16, Neon PostgreSQL, Clerk, NexaPay (+ Stripe backup), Mistral AI, fal.ai |
| **AI Stack** | Mistral Large 3, Mistral Small 4, Voxtral STT, ElevenLabs TTS, Nano Banana 2 + Seedream 5 (fal.ai) |

## Market Context

> **Data Sources**: [Market Analysis Report](09-Reseach/merchandise-market-research.md) | [POD Competition Report](09-Reseach/pod_competition_report.md)

| Metric | Value | Source |
|--------|-------|--------|
| **Creator Merch Market (2025)** | $6.8 billion | Dataintelo, Grand View Research |
| **POD Market Growth** | 23.6% CAGR → $57.5B by 2033 | Grand View Research |
| **EU POD Market** | $1.97B → $13.69B by 2033, 24.06% CAGR | Ecomm.Design |
| **D2C Channel Share** | 41.3% of distribution | Market research consensus |
| **Artist D2C Margin** | 60-75% retention vs 15-30% retail | Industry analysis |
| **Gen Z Sustainability Premium** | 76% willing to pay more for sustainable products | Consumer research |
| **Marketplace Collapse** | Redbubble -98% share price, Society6 5-10% royalties | Competitive intelligence |
| **Fyul Merger Window** | 18-24 months reduced innovation velocity | Historical precedent |

---

**Owner**: Victor Bendas  
**Next Review**: End of Phase 4
