# Tool Stack Decisions

**Last Updated:** February 25, 2026
**Status:** Active

---

## Decision Log

### Decision #1: AI Provider Stack — MiniMax → Mistral

**Date:** February 25, 2026
**Status:** APPROVED
**Impact:** High — affects entire AI pipeline, voice system, cost structure

#### Context
Merch From originally selected MiniMax as the AI provider for LLM (M2-her), STT, and TTS. The decision was based on MiniMax's character-roleplay capabilities and integrated voice pipeline.

#### Trigger for Re-evaluation
Mistral AI (Paris) released Voxtral Transcribe 2 (STT) and Voxtral TTS, completing a full voice pipeline. Combined with Mistral Large (LLM), Mistral now covers all three AI layers that Merch From needs.

#### Options Evaluated

| Criteria | MiniMax (Current) | Mistral (Proposed) | Winner |
|----------|-------------------|-------------------|--------|
| **LLM Quality** | M2-her (character roleplay) | Mistral Large (general purpose) | Tie |
| **STT** | MiniMax Speech 01-er | Voxtral Transcribe 2 ($0.003/min) | Mistral (10x cheaper) |
| **TTS** | MiniMax Speech 2.6 HD | Voxtral TTS (zero-shot cloning) | Mistral (voice cloning) |
| **Full Pipeline** | Yes (single provider) | Yes (single provider) | Tie |
| **EU Data Residency** | No (Chinese company) | Yes (Paris, GDPR-native) | Mistral |
| **Open Weights** | No | Yes (Apache 2.0) | Mistral |
| **Self-Hosting** | Not available | Available at scale | Mistral |
| **Cost** | ~$0.03-0.05/min voice | ~$0.003/min STT + LLM tokens | Mistral (50%+ cheaper) |
| **Portuguese Support** | Yes | Yes (13 languages STT, 9 TTS) | Tie |
| **Ethics/Values** | Chinese company, closed | European, open-weight | Mistral |
| **Voice Cloning** | Not available | 3-5s zero-shot cloning | Mistral |
| **Maturity** | Established | Voxtral TTS released Mar 2026 | MiniMax (newer) |

#### Decision
**Switch to Mistral for the entire AI stack.**

#### Rationale
1. **EU Sovereignty:** Data stays in EU, GDPR-native, European company
2. **Cost:** Voxtral STT at $0.003/min is 10x cheaper than any competitor
3. **Voice Cloning:** Zero-shot cloning enables distinct Cat-Suite character voices
4. **Open Weights:** Apache 2.0 models enable self-hosting at scale (250+ artists)
5. **Single Provider:** No multi-vendor complexity — LLM + STT + TTS from Mistral
6. **Brand Alignment:** Open-weight philosophy matches ethical-first positioning

#### Risk: Voxtral TTS Maturity
Voxtral TTS was released March 2026 — very new. Mitigation:
- Test thoroughly with Cat-Suite character voices before committing
- Verify Portuguese quality specifically
- Have fallback plan (ElevenLabs) if quality isn't there yet

#### Migration Path
| Phase | Action |
|-------|--------|
| Phase 5 | Replace MiniMax API calls with Mistral API |
| Phase 5 | Record voice cloning samples (3-5s per character) |
| Phase 5 | Add "Talk" button for real-time conversation mode |
| Phase 7+ | Evaluate self-hosting Voxtral at 250+ artists |

---

### Decision #2: Facility Location — Porto → Castelo Branco

**Date:** February 25, 2026
**Status:** APPROVED (pending municipality confirmation)
**Impact:** High — affects facility strategy, cost structure, crowdfunding narrative

#### Context
Merch From planned to lease industrial space in Porto (€1,000-1,200/month) with a goal to purchase property in Year 2-3 (€100-120K).

#### Trigger for Re-evaluation
Research revealed Castelo Branco offers:
- 50% non-repayable grant for interior Portugal investments (vs 30% coastal)
- €0.01/m² industrial land via Invest CB municipal program
- Near-free land for industrial investors

#### Options Evaluated

