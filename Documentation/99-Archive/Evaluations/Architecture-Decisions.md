> Archived: the LoRA plan described here was retired on 2026-08-24 in favour of hosted reference-guided generation.

# Architecture Decision Records (ADRs)

**Last Updated:** February 25, 2026
**Status:** Active

---

## ADR-001: Mistral Full-Stack AI Adoption

**Date:** February 25, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

### Context
Blackout Merchandise needs an AI provider for LLM (chat), STT (speech-to-text), and TTS (text-to-speech). The Cat-Suite agents require character personalities, voice interaction, and real-time conversation capabilities.

### Decision
Adopt Mistral AI as the sole AI provider for the entire voice and text pipeline:
- **LLM:** Mistral Large (chat, agent routing, character personalities)
- **STT:** Voxtral Transcribe 2 (real-time speech recognition)
- **TTS:** Voxtral TTS (character voice synthesis with zero-shot cloning)

### Consequences
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

### Migration Plan
1. Phase 5: Replace MiniMax API calls with Mistral API
2. Phase 5: Record 3-5s voice samples per character for cloning
3. Phase 5: Add "Talk" button for real-time conversation mode
4. Phase 7+: Evaluate self-hosting Voxtral at 250+ artists

---

## ADR-002: Castelo Branco Facility Location

**Date:** February 25, 2026
**Status:** ACCEPTED (pending municipality confirmation)
**Deciders:** Victor Bendas

### Context
Blackout Merchandise needs an industrial facility for screen printing production. Original plan was Porto (rent €1,000-1,200/month, purchase €100-120K in Year 2-3).

### Decision
Relocate facility to Castelo Branco, Portugal (interior region):
- Industrial land at €0.01/m² via Invest CB municipal program
- 50% non-repayable equipment grant via Portugal 2030 interior incentives
- Own facility from day one instead of renting

### Consequences
**Positive:**
- ~€56.5K equipment grant recovery (50% of €113K)
- Near-zero land cost (€0.01/m²)
- Own facility = building equity, not burning rent
- Stronger crowdfunding/investor narrative ("own, not rent")
- De-risked asset position

**Negative:**
- Smaller talent pool (55K population vs Porto metro)
- 200km from Barcelos suppliers (vs 50km from Porto)
- Grant approval not guaranteed

### Verification Required
1. Confirm ALECB land terms with Castelo Branco municipality
2. Identify open Portugal 2030 calls compatible with investment structure
3. Do NOT promise in marketing until confirmed

---

## ADR-003: Real-Time Voice Conversation Architecture

**Date:** February 25, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

### Context
CatChat currently has a single hold-to-speak voice mode. Users expect continuous conversation (ChatGPT Voice, Siri, Alexa pattern). Mistral's Voxtral models enable sub-200ms STT and ~90ms TTS, making real-time conversation feasible.

### Decision
Add a second voice mode ("Talk") to CatChat for continuous real-time conversation:
- User clicks Talk button to start
- Voxtral Realtime streams audio → partial transcripts
- Mistral Large generates response (streaming)
- Response split into sentences, sent to Voxtral TTS immediately
- User hears agent speaking while LLM is still generating
- User clicks stop or says "stop" to end

### Architecture
```
Browser Mic → WebSocket → Voxtral Realtime STT (sub-200ms)
                         → Mistral Large (streaming LLM)
                         → Sentence splitter
                         → Voxtral TTS (~90ms per sentence)
                         → WebSocket → Browser Speakers
```

### Key Optimization
Don't wait for full LLM response before starting TTS. Split streamed output into sentences, send each to TTS as it arrives. User hears agent start talking while LLM generates the rest.

### Consequences
**Positive:**
- Natural conversation feel (<2s to first audio)
- Distinct character voices via voice cloning
- Major competitive differentiator (no competitor has this)
- Aligns with user expectations from ChatGPT Voice

**Negative:**
- More complex than one-shot voice
- Need to handle interruption (user starts talking while agent speaks)
- Higher infrastructure complexity (WebSocket streaming)

### Interruption Handling
1. Detect new speech input during TTS playback
2. Stop TTS output immediately
3. Process new utterance
4. Start fresh response

---

## ADR-004: Voice Cloning for Cat-Suite Characters

**Date:** February 25, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

### Context
Cat-Suite agents (Leopoldo, Francisca, Antônia) have distinct personalities but currently share generic TTS voices. Voxtral TTS supports zero-shot voice cloning with 3-5 second reference samples.

### Decision
Create distinct voice profiles for each agent using Voxtral TTS zero-shot cloning:

| Agent | Voice | Accent | Sample Source |
|-------|-------|--------|---------------|
| Leopoldo | Deep, confident, warm male | São Paulo Brazilian | Voice actor or synthetic |
| Francisca | Expressive, dramatic female | Porto European Portuguese | Voice actor or synthetic |
| Antônia | Light, energetic, melodic female | Dublin Irish English | Voice actor or synthetic |

### Consequences
**Positive:**
- Each agent sounds unique and matches their personality
- 3-5 second sample = minimal recording effort
- No fine-tuning required (zero-shot)
- Major brand differentiation

**Negative:**
- Need to source or create reference samples
- Quality depends on Voxtral TTS capability
- May need fallback to ElevenLabs if quality insufficient

### Next Steps
1. Source or record 3-5s voice samples per character
2. Test Voxtral TTS quality with samples
3. Verify Portuguese accent accuracy
4. Have ElevenLabs fallback ready
