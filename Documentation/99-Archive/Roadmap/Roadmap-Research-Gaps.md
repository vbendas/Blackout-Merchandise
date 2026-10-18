> Archived: the LoRA plan described here was retired on 2026-08-24 in favour of hosted reference-guided generation.

# Roadmap Research Gaps Analysis

> **Document Version:** 1.0  
> **Last Updated:** May 10, 2026  
> **Source:** Market research synthesis (merchandise-market-research.md + pod_competition_report.md)  
> **Plan ID:** PLAN-04

---

## Executive Summary

Market research across 300+ sources reveals **six critical gaps** in the current Blackout Merchandise roadmap. The most urgent: **traffic and discovery** — the #1 creator pain point is entirely unaddressed. The AI moat has a 12-month half-life. Creator success enablement is missing. These gaps must be closed to justify the €300K raise and reach the 1,000 artists / $100K monthly GMV seed trigger.

| Gap | Priority | Status | Proposed Fix |
|-----|----------|--------|--------------|
| **GAP 1: Traffic & Discovery Layer** | 🔴 CRITICAL | NOT ADDRESSED | New Phase 8.5 |
| **GAP 2: AI Moat Conversion** | 🟡 HIGH | Partial (Phase 5) | Extend Phase 5 + Phase 9.5 |
| **GAP 3: Creator Success Enablement** | 🟡 HIGH | NOT ADDRESSED | New Phase 7.5 |
| **GAP 4: EU Regulatory Compliance** | 🟢 MEDIUM | NOT ADDRESSED | Compliance milestones |
| **GAP 5: Business Outcome Metrics** | 🟢 MEDIUM | NOT ADDRESSED | Metrics per phase |
| **GAP 6: Premium Art Products** | 🟢 MEDIUM | Partial (Phase 10) | Expand Phase 5.5/6 |

---

## GAP 1: Traffic & Discovery Layer — CRITICAL

### Research Finding
> *"Customer acquisition, not design, is the number-one creator pain point. Fulfillment platforms yield 40-60% margins but require $300-1,000/month in advertising. No platform offers both zero upfront cost and meaningful traffic generation."* — POD Competition Report, Section 8.3

**Evidence:**
- 65% of creators earn less than $100/year — not because they can't design, but because they can't find buyers (Precedence Research)
- Top 5% of sellers generating 80% of revenue manage 3-5 platforms simultaneously, using marketplaces for traffic and fulfillment platforms for margin (Technavio)
- Marketplace platforms (Redbubble, Society6, Zazzle) have structurally collapsed, compressing artist payouts by 29-80% (POD report Section 4.1)
- Fourthwall comes closest with creator landing pages but provides no native AI design, no cross-artist promotion network, and no systematic traffic generation (POD report Section 8.3.2)

**Current Roadmap Status:** NOT ADDRESSED. No phase includes SEO storefronts, social automation, or discovery features. Phase 9 (Social Commerce Hub) focuses on catalog sync to external platforms, not organic traffic generation for creators.

**Proposed Fix:** Add **Phase 8.5: Traffic & Discovery Layer** (6 weeks)

| Feature | Description | Research Basis |
|---------|-------------|----------------|
| **SEO-optimized creator storefronts** | Structured product data, automatic sitemaps, Core Web Vitals, schema markup | Next.js 16 SSR creates genuine advantage; Printful's basic storefront lacks SEO sophistication (POD report Section 8.3.3) |
| **Social media automation pipeline** | Auto-generate Instagram carousels, TikTok videos, Pinterest pins from new listings | Creators currently pay $15-100/month for third-party tools; AI stack can power social content generation (POD report Section 8.3.3) |
| **Artist cross-promotion discovery feed** | "Related artists" surfacing complementary work to buyers | Network effect compounds: more creators → more buyers → more creators (POD report Section 8.3.3) |
| **Multi-channel publishing** | Simultaneous listing on Etsy, Amazon, TikTok Shop | No incumbent offers unified multi-channel publishing (POD report Section 9.1.4) |

**Priority:** 🔴 CRITICAL — This is the #1 finding across all research. Without traffic, the AI design layer solves only half the value chain.

**Estimated Effort:** 6 weeks, 1 frontend engineer + 1 API engineer

---

## GAP 2: AI Moat Conversion — HIGH

### Research Finding
> *"Blackout Merchandise's AI advantage has an estimated 12-month half-life. The moat converts from 'having AI' to 'AI + proprietary workflow data + artist-specific training.'"* — POD Competition Report, Section 8.1.4

