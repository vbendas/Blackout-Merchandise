p# EU AI Act Compliance Strategy

> **Document Status:** Active Strategy
> **Last Updated:** May 9, 2026
> **Classification:** Limited Risk (Chatbot System)
> **Reference:** [[AI-Stack]], [[Human-in-the-Loop]]

---

## Executive Summary

Merch From is building an AI-native merchandise platform that uses conversational AI agents (the Cat-Suite) to guide artists through design, production, and sales. This document defines our proactive compliance strategy with the **EU AI Act (Regulation (EU) 2024/1689)**, which entered into force on August 1, 2024.

**Key Position:** We treat the EU AI Act not as a compliance burden, but as a **competitive differentiator**. Being "AI Act-ready from day one" signals to artists, investors, and regulators that we build responsibly.

---

## Risk Classification

### Determination: Limited Risk System

Under Article 52 of the EU AI Act, Merch From's Cat-Suite AI agents fall under **"limited risk"** systems — specifically, AI systems that interact with humans (chatbots) and must comply with transparency obligations.

| Factor | Assessment | Risk Level |
|--------|-----------|------------|
| **System Type** | Conversational AI (chatbots) | Limited Risk (Art. 52) |
| **Domain** | E-commerce / Creative tools | Not high-risk (Annex III) |
| **Impact on Fundamental Rights** | Minimal — users retain full autonomy | Low |
| **Biometric Processing** | None | Not applicable |
| **Decision-Making** | Recommendations only; no automated legal/financial decisions | Low |

**Why not high-risk?** We do not use AI for:
- Biometric identification (Annex III, Section 1)
- Critical infrastructure management
- Educational/vocational scoring
- Employment decisions
- Credit scoring or insurance pricing
- Criminal justice

---

## Transparency Obligations (Article 52)

### User Disclosure

**Requirement:** Users must be informed they are interacting with an AI system.

**Implementation:**

| Touchpoint | Disclosure Method | Copy |
|------------|-------------------|------|
| **First chat interaction** | In-chat banner | "You're chatting with Leopoldo, an AI assistant. A human team member reviews all conversations." |
| **App onboarding** | Modal during setup | "Meet the Cat-Suite — AI agents powered by Mistral, with human oversight from our team in Portugal." |
| **Discord bots** | Bot profile bio + first message | "Cat-Suite Bot | AI-powered assistant | Human-verified responses" |
| **MerchStation CLI** | Login screen footer | "Leopoldo AI assistant active. All AI-generated actions require human confirmation." |

### Generated Content Disclosure

**Requirement:** AI-generated content must be identifiable.

**Implementation:**
- All AI-generated mockups include subtle watermark: "AI-generated preview — final print approved by human"
- AI-suggested product descriptions tagged with an icon in the artist dashboard
- Order confirmations sent by Antonia clearly state: "This message was sent on behalf of [Artist Name] by MerchFrom's AI support agent"

---

## Data Governance & Training Data

### Training Data Transparency

**Requirement:** High-risk and general-purpose AI models must document training data. While we fall under limited risk, we voluntarily exceed requirements.

**Our Commitments:**

1. **No artist artwork used for model training without explicit opt-in**
   - Default: Artist designs are NEVER used to train or fine-tune any model
   - Opt-in program: Artists may contribute anonymized design patterns for MerchFrom-specific LoRA fine-tuning, with revenue-sharing for contributors

2. **Public training data registry**
   - Publish a living document listing all datasets used for any fine-tuning
   - Include: source, license, preprocessing steps, retention period

3. **Synthetic data preference**
   - Where possible, use synthetic data for internal model training
   - Expert panel scoring data (Phase 9+) is proprietary but documented

### Data Residency

| Data Type | Storage Location | Provider |
|-----------|-----------------|----------|
| Chat conversations | EU (France) | Mistral API |
| Voice recordings | EU (France) | Mistral API |
| Generated images | EU (Germany/France) | BFL API |
| User data | EU (Frankfurt) | Neon PostgreSQL |
| Session/cache | EU | Upstash Redis |

**Policy:** No artist data or customer data ever leaves European soil for AI processing.

---

## Human Oversight (Article 14)

While the EU AI Act's human oversight requirements technically apply to high-risk systems, we voluntarily implement them across all AI interactions.

**Structure: Every AI Agent Has a Human Lead**

| AI Agent | Human Lead | Oversight Scope |
|----------|-----------|----------------|
| **Leopoldo** | Head of Operations | All onboarding conversations, account decisions, platform guidance |
| **Francisca** | Head of Design | All design suggestions, mockup approvals, visual identity recommendations |
| **Antonia** | Head of Customer Success | All support tickets, order escalations, refund decisions |

**Implementation Details:**
- Daily review dashboard for each human lead showing all AI conversations from previous 24h
- Flagging system: AI automatically flags conversations with negative sentiment, unusual requests, or edge cases for human review
- Override capability: Human leads can correct, modify, or retract any AI response retroactively
- Weekly audit: Random sample of 5% of all AI interactions reviewed for quality and accuracy

