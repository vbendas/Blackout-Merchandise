# Data Sovereignty & Security Position

> **Document Status:** Active Strategy
> **Last Updated:** May 9, 2026
> **Reference:** [[EU-AI-Act-Compliance]], [[AI-Stack]]

---

## Executive Summary

Blackout Merchandise processes artist designs, customer data, and AI-generated content. Our position is simple: **all data stays in Europe, all AI processing runs on European infrastructure, and artists retain full ownership of their creative work.**

This document defines our security posture for the pre-certification phase. We will not pursue ISO 27001 or SOC 2 until revenue justifies the cost (estimated: post-€100K/month). Until then, we meet trust requirements through **transparency, technical controls, and public documentation**.

---

## Data Residency Policy

### The "European Soil" Commitment

| Data Type | Processing Location | Storage Location | Provider |
|-----------|--------------------|------------------|----------|
| **AI chat conversations** | France (Mistral API) | France | Mistral AI |
| **Voice recordings (STT)** | France (Mistral API) | France | Mistral AI |
| **Voice synthesis (TTS)** | France (Mistral API) | France | Mistral AI |
| **Image generation** | Germany/France (BFL API) | EU | Black Forest Labs |
| **Application data** | Frankfurt, Germany | Frankfurt, Germany | Neon PostgreSQL |
| **Session/cache data** | EU | EU | Upstash Redis |
| **Static assets (CDN)** | Global edge | EU primary | Cloudinary |

**Policy:** No artist design, customer personal data, or conversation history ever leaves the European Economic Area (EEA) for processing.

### Exceptions

| Scenario | Exception | Mitigation |
|----------|-----------|------------|
| **Cloudinary global CDN** | Images cached at edge locations worldwide | Original upload and primary storage in EU; edge caching is read-only |
| **Stripe payments** | Payment processing via Stripe's global infrastructure | Stripe is PCI-DSS certified; card data never touches our servers |
| **Clerk authentication** | Auth service may process login requests globally | Clerk is SOC 2 Type II certified; minimal PII exchanged |

---

## Security Controls

### Technical Controls (Implemented)

| Layer | Control | Implementation |
|-------|---------|---------------|
| **Encryption at rest** | AES-256 | Neon PostgreSQL native encryption |
| **Encryption in transit** | TLS 1.3 | All API connections (Neon, Mistral, BFL, Stripe) |
| **Database access** | SSL + connection string | Neon serverless driver with SSL enforced |
| **API keys** | Environment variables | Never committed to code; rotated quarterly |
| **Admin access** | Passphrase + argon2id | MerchStation TUI local-only with AES-256-GCM config |
| **Audit logging** | Append-only | All admin actions logged with timestamp, user, IP |
| **Backup encryption** | AES-256 | Neon automated backups encrypted |

### Application Security

| Control | Status | Detail |
|---------|--------|--------|
| **Input validation** | ✅ Implemented | Zod schemas on all API inputs |
| **SQL injection prevention** | ✅ Implemented | Drizzle ORM parameterized queries |
| **XSS protection** | ✅ Implemented | React escapes by default; CSP headers |
| **CSRF protection** | ✅ Implemented | Clerk handles session security |
| **Rate limiting** | ✅ Planned | Upstash Redis for API rate limiting |
| **Secret scanning** | ✅ Implemented | Pre-commit hooks block committed secrets |

---

## Artist Design Ownership

### The Artist Data Pledge

**Core Commitments:**

1. **You own your designs.** Always. Forever. We claim no rights.
2. **Your designs never train third-party AI models** unless you explicitly opt in.
3. **You can export everything** — designs, mockups, conversation history, sales data — at any time.
4. **You can delete everything** — full account deletion with 30-day confirmation window.
5. **We watermark nothing** — your mockups display your art, not our branding (except subtle "AI-generated preview" on unfinished work).

### Technical Implementation

| Feature | Implementation |
|---------|---------------|
| **Design storage** | Cloudinary with artist-owned folders |
| **Export** | One-click ZIP download of all assets + data |
| **Deletion** | Soft delete (30-day grace) → hard delete → purge from backups (90 days) |
| **Opt-in for training** | Explicit checkbox during onboarding; revocable anytime |
| **License terms** | Artist grants Blackout Merchandise only a production/fulfillment license; all other rights retained |

---

## Transparency Documentation

### Public Security Whitepaper

Instead of an expensive certification, we publish a **living security whitepaper** on our website:

**Contents:**
- Infrastructure diagram with data flow
- Complete list of third-party services and their certifications
- Encryption standards and key management
- Incident response procedure
- Vulnerability disclosure policy (bug bounty)
- Quarterly security update log