**Evidence:**
- AI image generation is commoditizing rapidly — background removal is already universal, basic text-to-image is available on every major platform (POD report Section 6.2)
- Printify offers 15 free OpenAI generations daily; Gelato's CreateAI includes AI mockups and instant collections; Canva is entering POD with 170M users and 100+ AI researchers (POD report Section 6.1)
- The sustainable moat is not image generation but workflow integration, proprietary artist training data, and network effects (POD report Section 8.1.4)
- Only ~20% of consumers trust AI explicitly; "AI-designed" labeling reduces purchase intention (NIM research, POD report Section 6.2)

**Current Roadmap Status:** Phase 5 covers AI integration (Mistral, FLUX, voice) but not data collection or moat building. No systematic dataset construction exists.

**Proposed Fix:** Add moat conversion milestones to Phase 5 + new **Phase 9.5: AI Moat Conversion** (ongoing)

| Feature | Description | Research Basis |
|---------|-------------|----------------|
| **Artist style preference tracking** | Opt-in collection of preferred styles, colors, themes | Enables personalized design recommendations |
| **Design-to-conversion correlation database** | Track which designs → sales by niche, style, price point | Proprietary dataset no competitor has |
| **Successful design pattern recognition** | ML model identifying high-conversion design patterns | Converts data into actionable creator guidance |
| **Artist-specific training data collection** | Curated datasets for fine-tuning (with explicit consent) | Foundation for future proprietary models |
| **Print-readiness validation** | Automated DPI, CMYK, bleed-check, color separation | Reduces return rates; no competitor offers comprehensive validation (POD report Section 6.2) |

**Priority:** 🟡 HIGH — 12-month clock starts at launch. Must begin data collection immediately.

**Estimated Effort:** 4 weeks initial implementation + ongoing data pipeline

---

## GAP 3: Creator Success Enablement — HIGH

### Research Finding
> *"Only 24% of POD stores survive 3 years. 65% earn less than $100/year. The platform that cracks creator success-enablement wins the fastest-growing segment."* — POD Competition Report, Section 5.3

**Evidence:**
- 65% of sellers are "casual sellers" earning less than $100/year, devoting 1-3 hours per week (Precedence Research)
- Only 5% operate full-time; 2% are "elite sellers" generating $240K+ annually (Precedence Research)
- Top sellers operate 3-7 years, maintain 500-1,400+ active listings, and earn 34x the median (Mockup Maestro)
- The 24% three-year survival rate means most customers will fail — making retention and success-enablement existential priorities (POD report Section 8.1.4)

**Current Roadmap Status:** No creator education, analytics, or success metrics exist in any phase. Phase 7 (Beta Launch) focuses on onboarding volume, not success rates.

**Proposed Fix:** Add **Phase 7.5: Creator Success & Analytics** (4 weeks)

| Feature | Description | Research Basis |
|---------|-------------|----------------|
| **Unified profit analytics dashboard** | Ad spend, platform fees, shipping, refunds in one view | Neither Printful nor Printify provides comprehensive profit tracking (POD report Section 6.3) |
| **Creator onboarding education** | Design best practices, niche selection guidance, pricing strategy | 65% of creators earn <$100/year due to lack of business knowledge |
| **Performance benchmarking** | Compare to platform averages and similar niches | Gamification drives engagement; success visibility reduces churn |
| **Success milestone notifications** | First sale, $100 month, 10th design, etc. | Positive reinforcement increases retention |
| **Cohort retention tracking** | Track survival rates by onboarding cohort | Essential for identifying what makes creators successful |

**Priority:** 🟡 HIGH — Creator success = platform retention. Without this, churn will destroy unit economics.

**Estimated Effort:** 4 weeks, 1 full-stack engineer + design support

---

## GAP 4: EU Regulatory Compliance — MEDIUM

### Research Finding
> *"EU EPR for textiles effective Oct 2025, full enforcement by 2028. ECGT Directive bans generic 'eco-friendly' claims from Sept 2026. GPSR mandates supply chain traceability."* — Market Research, Section 12.4

**Evidence:**
- EU EPR for textiles: compliance obligations began October 2025, full enforcement by April 2028 (Beveridge & Diamond PC)
- ECGT Directive (September 2026): Bans generic environmental claims ("eco-friendly," "green," "sustainable") unless third-party certified. Penalties: up to 4% of annual turnover
- GPSR (December 2024): General Product Safety Regulation mandates full supply chain traceability
- July 2026 duty changes: Removes €150 customs duty exemption; flat €3 duty per tariff heading on low-value e-commerce shipments
- 80% of European consumers willing to pay 9.7% premium for sustainable goods (PwC)
- Most US-centric platforms are unprepared for these requirements (POD report Section 8.1.3)

