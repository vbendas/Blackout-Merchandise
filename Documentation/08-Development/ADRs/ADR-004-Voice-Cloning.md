# ADR-004: Voice Cloning for Cat-Suite Characters

**Date:** February 25, 2026
**Status:** IMPLEMENTED — Custom voices created on ElevenLabs (May 10, 2026)
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
1. ~~Source or record 30s voice samples per character~~ ✅
2. ~~Test ElevenLabs TTS quality with samples~~ ✅
3. ~~Verify Portuguese accent accuracy~~ ✅
4. Have ElevenLabs fallback ready (browser speechSynthesis or Mistral Voxtral TTS)

---

## Appendix: ElevenLabs Voice Description Prompts

Used to generate custom voices on ElevenLabs. Preserved here for replication if voices need to be recreated on any account or platform.

### Leopoldo Siqueira

> A smooth, authoritative Brazilian male voice in his prime — mid-forties, metropolitan São Paulo. Warm chest resonance with a velvet, persuasive quality, carrying the cadence of someone who has closed a thousand deals. Unhurried but purposeful, with a slight Brazilian lilt that softens the directness — every sentence lands like a confident suggestion you suspect is actually a command. Occasional emphatic drops for punctuation: *"Trust me. I have explored this path before."* Perfect audio quality.

### Francisca Teixeira

> A sharp, melodic Portuguese female voice — late twenties, northern Portuguese aristocracy. Clear, musical vowels with a Porto cadence, slightly imperious at the end of every phrase. She speaks with quick, decisive delivery punctuated by dramatic pauses before delivering a verdict. Manages to sound simultaneously exasperated and passionately invested — like someone with impeccable taste who is personally offended when the world doesn't meet her standard. A voice that could make *"No, no, no"* sound like a work of art. Perfect audio quality.

### Antônia Bendas

> A bright, energetic Irish female voice — early thirties, free-spirited Dublin. Light lilt with a playful, unpredictable cadence — sentences that chase each other like a cat after prey, with sudden excited peaks when she catches what she's hunting. Breathy optimism threaded through every line, speaking at a quick pace that somehow still feels warm and reassuring. Always sounds like she just sprinted across the warehouse and genuinely loved every second of it. Perfect audio quality.
