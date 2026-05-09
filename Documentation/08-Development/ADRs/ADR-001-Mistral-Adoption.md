# ADR-001: Mistral Full-Stack AI Adoption

**Date:** February 25, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

## Context
Merch From needs an AI provider for LLM (chat), STT (speech-to-text), and TTS (text-to-speech). The Cat-Suite agents require character personalities, voice interaction, and real-time conversation capabilities.

## Decision
Adopt Mistral AI as the sole AI provider for the entire voice and text pipeline:
- **LLM:** Mistral Large 3 (chat, agent routing, character personalities)
- **STT:** Voxtral Transcribe 2 (real-time speech recognition)
- **TTS:** Voxtral TTS (character voice synthesis with zero-shot cloning)

## Consequences
**Positive:**
- Single provider simplifies integration, billing, and support
- EU data residency (GDPR-native)
- Open weights (Apache 2.0) enable self-hosting at scale
- Voice cloning enables distinct Cat-Suite character voices
- 50%+ cost reduction vs MiniMax pipeline
- Portuguese language support natively

**Negative:**
- Voxtral TTS is very new (March 2026) — quality risk
- Mistral Large may not match MiniMax M2-her for character roleplay specifically
- Migration effort from existing MiniMax integration

## Migration Plan
1. Phase 5: Replace MiniMax API calls with Mistral API
2. Phase 5: Record 3-5s voice samples per character for cloning
3. Phase 5: Add "Talk" button for real-time conversation mode
4. Phase 7+: Evaluate self-hosting Voxtral at 250+ artists
