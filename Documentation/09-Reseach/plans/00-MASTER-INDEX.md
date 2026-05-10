# Research Implementation Plans — Master Index

> **Created**: May 10, 2026
> **Purpose**: Coordinate parallel execution of 8 implementation plans derived from deep market research
> **Source Data**: `merchandise-market-research.md` (462 lines) + `pod_competition_report.md` (2,858 lines)

---

## Quick Reference

| Plan | Title | Priority | Est. Time | Output File |
|------|-------|----------|-----------|-------------|
| [PLAN-01](./01-market-analysis-document.md) | Market Analysis Document | HIGH | 2-3h | `Documentation/01-Product/Market-Analysis.md` |
| [PLAN-02](./02-investor-pitch-enhancement.md) | Investor Pitch Enhancement | HIGH | 2-3h | `Documentation/01-Product/Investor-Pitch-Data.md` |
| [PLAN-03](./03-crowdfunding-campaign-upgrade.md) | Crowdfunding Campaign Upgrade | HIGH | 2-3h | `Documentation/07-Community/04-Crowdfunding-Landing/Campaign-Copy.md` |
| [PLAN-04](./04-roadmap-gap-analysis.md) | Roadmap Gap Analysis | HIGH | 2-3h | `Documentation/05-Roadmap/Roadmap-Research-Gaps.md` |
| [PLAN-05](./05-competitive-battlecard.md) | Competitive Battlecard | HIGH | 1.5-2h | `Documentation/01-Product/Competitive-Battlecard.md` |
| [PLAN-06](./06-brand-messaging-refresh.md) | Brand Messaging Refresh | MED-HIGH | 1.5-2h | `Documentation/04-Design/Brand-Messaging-Research.md` |
| [PLAN-07](./07-existing-docs-enrichment.md) | Existing Docs Enrichment | MEDIUM | 2-3h | Multiple existing files updated |
| [PLAN-08](./08-crowdfunding-landing-content.md) | Crowdfunding Landing Content | HIGH | 2-3h | `Documentation/07-Community/04-Crowdfunding-Landing/Landing-Page-Copy.md` |

**Total estimated time (if sequential)**: ~16-22 hours
**Total estimated time (if parallelized)**: ~3-4 hours with 8 agents

---

## Parallelization Map

### Group A — Fully Independent (run simultaneously)
These plans produce **new files only** and have zero conflicts:

```
PLAN-01  Market Analysis Document    → creates new file in 01-Product/
PLAN-02  Investor Pitch Enhancement  → creates new file in 01-Product/
PLAN-03  Campaign Copy               → creates new file in 07-Community/
PLAN-05  Competitive Battlecard      → creates new file in 01-Product/
PLAN-08  Landing Page Content        → creates new files in 07-Community/
```

### Group B — Minor Conflicts Possible (run after Group A or carefully)
These plans edit existing files:

```
PLAN-04  Roadmap Gaps                → creates new file + edits Roadmap.md
PLAN-06  Brand Messaging             → creates new file + edits Brand-Guidelines.md
PLAN-07  Existing Docs Enrichment    → edits multiple existing files
```

**Recommended execution order**:
1. Run Group A (5 plans) in parallel
2. Run Group B (3 plans) in parallel after Group A completes
3. Run consistency check after all complete

---

## How to Execute Each Plan

### In OpenCode CLI
```bash
# Start a new session for each plan
opencode

# Then in each session, instruct:
"Execute the plan at Documentation/09-Reseach/plans/0X-[name].md"
```

### Agent Prompt Template
For each plan, use this prompt pattern:

```
Execute the implementation plan at:
Documentation/09-Reseach/plans/0X-[name].md

Source data files (read these first):
- Documentation/09-Reseach/merchandise-market-research.md
- Documentation/09-Reseach/pod_competition_report.md

Read the plan completely before starting.
Follow the task breakdown in order.
Verify all acceptance criteria when done.
```

---

## Key Research Statistics (Quick Reference)

Use these across all plans — all are verified from the source research:

### Market Sizing
| Stat | Value | Source |
|------|-------|--------|
| Creator merch market (2025) | $6.8B | Dataintelo/Grand View |
| Projected (2034) | $13.4B (7.8% CAGR) | Industry consensus |
| POD market (2025) | $11.4B | IMARC median |
| POD projected (2033) | $57.5B (23.6% CAGR) | Grand View |
| EU POD (2024) | $1.97B | Ecomm.Design |
| EU POD projected (2033) | $13.69B (24.06% CAGR) | Ecomm.Design |
| Creator economy parent | $191-252B | Goldman Sachs |
| Superfan TAM | $4.5B | Goldman Sachs |

