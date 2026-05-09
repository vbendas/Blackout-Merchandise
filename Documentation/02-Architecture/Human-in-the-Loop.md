# Human-in-the-Loop Policy

> **Document Status:** Active Policy
> **Last Updated:** May 9, 2026
> **Reference:** [[EU-AI-Act-Compliance]], [[AI-Stack]]

---

## Executive Summary

**Merch From commits that AI will never replace people. Every Cat-Suite AI agent has a dedicated human lead who oversees, validates, and can override every significant interaction.**

This is not a technical requirement. It is a **values-based business decision** that differentiates us from AI-native competitors who optimize for zero human involvement. We believe the future of creative commerce is **AI-amplified humans**, not human-replacing AI.

---

## The Principle

> **"Every AI agent reports to a human. Every important decision has human sign-off. Every artist can request a human at any time."**

This principle applies to:
- All Cat-Suite agent conversations
- All design and mockup approvals
- All production and printing decisions
- All customer support escalations
- All platform policy enforcement

---

## Organizational Structure

### AI Agent + Human Lead Pairing

| AI Agent | Role | Human Lead | Hiring Timeline | Domain |
|----------|------|-----------|-----------------|--------|
| **Leopoldo** | Store Manager | **Head of Operations** | Month 6-9 | Onboarding, administration, sales, platform guidance |
| **Francisca** | Art Director | **Head of Design** | Month 6-9 | Design curation, mockup approval, visual identity |
| **Antonia** | Operations Lead | **Head of Customer Success** | Month 4-6 | Order tracking, shipping, support, artist relationships |

### Human Lead Responsibilities

**Daily:**
- Review dashboard of all AI conversations from previous 24 hours
- Respond to AI-flagged conversations (sentiment, edge cases, errors)
- Correct or retract any AI response that was inaccurate or inappropriate

**Weekly:**
- Audit random sample (5%) of all AI interactions for quality
- Meet with engineering to report patterns, failures, and improvement opportunities
- Update AI training data or prompt templates based on observed issues

**Monthly:**
- Publish internal quality report (AI accuracy, human intervention rate, artist satisfaction)
- Recommend system improvements or policy changes
- Contribute to AI model fine-tuning datasets

**Quarterly:**
- Strategic review: Is the AI+human model working? What needs to change?
- Contribute to public AI Ethics Report
- Represent MerchFrom at industry events on responsible AI

---

## Operational Implementation

### 1. Real-Time Oversight Dashboard

Each human lead has a dedicated TUI/web dashboard:

```
┌─ Antonia Oversight Dashboard ──────────────────────────────────────────┐
│                                                                         │
│  TODAY'S CONVERSATIONS (247 total)                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Status      │ Count │ Action Required                            │   │
│  │ ✅ Resolved  │   198 │ None                                       │   │
│  │ ⚠️  Flagged  │    31 │ Review for accuracy                        │   │
│  │ 🚨 Escalated │    12 │ Human response needed                      │   │
│  │ ❌ Corrected │     6 │ AI response retracted, human sent          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  TOPICS REQUIRING ATTENTION                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. "Shipping to Azores" — AI gave incorrect timeline (3x today) │   │
│  │ 2. "Refund policy" — Artist disputed 14-day window              │   │
│  │ 3. "Bulk order discount" — AI offered unapproved rate           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Review Flagged]  [View Escalated]  [Export Report]  [Update Antonia] │
└─────────────────────────────────────────────────────────────────────────┘
```

**Technical Stack:**
- Built into MerchStation TUI (primary)
- Web fallback for mobile access
- Real-time WebSocket connection to conversation database
- Integration with Slack/Discord for urgent alerts

### 2. Automatic Flagging Rules

The AI system automatically flags conversations for human review when:

| Trigger | Condition | Urgency |
|---------|-----------|---------|
| **Negative sentiment** | Sentiment score < -0.3 | Review within 4 hours |
| **Refund request** | Any mention of refund, return, or chargeback | Review within 1 hour |
| **Legal concern** | Mention of lawyer, lawsuit, GDPR complaint | Immediate alert |
| **Complex query** | AI confidence < 70% on classification | Review within 24 hours |
| **Novel request** | Pattern not seen in last 30 days | Review within 24 hours |
| **Artist escalation** | User explicitly requests human | Immediate handoff |
| **Production hold** | AI suggests delaying or cancelling an order | Review before action |
| **Pricing anomaly** | AI quotes price outside approved range | Block until approved |

### 3. Human Override Protocol

**At any time, a human lead can:**
- Edit any AI response before it is sent
- Retract a sent AI response and send a corrected version
- Take over a conversation mid-thread
- Ban the AI from responding to a specific user (human-only mode)
- Modify AI behavior parameters (tone, verbosity, approval thresholds)

**User-Initiated Human Request:**
- Every chat interface includes: "Talk to a human" button
- Response time promise: < 4 hours during business hours, < 24 hours otherwise
- No penalties or friction for requesting human support
- Human response clearly labeled: "Marta, Head of Customer Success"

### 4. Design Approval Workflow

Francisca's design suggestions **never go to production without human sign-off**:

```
Artist Request → Francisca AI Generates Mockup → Head of Design Reviews
                                                           │
                                    ┌──────────────────────┼──────────────────────┐
                                    │                      │                      │
                                    ▼                      ▼                      ▼
                              [Approve]               [Request Changes]      [Reject]
                                    │                      │                      │
                                    ▼                      ▼                      ▼
                            Mockup approved          AI regenerates        Feedback sent
                            → Production queue       → Back to review      → Artist + AI
```

**Head of Design Approval Criteria:**
- Print feasibility (can this actually be screen printed?)
- Color accuracy (will the mockup match the final print?)
- Brand consistency (does it fit the artist's visual identity?)
- Quality threshold (is this good enough to ship?)

**Timeline:** Design approval within 24 hours of mockup generation.

---

## Hiring the Human Leads

### Role Profiles

#### Head of Customer Success (Antonia's Lead)

**When to hire:** Month 4-6 (after first 20-30 active artists)
**Background:** Customer support leadership, ideally in e-commerce or creative industries
**Location:** Portugal (co-located with production facility)
**Compensation:** Equal wage model (€1,400/month base + profit share)

**Responsibilities:**
- Own the end-to-end artist and customer support experience
- Oversee all Antonia AI interactions
- Handle escalations and complex support cases
- Build and maintain help center documentation
- Collect and act on artist feedback
- Design and run satisfaction surveys

#### Head of Design (Francisca's Lead)

**When to hire:** Month 6-9 (when mockup volume exceeds 50/week)
**Background:** Graphic design or art direction, print production experience preferred
**Location:** Portugal or remote (EU timezone)
**Compensation:** Equal wage model

**Responsibilities:**
- Approve or reject all AI-generated mockups before production
- Set and maintain visual quality standards
- Curate the product blanks catalog
- Develop design guidelines and templates
- Train Francisca AI on new styles and trends
- Lead the expert panel scoring system (Phase 9+)

#### Head of Operations (Leopoldo's Lead)

**When to hire:** Month 6-9 (when platform complexity requires dedicated ops)
**Background:** Operations management, startup experience preferred
**Location:** Portugal (co-located with production facility)
**Compensation:** Equal wage model

**Responsibilities:**
- Oversee all Leopoldo AI onboarding and administrative interactions
- Manage artist vetting and waitlist approval
- Coordinate between production, design, and support teams
- Run weekly operations reviews
- Manage platform policies and enforcement
- Oversee MerchStation TUI usage and optimization

---

## Metrics & Accountability

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| **AI accuracy** | > 90% | Human lead validation of random sample |
| **Human intervention rate** | 5-15% | Percentage of conversations requiring human input |
| **Escalation response time** | < 4 hours | Time from AI flag to human first response |
| **Artist satisfaction (AI)** | > 4.0/5 | Post-interaction survey |
| **Artist satisfaction (human)** | > 4.5/5 | Post-human-handoff survey |
| **Design approval rate** | > 85% | Percentage of AI mockups approved without revision |
| **Production error rate** | < 2% | Defects traced to AI-suggested designs |

### Public Reporting

**Quarterly AI Ethics Report** (published on blog):
- Aggregate AI accuracy metrics (anonymized)
- Human intervention trends
- Notable corrections or improvements
- Artist feedback summary
- Roadmap for AI capability improvements

---

## The "Human Room" Concept

Give each human lead a public persona that complements their AI agent:

| AI Agent | Human Lead Example | Public Presence |
|----------|-------------------|-----------------|
| Leopoldo | "Ricardo, Head of Operations" | Real photo, bio in artist dashboard, occasional blog posts |
| Francisca | "Inês, Head of Design" | Portfolio, design critiques in Discord, Instagram |
| Antonia | "Marta, Head of Customer Success" | Direct email for escalations, quarterly AMA in Discord |

**Why this matters:**
- Completes the trust loop: AI personality → human personality → resolution
- Artists feel they know a real person behind the platform
- Human leads become micro-influencers in the artist community
- Differentiates us from faceless AI platforms

---

## Investor Defense

### The Counterargument to "What If OpenAI Builds This?"

> "OpenAI can replicate our AI agents. They cannot replicate our human team. We have a Head of Design who spent 10 years in screen printing. A Head of Customer Success who knows every artist by name. A Head of Operations who manages a physical production facility. These humans are our moat. The AI makes them 10x more productive. But the AI without them is just a chatbot."

### Economics

| Scenario | Cost | Quality | Scalability |
|----------|------|---------|-------------|
| AI-only support | Low | Medium | High |
| Human-only support | Very high | High | Low |
| **AI + human oversight (ours)** | Medium | Very high | High |

At 1,000 artists, our model costs ~€200K/year in AI + human leads vs. €500K+ for human-only or significantly lower quality for AI-only. The hybrid model is the optimal point on the cost-quality curve.

---

## Related Documents

- [[EU-AI-Act-Compliance]] — Regulatory context for human oversight
- [[AI-Stack]] — Technical AI infrastructure
- [[../07-Community/04-TUI/MerchStation-Plan]] — Oversight dashboard technical spec

---

**Document Owner:** Victor Bendas
**Created:** May 9, 2026
**Status:** Active Policy
**Next Review:** August 9, 2026 (quarterly)