**Current Roadmap Status:** Not addressed in any phase. Sustainability is mentioned as a brand value but not as a compliance requirement.

**Proposed Fix:** Add compliance milestones across phases

| Milestone | Deadline | Action Required |
|-----------|----------|-----------------|
| **Product certifications** | Launch | Source GOTS/OEKO-TEX/FSC certified base products from day one |
| **Supply chain documentation** | Phase 6 | Document and publish supply chain traceability |
| **Carbon footprint metrics** | Phase 7 | Calculate and display carbon footprint per product category |
| **Sustainability claims audit** | Sept 2026 | Ensure all environmental claims are third-party certified per ECGT |
| **Take-back program exploration** | Phase 8 | Explore Teemill-style Remill model for premium prints |

**Priority:** 🟢 MEDIUM — Regulatory deadline is 2028, but early compliance = competitive moat. EU is the optimal beachhead (POD report Section 9.2.2).

**Estimated Effort:** 2 weeks initial setup + ongoing documentation

---

## GAP 5: Business Outcome Metrics — MEDIUM

### Research Finding
Top platforms track GMV, creator retention, and cohort economics. Blackout Merchandise's success criteria are engineering-focused (tests pass, build succeeds) with no business metrics.

**Evidence:**
- The milestone for follow-on seed round: 1,000 active artists OR $100,000 monthly GMV (POD report Section 9.2.1)
- Fourthwall's trajectory: $20M raise at estimated $80-100M valuation after demonstrating traction (Startup Intros)
- Investors require business metrics, not just technical completion

**Current Roadmap Status:** Success criteria are engineering-focused:
- "Tests pass, build succeeds" (Phase 6)
- "All database operations working" (Phase 4)
- No GMV, retention, or cohort targets exist

**Proposed Fix:** Add business metrics to each phase

| Phase | Engineering Metric (current) | Business Metric (proposed) |
|-------|------------------------------|---------------------------|
| **P0 Demo** | Features working | Demo video completion rate >60% |
| **P5 AI** | Mistral integration | AI-generated design adoption rate >50% |
| **P6 Commerce** | Stripe webhooks | First transaction date; $1K monthly GMV |
| **P7 Beta** | Tests pass | 100 active artists; $5K monthly GMV; 20% 30-day retention |
| **P8 Launch** | Build succeeds | 1,000 artists OR $100K monthly GMV (seed trigger) |
| **P9 Social** | Integrations working | 30% organic traffic; $500K monthly GMV |

**Priority:** 🟢 MEDIUM — Critical for seed fundraise and investor conversations.

**Estimated Effort:** 1 week (dashboard + metric tracking setup)

---

## GAP 6: Premium Art Product Category — MEDIUM

### Research Finding
> *"Home décor is fastest-growing at 24.5-28% CAGR. Gross margins 45-55% for canvas/prints vs. <25% for apparel. Displate proved $264M from single premium format."* — POD Competition Report, Section 2.3.1 / 9.3.3

**Evidence:**
- Home décor is the fastest-growing POD category at 24.5-26.74% CAGR (Grand View Research, Mordor Intelligence)
- Wall art alone could elevate POD décor to a $29.7 billion market by 2031 (Mordor Intelligence)
- Gross margins: 45-55% for personalized canvas/framed prints vs. sub-25% for commodity apparel (PrivSource)
- Displate generated $264 million from metal posters alone (accio.com)
- Premium art merchandise attracts established artists with portfolio-driven audiences, not volume-optimizing side-hustlers (POD report Section 9.3.3)

**Current Roadmap Status:** Product catalog focuses on apparel (t-shirts, hoodies). Phase 10 (Accessories Expansion) covers 3D jewelry but not premium art prints. Mockup system (Phase 5.5) has "Posters" as P2 - Future.

**Proposed Fix:** Add premium art merchandise to product catalog in Phase 5.5/6

| Product | Margin | Competitive Landscape |
|---------|--------|----------------------|
| **Museum-quality giclée prints** | 50-60% | INPRNT pays artists 50% (highest in industry) |
| **Limited editions with certificates** | 55-65% | Scarcity drives premium pricing |
| **Metal posters (Displate-format)** | 45-55% | Displate proved $264M market exists |
| **Embroidered premium apparel** | 40-50% | Printful's Coloreel partnership shows demand |
| **Premium home décor (canvas, framed)** | 45-55% | Fastest-growing category |

