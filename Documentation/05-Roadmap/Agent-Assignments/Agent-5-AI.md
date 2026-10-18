# Agent 5: AI Specialist

> **Focus:** AI models, prompts, voice integration  
> **Phase 3.5-3.6 Estimated Time:** 4-6 hours  
> **Role Lead:** AI architecture and optimization

---

## Phase 3.5-3.6 Assignment Summary

**Primary Tasks:**
- Voice-to-voice pipeline design (1 hour)
- Interview question engineering (1 hour)
- MiniMax M2-her prompt optimization (2 hours)
- Testing and tuning (1-2 hours)

| Task | Focus | Est. Time | Status |
|------|-------|-----------|--------|
| Voice Pipeline | MiniMax Speech 2.6 Real-Time → M2-her → MiniMax Speech 2.6 | 1h | 🔄 Ready |
| Interview Prompts | 5 questions + responses | 1h | 🔄 Ready |
| M2-her Tuning | Optimize character prompts | 2h | 🔄 Ready |
| Testing | Latency, quality, fallbacks | 1-2h | ⏳ After API ready |

---

## Voice-to-Voice Pipeline Design

### Architecture (Pure MiniMax)
```
User Audio (WebM)
  ↓
MiniMax Speech 2.6 Real-Time (STT + TTS in one)
  ↓
MiniMax M2-her via MiniMax API (LLM)
  ↓
MiniMax Speech 2.6 Real-Time (response audio)
  ↓
User Speakers
```

### Specs
- **Total Latency:** <5 seconds (target)
- **Voice Model:** MiniMax Speech 2.6 Real-Time (ultra-low latency, <250ms)
- **LLM Model:** MiniMax M2-her (purpose-built for character conversations)
- **Cost:** ~$0.03-0.05/min (pure MiniMax - no external STT/TTS)

### Fallbacks
- If voice slow → stream partial response
- If LLM timeout → generic response
- If audio bad → ask to repeat

---

## Interview Question Engineering

### 5 Questions for Waitlist Interview

**Q1: "What kind of merch do you want to create?"**
- Expected answers: tees, hoodies, bags, hats, etc.
- Context for understanding artist

**Q2: "Do you already have designs, or need help creating them?"**
- Expected answers: yes (have designs), no (need help)
- Determines workflow complexity

**Q3: "How many followers do you have?"**
- Expected answers: ranges (1k-10k, 10k-50k, 50k+)
- Estimates potential volume

**Q4: "What's your biggest challenge with merch today?"**
- Open-ended: design, sourcing, pricing, shipping, etc.
- Identifies pain points

**Q5: "Anything else you'd like us to know?"**
- Open-ended: final thoughts, special requests
- Wraps up conversation

### Implementation in Code
```typescript
// /app/src/lib/waitlist/interview-questions.ts
export const INTERVIEW_QUESTIONS = [
  "What kind of merch do you want to create?",
  "Do you already have designs, or need help creating them?",
  "How many followers do you have?",
  "What's your biggest challenge with merch today?",
  "Anything else you'd like us to know?"
];
```

---

## MiniMax M2-her Prompt Optimization

### System Prompt for Leopoldo (Interview Context)
```
You are Leopoldo, a friendly tuxedo cat brand ambassador for Blackout Merchandise.

Your role: Conduct a welcoming interview with new artists interested in creating merchandise.

Style:
- Conversational and warm
- Encouraging and supportive
- Brief responses (1-2 sentences)
- Professional but personable

Current Interview Question: {QUESTION}

After hearing the user's answer, provide a supportive acknowledgment and ask the next question: {NEXT_QUESTION}

Examples:
User: "I want to make cool streetwear designs"
You: "That's awesome! Streetwear has huge potential. We love helping artists bring their vision to life. Do you already have designs ready, or would you like help creating them?"

User: "I have about 50k followers on TikTok"
You: "Wow, 50k followers! That's a great audience for merchandise. Your fans will love exclusive merch drops. What's your biggest challenge with merch right now?"
```

### System Prompt for M2-her (Chat Context)
```
You are a helpful AI assistant powering the Blackout Merchandise Cat-Suite agents (Leopoldo, Francisca, Antonia).

Your role: Help Leopoldo, Francisca, and Antonia respond to user questions about:
- Merchandise design and creation
- Product sourcing and quality
- Artist store management
- Order fulfillment and logistics

Maintain the distinct personality of each cat agent in your responses.
```

---

## Testing & Tuning

### Latency Testing
- [ ] Measure STT latency (should be <250ms)
- [ ] Measure LLM latency (should be <3s)
- [ ] Measure TTS latency (should be <1s)
- [ ] Total roundtrip <5s

### Quality Testing
- [ ] STT accuracy >95%
- [ ] LLM responses relevant
- [ ] TTS voice natural
- [ ] No robotic speech

### Fallback Testing
- [ ] Test timeout behavior
- [ ] Test error responses
- [ ] Test network interruption
- [ ] Test bad audio input

---

## Deliverables

- [ ] Interview questions finalized
- [ ] M2-her system prompts optimized
- [ ] Latency benchmarks documented
- [ ] Fallback logic implemented
- [ ] Testing results report

---

**Status:** READY TO START  
**Estimated Completion:** Feb 6, 2026  
**Owner:** Agent 5 (AI Specialist)
