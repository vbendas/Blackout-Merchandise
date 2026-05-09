# ADR-003: Real-Time Voice Conversation Architecture

**Date:** February 25, 2026
**Status:** ACCEPTED
**Deciders:** Victor Bendas

## Context
CatChat currently has a single hold-to-speak voice mode. Users expect continuous conversation (ChatGPT Voice, Siri, Alexa pattern). Mistral's Voxtral models enable sub-200ms STT and ~90ms TTS, making real-time conversation feasible.

## Decision
Add a second voice mode ("Talk") to CatChat for continuous real-time conversation:
- User clicks Talk button to start
- Voxtral Realtime streams audio → partial transcripts
- Mistral Large generates response (streaming)
- Response split into sentences, sent to Voxtral TTS immediately
- User hears agent speaking while LLM is still generating
- User clicks stop or says "stop" to end

## Architecture
```
Browser Mic → WebSocket → Voxtral Realtime STT (sub-200ms)
                         → Mistral Large (streaming LLM)
                         → Sentence splitter
                         → Voxtral TTS (~90ms per sentence)
                         → WebSocket → Browser Speakers
```

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