| Criteria | Porto (Current) | Castelo Branco (Proposed) | Winner |
|----------|----------------|--------------------------|--------|
| **Industrial Land** | €100-120K purchase | €0.01/m² (~€20 for 2,000m²) | Castelo Branco |
| **Monthly Rent** | €1,000-1,200/month | Near-zero (own land) | Castelo Branco |
| **Equipment Grant** | None documented | Up to 50% non-repayable | Castelo Branco |
| **Talent Pool** | Large (Porto metro) | Smaller (55K population) | Porto |
| **Supplier Proximity** | 50km to Barcelos | 200km to Barcelos | Porto |
| **Logistics** | Good (coastal) | Adequate (inland) | Porto (marginal) |
| **Crowdfunding Narrative** | "Renting in Porto" | "Own facility, grants, zero rent" | Castelo Branco |
| **Investor Risk Profile** | Burning rent | Building equity | Castelo Branco |

#### Decision
**Move facility to Castelo Branco.**

#### Rationale
1. **Financial:** 50% equipment grant on €113K = ~€56.5K recovered. Land at €0.01/m².
2. **De-risk:** Own facility from day one vs renting for 2-3 years.
3. **Crowdfunding:** "Own our industrial unit, grant-funded equipment" is a stronger pitch than "renting in Porto."
4. **E-commerce:** Logistics disadvantage is minimal for a mainly online business.
5. **Equity:** Building equity from day one vs burning rent money.

#### Risks
1. **Talent:** Smaller talent pool for production roles. Mitigation: remote-first for tech, trainable for production.
2. **Supplier Distance:** 200km to Barcelos vs 50km. Mitigation: bulk ordering schedules.
3. **Grant Uncertainty:** These are opportunities, not entitlements. Mitigation: confirm with municipality before committing in marketing.

#### Next Steps
1. Contact Castelo Branco municipality (Invest CB / ALECB) for land terms
2. Identify open Portugal 2030 calls compatible with Merch From's investment
3. Do NOT promise in crowdfunding until confirmed

---

### Decision #3: Voice Interface — Two Modes

**Date:** February 25, 2026
**Status:** APPROVED
**Impact:** Medium — affects CatChat UI, voice pipeline

#### Context
CatChat currently has a single voice mode: hold-to-speak mic button that does STT → LLM → TTS in a one-shot interaction.

#### Decision
Add a second voice mode: **Talk** (continuous real-time conversation).

#### Rationale
1. **User Expectation:** ChatGPT Voice, Siri, Alexa have trained users to expect continuous conversation.
2. **Cat-Suite Personality:** Agents have distinct personalities — continuous dialogue feels more natural.
3. **Mistral Enables It:** Voxtral Realtime (sub-200ms STT) + Voxtral TTS (~90ms) = responsive enough for natural conversation.
4. **Differentiation:** No competitor in the merch space offers voice conversation with AI agents.

#### Implementation
| Mode | Button | Behavior |
|------|--------|----------|
| **Speak-to-Text** | 🎤 (existing) | Hold, speak, release. One-shot. |
| **Talk** | 🗣️ (new) | Click to start, continuous back-and-forth, click/voice to stop. |

---

## Technology Stack Summary (Current)

| Layer | Provider | Notes |
|-------|----------|-------|
| **Framework** | Next.js 16 + React 19 | App Router, SSR/SSG |
| **Database** | Neon PostgreSQL + Drizzle ORM | Serverless, type-safe |
| **Auth** | Clerk | Passkeys, magic links |
| **Payments** | Stripe | Express Checkout, Connect |
| **LLM** | Mistral Large | EU-based, GDPR-native |
| **STT** | Mistral Voxtral Transcribe 2 | $0.003/min, Apache 2.0 |
| **TTS** | Mistral Voxtral TTS | Zero-shot cloning, Apache 2.0 |
| **Image Gen** | SDXL + Custom LoRAs | Via Replicate |
| **Color Sep** | OpenCV (Python) | K-means, CIEDE2000 |
| **UI** | Tailwind CSS v4 + HeroUI | Dark mode only |
| **Animation** | Framer Motion + GSAP | React-integrated |
| **CDN** | Cloudinary | Avatar assets, images |
| **Cache** | Upstash Redis | Sessions, rate limiting |
| **Email** | Resend | Transactional emails |

---

**Owner:** Victor Bendas
**Review Cycle:** Quarterly or when major technology decisions arise