### Creator Economics
| Stat | Value | Source |
|------|-------|--------|
| 1 t-shirt = Spotify streams | 8,750 streams | Market Research §5.2 |
| Society6 creator earnings | 5% ($1.50 on $30) | POD Report §4.1 |
| Redbubble Standard fee | 50% of earnings | POD Report §4.1 |
| Creators earning <$100/year | 65% | Precedence Research |
| Full-time creators | 5% | Precedence Research |
| 3-year survival rate | 24% | POD Report §5.3 |
| Multi-stream income advantage | +$75,000/year | Market Research §9.4 |

### Consumer Behavior
| Stat | Value | Source |
|------|-------|--------|
| EU consumers paying sustainable premium | 80% (avg 9.7%) | PwC |
| Gen Z paying premium for sustainable | 76% | Market Research §6.2 |
| Gen Z buying after social media | 80% | Market Research §6.2 |
| Home décor CAGR (fastest) | 24.5-28% | Grand View/Mordor |
| T-shirts as % of merch sales | 56% | Market Research §6.4 |

### Competitive Intelligence
| Stat | Value | Source |
|------|-------|--------|
| Fyul (Printful+Printify) valuation | $1.3-1.5B | beyond-print.net |
| Printful reshipment rate | 0.19% | Ecommerce CEO |
| Printful AI image generation | None | Bootstrapping Ecommerce |
| Fourthwall funding | $20M | Startup Intros |
| Fourthwall native AI | No | Fourthwall |
| Canva users | 170M | Printify |
| Displate revenue (single format) | $264M | Grokipedia |
| Gelato EU delivery | 3-6 days | Bootstrapping Ecommerce |
| No. of competitors with voice AI | 0 (zero) | POD Report §6.1 |
| AI advantage half-life | ~12 months | POD Report §8.1.4 |

### Timing
| Window | Duration | Reason |
|--------|----------|--------|
| Fyul post-merger distraction | 18-24 months | Systems integration |
| AI differentiation | ~12 months | Competitors catching up |
| Marketplace artist migration | Active now | Fee compression |
| EU EPR full enforcement | By 2028 | Regulatory deadline |

---

## File Dependency Map

```
NEW FILES CREATED:
├── Documentation/01-Product/
│   ├── Market-Analysis.md              ← PLAN-01
│   ├── Investor-Pitch-Data.md          ← PLAN-02
│   └── Competitive-Battlecard.md       ← PLAN-05
├── Documentation/04-Design/
│   └── Brand-Messaging-Research.md     ← PLAN-06
├── Documentation/05-Roadmap/
│   └── Roadmap-Research-Gaps.md        ← PLAN-04
├── Documentation/07-Community/04-Crowdfunding-Landing/
│   ├── Campaign-Copy.md                ← PLAN-03
│   ├── Landing-Page-Copy.md            ← PLAN-08
│   └── Social-Proof-Data.md            ← PLAN-08

EXISTING FILES UPDATED:
├── Documentation/PRD.md                ← PLAN-07 (T1)
├── Documentation/01-Product/Business-Model.md  ← PLAN-07 (T2)
├── Documentation/01-Product/Vision.md          ← PLAN-07 (T3)
├── Documentation/04-Design/Brand-Guidelines.md ← PLAN-06 (T6)
├── Documentation/05-Roadmap/Roadmap.md         ← PLAN-04 (T5)
├── Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md ← PLAN-07 (T4)
├── Documentation/07-Community/04-Crowdfunding-Landing/Overview.md ← PLAN-07 (T5)
├── Documentation/05-Shared/Design-System.md    ← PLAN-07 (T6)
└── AGENTS.md                                   ← PLAN-07 (T7)
```

---

## Post-Execution Checklist

After all plans complete, verify:

- [ ] All 8 new files exist at their specified paths
- [ ] All existing files updated without breaking changes
- [ ] TAM/SAM/SOM figures are identical across all documents
- [ ] CAGR figures are consistent
- [ ] Competitor names are consistent (Fyul = Printful+Printify merged entity)
- [ ] Market year references are consistent (2025 base year)
- [ ] No "AI-generated" language in customer-facing docs
- [ ] No generic sustainability claims without certification references
- [ ] All statistics have source citations
- [ ] Cross-references between documents resolve correctly
- [ ] No contradictions between any two documents