**Priority:** 🟢 MEDIUM — Higher margins justify prioritization. Should be part of MVP catalog, not deferred to Phase 10.

**Estimated Effort:** 2 weeks (product catalog expansion + supplier sourcing)

---

## New Proposed Phases

### Phase 7.5: Creator Success & Analytics (4 weeks)
- Unified profit analytics dashboard
- Creator onboarding flow with education modules
- Performance benchmarking vs. platform averages
- Success milestone notifications
- Cohort retention tracking

**Target:** Reduce creator churn from 76% (industry baseline) to <50% in first 6 months

### Phase 8.5: Traffic & Discovery Layer (6 weeks)
- SEO-optimized creator storefronts (structured data, sitemaps, schema)
- Social media automation pipeline (Instagram carousels, TikTok videos, Pinterest pins)
- Artist cross-promotion discovery feed
- Multi-channel publishing (Etsy, Amazon, TikTok Shop)

**Target:** 30% organic traffic share by Month 9 (vs. 0% for pure fulfillment platforms)

### Phase 9.5: AI Moat Conversion (ongoing, starting Month 4)
- Artist style preference tracking (opt-in)
- Design-to-conversion correlation database
- Artist-specific training data collection
- Print-readiness validation pipeline (DPI, CMYK, bleed-check)

**Target:** Proprietary dataset of 10,000+ design-to-sale correlations by Month 12

---

## Updated Success Metrics

### Engineering Metrics → Business Outcome Metrics

| Phase | Old Metric | New Metric | Target |
|-------|-----------|-----------|--------|
| P0 Demo | Features working | Demo video completion rate | >60% |
| P5 AI | API integration | AI design adoption rate | >50% of active creators |
| P6 Commerce | Stripe webhooks | First transaction; Monthly GMV | $1K |
| P7 Beta | Tests pass | Active artists; GMV; Retention | 100 artists; $5K; 20% |
| P8 Launch | Build succeeds | Artists OR GMV (seed trigger) | 1,000 OR $100K/month |
| P9 Social | Integrations working | Organic traffic share; GMV | 30%; $500K |

### Seed Fundraise Trigger
**Raise $2-5M seed upon reaching:**
- 1,000 active artists (published product + at least one sale), OR
- $100,000 monthly GMV

This matches the recommendation from the POD competition report (Section 9.2.1) and provides a concrete, measurable milestone for investor conversations.

---

## Implementation Priority

### Immediate (P0 Crowdfunding Sprint)
- [ ] GAP 5: Define business metrics for demo video and crowdfunding campaign
- [ ] GAP 6: Include premium art products in crowdfunding story (even if not yet built)

### Post-Crowdfunding (July-August 2026)
- [ ] GAP 1: Begin SEO storefront architecture (foundation layer)
- [ ] GAP 2: Implement style preference tracking and design-to-conversion logging
- [ ] GAP 4: Source GOTS/OEKO-TEX certified products; document supply chain

### Beta Phase (September-December 2026)
- [ ] GAP 1: Ship social media automation MVP
- [ ] GAP 3: Build creator success dashboard and onboarding education
- [ ] GAP 2: Launch design pattern recognition (basic ML model)

### Public Launch (January 2027+)
- [ ] GAP 1: Full traffic layer with cross-promotion network
- [ ] GAP 3: Advanced benchmarking and cohort analytics
- [ ] GAP 4: Full EPR compliance; carbon footprint display

---

## Research Citations

### Primary Sources
| Document | Sections Used |
|----------|--------------|
| `pod_competition_report.md` | 2.3.1 (Home décor growth), 5.3 (Creator success rates), 6.2 (AI gaps), 8.1.4 (AI half-life), 8.3 (Traffic gap), 9.1.4 (Traffic recommendations), 9.2.1 (Funding milestones), 9.3.3 (Premium art niche) |
| `merchandise-market-research.md` | 12.4 (EU regulations), 15.3 (Future predictions), 16 (Strategic insights) |
| `Roadmap.md` | All phases — gap identification |

### Key External Sources (from research)
- Precedence Research: Creator demographics and earnings data
- Grand View Research: POD market sizing and growth projections
- Mordor Intelligence: Software platform revenue share, creator segment CAGR
- NIM e.V.: Consumer AI trust research
- PwC: Sustainability premium willingness data
- Beveridge & Diamond PC: EU EPR regulatory timeline

---

*This document is a living analysis. As research evolves and roadmap priorities shift, gaps should be re-evaluated quarterly.*
