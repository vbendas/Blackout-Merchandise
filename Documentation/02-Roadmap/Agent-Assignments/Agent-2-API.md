# Agent 2: API Specialist

> **Focus:** API routes, integrations, webhooks, external API calls  
> **Phase 3.5-3.6 Estimated Time:** 8-10 hours  
> **Role Lead:** Backend API architect

---

## Phase 3.5-3.6 Assignment Summary

**Primary Tasks:**
- 3.5.1.4: Deepgram STT API route (1.5 hours)
- 3.5.1.8: Voice-to-voice API (Deepgram full stack) (2 hours)
- 3.5.5.12: Catalog API endpoint (1 hour)
- 3.6.11: Text interview API (MiMo) (1.5 hours)
- 3.6.12: Voice interview API (Deepgram) (2 hours)

| Task | Subtasks | Est. Time | Status |
|------|----------|-----------|--------|
| 3.5.1.4 | STT route | 1.5h | 🔄 Ready |
| 3.5.1.8 | Voice agent | 2h | ⏳ Depends on Agent 3 |
| 3.5.5.12 | Catalog API | 1h | ⏳ Depends on Agent 1 |
| 3.6.11 | Text interview | 1.5h | ⏳ Depends on Agent 3 |
| 3.6.12 | Voice interview | 2h | ⏳ Depends on Agent 3 |

---

## Task 3.5.1.4: Deepgram STT API Route

**File:** `/app/src/app/api/speech/transcribe/route.ts` (NEW)  
**Est. Time:** 1.5 hours

### Implementation
Create POST endpoint that:
1. Receives audio blob from frontend
2. Sends to Deepgram Nova-3 model
3. Returns transcribed text

```typescript
import { Deepgram } from "@deepgram/sdk";

export async function POST(request: Request) {
  try {
    const audio = await request.arrayBuffer();
    const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
    
    const response = await deepgram.listen.prerecorded(
      { buffer: audio, mimetype: "audio/webm" },
      {
        model: "nova-3",
        language: "en",
        smart_format: true,
      }
    );

    return Response.json({
      success: true,
      transcript: response.results?.channels[0]?.alternatives[0]?.transcript || "",
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**Success Criteria:**
- [ ] POST endpoint responds to audio files
- [ ] Deepgram API integration working
- [ ] Error handling for bad audio/network
- [ ] Returns clean transcript text

---

## Task 3.5.1.8: Voice-to-Voice API (Deepgram)

**File:** `/app/src/app/api/speech/voice-agent/route.ts` (NEW)  
**Est. Time:** 2 hours

### Architecture
```
User Audio (WebM) 
  → Deepgram STT (Nova-3) 
  → MiMo via OpenRouter (LLM)
  → Deepgram TTS (Aura-2)
  → Audio Stream back to user
```

### Implementation
```typescript
import { Deepgram } from "@deepgram/sdk";
import { OpenRouter } from "@openrouter/api";

