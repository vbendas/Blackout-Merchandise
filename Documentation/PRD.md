# Merch From: Product Requirements Document

> **Version**: v3.2  
> **Last Updated**: May 8, 2026  
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

## Full Historical Record

The complete v3.2 PRD (7,000+ lines, all update summaries from v1.0 → v3.2) is preserved in [[99-Archive/PRD-v3.2-Full-Historical]].

---

## Quick Reference

| | |
|---|---|---|
| **Mission** | Help artists design, source, and sell premium merchandise |
| **Investment** | €300,000 for 16-18% equity |
| **MVP Launch** | March 30, 2026 |
| **Tech Stack** | Next.js 16, Neon PostgreSQL, Clerk, Stripe, Mistral AI, BFL API |
| **AI Stack** | Mistral Large 3, Mistral Small 4, Voxtral STT/TTS, FLUX 2 |

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