See [[Human-in-the-Loop]] for full specification.

---

## Prohibited Practices (Article 5)

We explicitly commit to never deploy AI systems that:

| Prohibited Practice | Our Position |
|---------------------|-------------|
| Subliminal techniques beyond consciousness | **Never.** All AI interactions are overt and transparent |
| Exploitation of vulnerabilities (age, disability) | **Never.** No targeted manipulation based on user characteristics |
| Social scoring by public authorities | **Not applicable** — private platform |
| Real-time remote biometric identification in public spaces | **Not applicable** — no biometric processing |
| Emotion recognition in workplace/education | **Never.** No emotion detection on users |
| AI systems inferring sensitive data (ethnicity, health, etc.) | **Never.** We do not process or infer protected characteristics |
| Untargeted scraping of facial images | **Never.** No facial image processing |

---

## EU AI Sandbox Participation

### Strategy

Apply to **national AI regulatory sandboxes** to demonstrate responsible innovation and build regulatory relationships.

| Sandbox | Jurisdiction | Relevance | Timeline |
|---------|-------------|-----------|----------|
| **Spain AESIA Sandbox** | Spain | Spanish-speaking artist market, strong AI Act implementation | Q3 2026 |
| **Portugal IAPMEI Sandbox** | Portugal | Production facility location, EU funding access | Q3 2026 |
| **France CNIL Sandbox** | France | Mistral AI's home jurisdiction, data protection focus | Q4 2026 |

### Benefits

- **Regulatory certainty:** Test innovative features under supervisory guidance
- **Credibility:** "Sandbox-certified" signals maturity to investors and enterprise customers
- **Network:** Build relationships with regulators before they become enforcers
- **Competitive moat:** Most competitors will ignore sandboxes until forced

### Application Materials

1. Technical documentation of Cat-Suite system architecture
2. Risk assessment (this document)
3. Data governance policy
4. Human oversight procedures
5. Intended sandbox experiments (e.g., AI-generated design co-creation with human-in-the-loop validation)

---

## Transparency Documentation

### Public-Facing Documents

We will publish and maintain:

1. **AI Transparency Statement** (website footer link)
   - What AI systems we use
   - What data they process
   - How humans oversee them
   - How to opt out or request human-only service

2. **Artist Data Pledge** (legal document)
   - Your designs will never train third-party models
   - You own your AI-generated mockups
   - You can request deletion of all conversation history
   - Human review is guaranteed for all production decisions

3. **Model Card Repository** (GitHub)
   - For any fine-tuned models we create
   - Training data summary, performance metrics, limitations, bias assessments
   - Open-source where possible

---

## Compliance Checklist

### Pre-Launch (MVP)

- [x] Risk classification completed (Limited Risk)
- [x] Transparency disclosures drafted for all touchpoints
- [x] Human oversight structure defined (3 human leads)
- [x] Data residency policy established (EU-only)
- [ ] AI Transparency Statement published on website
- [ ] Artist Data Pledge drafted and reviewed
- [ ] First sandbox application submitted (Spain or Portugal)

### Post-Launch (Growth Phase)

- [ ] Quarterly AI Act compliance self-audit
- [ ] Annual third-party audit (budget: €5,000-10,000)
- [ ] Model cards published for all fine-tuned models
- [ ] Staff training on AI Act obligations (human leads)
- [ ] Incident response plan for AI-related complaints
- [ ] Update risk classification if system scope changes

### Scale Phase (250+ Artists)

- [ ] Dedicated Data Protection Officer (DPO) or AI Compliance Officer
- [ ] Participation in EU AI Act standardization working groups
- [ ] Publish annual AI Ethics Report
- [ ] B Corp or similar ethical certification incorporating AI governance

---

## Competitive Positioning

### Marketing Copy

> "While other platforms outsource your data to US cloud providers and black-box AI models, MerchFrom runs on European infrastructure with European AI. We're building AI Act compliance into our DNA — not because we have to, but because artists deserve to know exactly how their data and designs are handled."

### Investor Pitch Point

> "Regulatory moat: The EU AI Act will force compliance on all AI-native companies. We're building compliance as a first-class feature now, while competitors scramble later. This positions us as the trusted European partner when enterprise customers and large artists start asking hard questions about AI governance."

---

## Related Documents

- [[AI-Stack]] — Technical AI infrastructure
- [[Human-in-the-Loop]] — Human oversight specification
- [[Data-Sovereignty-Security-Position]] — Data handling and security
- [[Open-Source-Strategy]] — Open-source commitments
- [[../08-Development/ADRs/ADR-001-Mistral-Adoption]] — Mistral adoption rationale

---

**Document Owner:** Victor Bendas
**Created:** May 9, 2026
**Status:** Active Strategy
**Next Review:** August 9, 2026 (quarterly)
