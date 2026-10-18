# ADR-001: Mistral Full-Stack AI Adoption

**Date:** February 25, 2026
**Updated:** May 9, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

## Context
Merch From needs an AI provider for LLM (chat), STT (speech-to-text), TTS (text-to-speech), and image generation. The Cat-Suite agents require character personalities, voice interaction, and real-time conversation capabilities. We also need best-in-class image generation for product mockups.

## Decision
Adopt Mistral AI as the sole provider for voice and text, and Black Forest Labs (BFL) for image generation:
- **LLM:** Mistral Large 3 (chat, agent routing, character personalities)
- **Small LLM:** Mistral Small 4 (fast queries, cost-optimized support)
- **Code LLM:** Codestral (SQL/script generation for MerchStation)
- **STT:** Voxtral Transcribe 2 (real-time speech recognition)
- **TTS:** ElevenLabs TTS (character voice synthesis with zero-shot cloning)
- **Image Gen:** BFL API — FLUX 2 Flex / Pro / Max (mockup generation)

## Consequences
**Positive:**
- Single text/voice provider simplifies integration, billing, and support
- EU data residency for all AI processing (Mistral: France, BFL: Germany)
- Open weights (Apache 2.0) enable self-hosting at scale
- Voice cloning enables distinct Cat-Suite character voices
- 50%+ cost reduction vs MiniMax pipeline
- Portuguese language support natively
- Best-in-class image generation via FLUX 2
- "European AI" positioning aligns with brand values and EU market

**Negative:**
- ElevenLabs TTS is very new (March 2026) — quality risk
- Mistral Large may not match MiniMax M2-her for character roleplay specifically
- Migration effort from existing MiniMax integration
- Two providers instead of one (Mistral + BFL), though both European

## Strategic Positioning

### European AI Sovereignty
Our choice of Mistral (Paris) and BFL (Germany) is a **deliberate strategic decision**, not a compromise:
- **GDPR-native:** No data leaves European soil for AI processing
- **EU AI Act ready:** Limited risk classification with full transparency
- **Ethical alignment:** Open-weight philosophy matches our vegan/fair-trade brand values
- **Investor differentiation:** "European production + European AI" is a hard-to-replicate narrative

### Human-in-the-Loop Commitment
We explicitly reject AI replacement of humans:
- Every AI agent has a dedicated human lead (Head of Operations, Head of Design, Head of Customer Success)
- All AI-generated mockups require human approval before production
- Artists can request human support at any time
- Weekly audit of 5% of AI interactions for quality

### Open-Source Commitment
We will open-source non-critical tooling:
- `merchfrom-cli` — Artist-facing CLI (MIT)
- `@merchfrom/sdk` — Integration SDK (MIT)
- `merchfrom-ai-governance` — EU AI Act compliance toolkit (Apache 2.0)

## Migration Plan
1. Phase 5: Replace MiniMax API calls with Mistral API
2. Phase 5: Record 3-5s voice samples per character for cloning
3. Phase 5: Add "Talk" button for real-time conversation mode
4. Phase 5: Integrate BFL API for FLUX 2 mockup generation
5. Phase 6: Deploy Mistral Small 4 for Discord bot support queries
6. Phase 7+: Evaluate self-hosting Voxtral and Codestral at 250+ artists
