# ADR-004: Voice Cloning for Cat-Suite Characters

**Date:** February 25, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

## Context
Cat-Suite agents (Leopoldo, Francisca, Antônia) have distinct personalities but currently share generic TTS voices. Voxtral TTS supports zero-shot voice cloning with 3-5 second reference samples.

## Decision
Create distinct voice profiles for each agent using Voxtral TTS zero-shot cloning:

| Agent | Voice | Accent | Sample Source |
|-------|-------|--------|---------------|
| Leopoldo | Deep, confident, warm male | São Paulo Brazilian | Voice actor or synthetic |
| Francisca | Expressive, dramatic female | Porto European Portuguese | Voice actor or synthetic |
| Antonia | Light, energetic, melodic female | Dublin Irish English | Voice actor or synthetic |

## Consequences
**Positive:**
- Each agent sounds unique and matches their personality
- 3-5 second sample = minimal recording effort
- No fine-tuning required (zero-shot)
- Major brand differentiation

**Negative:**
- Need to source or create reference samples
- Quality depends on Voxtral TTS capability
- May need fallback to ElevenLabs if quality insufficient

## Next Steps
1. Source or record 3-5s voice samples per character
2. Test Voxtral TTS quality with samples
3. Verify Portuguese accent accuracy
4. Have ElevenLabs fallback ready