export async function POST(request: Request) {
  try {
    const { audio, agent } = await request.json();
    
    // 1. STT
    const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
    const sttResult = await deepgram.listen.prerecorded(
      { buffer: Buffer.from(audio, "base64"), mimetype: "audio/webm" },
      { model: "nova-3", language: "en" }
    );
    const userMessage = sttResult.results?.channels[0]?.alternatives[0]?.transcript;
    
    // 2. LLM
    const openrouter = new OpenRouter(process.env.OPENROUTER_API_KEY);
    const llmResponse = await openrouter.chat.completions.create({
      model: "mistralai/mistral-7b-instruct:free",
      messages: [
        { role: "user", content: userMessage }
      ],
      system: `You are ${agent}, a Cat-Suite brand ambassador. Be conversational and helpful.`,
    });
    const agentMessage = llmResponse.choices[0]?.message.content;
    
    // 3. TTS
    const ttsResult = await deepgram.speak.request(
      { text: agentMessage },
      { model: "aura-asteria-en" }
    );
    const audioBuffer = await ttsResult.getStream();
    
    return new Response(audioBuffer, {
      headers: { "Content-Type": "audio/webm" },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

**Success Criteria:**
- [ ] Receives audio from frontend
- [ ] Transcribes correctly via Deepgram
- [ ] Gets LLM response from OpenRouter
- [ ] Converts response to audio via TTS
- [ ] Returns audio stream to frontend
- [ ] End-to-end latency <5 seconds

---

## Task 3.5.5.12: Catalog API Endpoint

**File:** `/app/src/app/api/catalog/route.ts` (NEW)  
**Est. Time:** 1 hour

### Implementation
GET endpoint with optional filters:

```typescript
import { getProductBlanks, getProductBlanksByCategory, searchProductBlanks } from "@/db/productBlanks";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    let products;
    
    if (search) {
      products = await searchProductBlanks(search);
    } else if (category) {
      products = await getProductBlanksByCategory(category);
    } else {
      products = await getProductBlanks(undefined, true);
    }

    return Response.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

**Success Criteria:**
- [ ] GET endpoint working
- [ ] Category filter works
- [ ] Search works
- [ ] Returns proper JSON
- [ ] Handles errors gracefully

---

## Task 3.6.11: Text Interview API (MiMo)

**File:** `/app/src/app/api/waitlist/interview/route.ts` (NEW)  
**Est. Time:** 1.5 hours

### Implementation
POST endpoint that handles text-based interview:

```typescript
export async function POST(request: Request) {
  try {
    const { userResponse, questionIndex, email, agent = "Leopoldo" } = await request.json();

    // Get next interview question
    const questions = getInterviewQuestions();
    const nextQuestion = questions[questionIndex + 1];

    // Call MiMo to generate response
    const openrouter = new OpenRouter(process.env.OPENROUTER_API_KEY);
    const response = await openrouter.chat.completions.create({
      model: "mistralai/mistral-7b-instruct",
      messages: [
        { role: "user", content: userResponse }
      ],
      system: `You are ${agent}. Respond to the user's answer and ask the next question: "${nextQuestion}". Keep response short (1-2 sentences).`,
    });

    // Save response to database
    await saveInterviewResponses(email, {
      [`q${questionIndex}`]: userResponse,
    });

    return Response.json({
      success: true,
      nextQuestion: nextQuestion || null,
      agentResponse: response.choices[0]?.message.content,
      isLast: questionIndex >= questions.length - 1,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

**Success Criteria:**
- [ ] POST endpoint receives user response
- [ ] Gets next interview question
- [ ] Calls MiMo for conversational response
- [ ] Saves responses to database
- [ ] Returns next question to frontend

---

## Task 3.6.12: Voice Interview API (Deepgram)

**File:** `/app/src/app/api/waitlist/voice-interview/route.ts` (NEW)  
**Est. Time:** 2 hours

### Implementation
Same as 3.5.1.8, but tailored for interview:

```typescript
export async function POST(request: Request) {
  try {
    const { audio, questionIndex, email, agent = "Leopoldo" } = await request.json();

    // 1. STT
    const userText = await transcribeAudio(Buffer.from(audio, "base64"));

    // 2. LLM (get interview response)
    const questions = getInterviewQuestions();
    const currentQuestion = questions[questionIndex];
    const nextQuestion = questions[questionIndex + 1];
    
    const response = await getLLMResponse(userText, {
      system: `You are ${agent}. Responding to interview question: "${currentQuestion}". Then ask: "${nextQuestion}". Keep it conversational.`,
    });

    // 3. TTS
    const audioStream = await textToSpeech(response);

    // Save interview data
    await saveInterviewResponses(email, {
      [`q${questionIndex}_voice`]: userText,
    });

    return new Response(audioStream, {
      headers: { "Content-Type": "audio/webm" },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

**Success Criteria:**
- [ ] Receives voice audio from frontend
- [ ] Transcribes correctly
- [ ] Gets LLM response for interview flow
- [ ] Converts to speech
- [ ] Returns audio to frontend
- [ ] Saves interview responses to DB

---

## Dependencies

### Blocking:
- **Agent 3:** Needs these APIs to build voice UI and interview components

### Depends On:
- **Agent 1:** Schema updates (for catalog API)
- **Agent 5:** AI prompt engineering for interview questions

---

## Environment Variables Required

```env
DEEPGRAM_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

---

## Testing Checklist

- [ ] Test STT with real audio files
- [ ] Test voice-to-voice roundtrip latency
- [ ] Test catalog API with various filters
- [ ] Test interview API with different user responses
- [ ] Verify error handling for timeouts
- [ ] Test with slow network (throttle in DevTools)

---

**Status:** READY TO START  
**Estimated Completion:** Feb 6, 2026  
**Owner:** Agent 2 (API Specialist)