**Why this works:**
- Costs: €0 (engineering time only)
- Builds trust with technical artists and enterprise customers
- Demonstrates maturity without audit fees
- Can evolve into formal certification requirements later

### Vulnerability Disclosure Program

```
Responsible Disclosure Policy

We welcome security researchers to report vulnerabilities.

- Email: security@blackoutmerch.example
- PGP key: [published on website]
- Response time: < 48 hours for critical issues
- Bounty: €50-500 for valid reports (depending on severity)
- Safe harbor: We will not pursue legal action for good-faith research
```

---

## Incident Response Plan

### Severity Levels

| Level | Definition | Response Time | Notification |
|-------|-----------|---------------|--------------|
| **Critical** | Data breach, ransomware, production halt | < 1 hour | All affected artists + regulators within 72h |
| **High** | Unauthorized access attempt, significant outage | < 4 hours | Affected users within 24h |
| **Medium** | Minor vulnerability, partial degradation | < 24 hours | Status page update |
| **Low** | Cosmetic issue, non-security bug | < 1 week | Fix notes in changelog |

### GDPR Breach Notification

If a personal data breach occurs:
1. **Assess** within 24 hours: likelihood of harm to individuals
2. **Contain** within 48 hours: stop the breach, secure systems
3. **Notify DPA** within 72 hours: report to relevant EU Data Protection Authority
4. **Notify affected individuals** without undue delay if high risk
5. **Document** everything: cause, impact, remedial actions

---

## Certification Roadmap

### Why We Defer Formal Certifications

| Certification | Cost | Value Now | Value at Scale | Timeline |
|--------------|------|-----------|---------------|----------|
| **ISO 27001** | €15,000-40,000 | Low (no enterprise customers) | High (procurement requirement) | Year 2-3 |
| **SOC 2 Type II** | €20,000-60,000 | Low | High (US enterprise) | Year 2-3 |
| **B Corp** | €5,000-10,000 | Medium (brand alignment) | High (ethical market positioning) | Year 2 |
| **PCI-DSS** | N/A | Not applicable | Not applicable | Stripe handles this |

**Decision rule:** Pursue certification when a customer or partner explicitly requires it in a contract. Until then, transparency + technical controls + public whitepaper are sufficient and more capital-efficient.

### Pre-Certification Trust Building

| Action | Cost | Impact |
|--------|------|--------|
| Public security whitepaper | €0 | High trust with technical users |
| Bug bounty program | €500-2,000/year | Continuous external validation |
| Quarterly security blog posts | €0 | Demonstrates ongoing attention |
| Open-source security tooling | €0 (engineering time) | Community validation |
| EU AI sandbox participation | €0 (application time) | Regulatory credibility |

---

## Comparison: Our Approach vs. Typical SaaS

| Aspect | Typical US SaaS | Blackout Merchandise |
|--------|----------------|-----------|
| **Data residency** | US default, EU option | EU mandatory |
| **AI processing** | OpenAI (US) | Mistral (France) + BFL (Germany) |
| **Artist design ownership** | Platform claims broad license | Artist retains all rights |
| **Design used for AI training** | Often implicit in ToS | Explicit opt-in only |
| **Certifications** | SOC 2, ISO 27001 (expensive) | Transparent whitepaper (free) |
| **Incident disclosure** | Minimal, legal-driven | Proactive, public |
| **Open-source security** | None | Bug bounty + public tools |

---

## Marketing Positioning

### For Artists

> "Your designs are yours. Period. We don't train AI models on your art without asking. We don't lock you into our platform. Your data stays in Europe. And if you ever want to leave, you take everything with you — no questions asked."

### For Investors

> "Security and trust are not afterthoughts — they're our competitive moat. While competitors outsource to US clouds and hide behind vague Terms of Service, we publish our security architecture, run on European infrastructure, and give artists genuine ownership. This isn't just ethical. It's commercially smart: it reduces churn, increases referrals, and positions us for enterprise contracts when we're ready for certification."

---

## Related Documents

- [[EU-AI-Act-Compliance]] — Regulatory compliance framework
- [[AI-Stack]] — Technical infrastructure and provider choices
- [[Open-Source-Strategy]] — Security tooling open-source plan
- [[../02-Architecture/Privacy-Policy]] — Legal privacy policy
- [[../02-Architecture/Data-Protection-Impact-Assessment]] — GDPR DPIA

---

**Document Owner:** Victor Bendas
**Created:** May 9, 2026
**Status:** Active Strategy
**Next Review:** August 9, 2026
