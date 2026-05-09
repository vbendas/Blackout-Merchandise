# Architecture

Technical architecture, technology stack, and infrastructure decisions.

---

## Documents

| Document | Purpose |
|----------|---------|
| [[Tech-Stack]] | Full technology stack with decisions and rationale |
| [[AI-Stack]] | AI model routing, costs, and scaling economics |
| [[Database-Schema]] | Drizzle ORM schema (source of truth in `/src/db/schema.ts`) |
| [[Database-Architecture]] | Data flow, relations, indexing strategy |
| [[Mockup-Architecture-Reference]] | Mockup generation pipeline |
| [[EU-AI-Act-Compliance]] | EU AI Act compliance strategy and sandbox participation |
| [[Human-in-the-Loop]] | AI + human oversight policy and organizational structure |
| [[European-Language-Fine-Tuning]] | European language and dialect fine-tuning strategy |
| [[Open-Source-Strategy]] | Open-source tooling and SDK roadmap |
| [[Data-Sovereignty-Security-Position]] | Data residency, security controls, and certification roadmap |
| [[Privacy-Policy]] | Privacy policy and data handling |
| [[Data-Protection-Impact-Assessment]] | GDPR DPIA compliance document |

---

## Stack at a Glance

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 + React 19 |
| **Database** | Neon PostgreSQL + Drizzle ORM |
| **Auth** | Clerk (passkeys, magic links, OAuth) |
| **Payments** | Stripe (Express Checkout, Connect) |
| **LLM** | Mistral Large 3 |
| **STT** | Mistral Voxtral Transcribe 2 |
| **TTS** | ElevenLabs TTS |
| **Image Gen** | BFL API (FLUX 2 Flex / Pro / Max) |
| **Color Separation** | OpenCV (Python) |
| **UI** | Tailwind CSS v4 + HeroUI |
| **CDN** | Cloudinary |
| **Cache** | Upstash Redis |

---

## Architecture Decision Records

See [[../08-Development/ADRs/README]] for all ADRs.

---

*Last Updated: May 2026*
