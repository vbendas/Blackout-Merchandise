# ADR-003: Real-Time Voice Conversation Architecture

**Date:** February 25, 2026
**Updated:** May 9, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

## Context
CatChat currently has a single hold-to-speak voice mode. Users expect continuous conversation (ChatGPT Voice, Siri, Alexa pattern). Mistral's Voxtral models enable sub-200ms STT. ElevenLabs provides premium TTS via a 33M-minute startup grant, making high-quality character voices cost-free.

## Decision
Add a second voice mode ("Talk") to CatChat for continuous real-time conversation:
- User clicks Talk button to start
- Mistral Voxtral Realtime streams audio → partial transcripts (sub-200ms)
- Mistral Large generates response (streaming)
- Response split into sentences, sent to ElevenLabs TTS immediately
- User hears agent speaking while LLM is still generating
- User clicks stop or says "stop" to end

## Architecture
```
Browser Mic → WebSocket → Mistral Voxtral Realtime STT (sub-200ms)
                         → Mistral Large (streaming LLM)
                         → Sentence splitter
                         → ElevenLabs TTS (~200-400ms per sentence)
                         → WebSocket → Browser Speakers
```

## Voice Provider Rationale
| Component | Provider | Why |
|-----------|----------|-----|
| **STT** | Mistral Voxtral Transcribe 2 | Sub-200ms, $0.003/min, Apache 2.0, EU-native |
| **LLM** | Mistral Large 3 | Character reasoning, 128K context, GDPR-compliant |
| **TTS** | ElevenLabs (grant) | Industry-leading quality, 32 languages, emotion control, voice cloning, 33M-min grant = $0 cost |
| **TTS Fallback** | Browser speechSynthesis | Zero-latency fallback if ElevenLabs unavailable |

## Consequences
**Positive:**
- Natural conversation feel (<2s to first audio)
- Distinct character voices via voice cloning
- Major competitive differentiator (no competitor has this)
- Aligns with user expectations from ChatGPT Voice

**Negative:**
- More complex than one-shot voice
- Need to handle interruption (user starts talking while agent speaks)
- Higher infrastructure complexity (WebSocket streaming)

## Interruption Handling
1. Detect new speech input during TTS playback
2. Stop TTS output immediately
3. Process new utterance
4. Start fresh response
