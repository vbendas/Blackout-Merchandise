# ADR-004: Voice Cloning for Cat-Suite Characters

**Date:** February 25, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

## Context
Cat-Suite agents (Leopoldo, Francisca, Antônia) have distinct personalities but currently share generic TTS voices. ElevenLabs TTS supports zero-shot voice cloning with 30-second reference samples.

## Decision
Create distinct voice profiles for each agent using ElevenLabs TTS zero-shot cloning:

| Agent | Voice | Accent | Sample Source |
|-------|-------|--------|---------------|
| Leopoldo | Deep, confident, warm male | São Paulo Brazilian | Voice actor or synthetic |
| Francisca | Expressive, dramatic female | Porto European Portuguese | Voice actor or synthetic |
| Antonia | Light, energetic, melodic female | Dublin Irish English | Voice actor or synthetic |

## Consequences
**Positive:**
- Each agent sounds unique and matches their personality
- 30-second sample = high-quality cloning with emotion preservation
- No fine-tuning required (zero-shot)
- Major brand differentiation

**Negative:**
- Need to source or create reference samples
- Quality depends on ElevenLabs TTS capability
- May need fallback to browser speechSynthesis or Mistral Voxtral TTS if ElevenLabs unavailable

## Next Steps
1. Source or record 30s voice samples per character
2. Test ElevenLabs TTS quality with samples
3. Verify Portuguese accent accuracy
4. Have ElevenLabs fallback ready
