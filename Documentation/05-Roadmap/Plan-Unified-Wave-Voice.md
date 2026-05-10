# Plan: Unified Wave Voice UX

> **Created**: May 10, 2026
> **Status**: Approved, Ready to Execute
> **Branch**: `feat/crowdfunding-demo`
> **Related**: P0 Demo Hardening (Crowdfunding Sprint)

---

## Overview

**Goal**: Replace the redundant dual-audio-input (mic button + wave icon) with a single wave icon in the input bar. The wave icon becomes a hold-to-speak button that triggers the full voice pipeline (STT → LLM → TTS). A subtitle overlay above the input shows live status + agent response text while audio plays. After audio finishes, the overlay hides and the agent's response appears in chat history.

**Scope**:
- ✅ Remove inline mic button entirely
- ✅ Move wave icon from header to input bar (where mic was)
- ✅ Update overlay to show agent response as subtitles during speaking
- ✅ Change voice messages to plain text in chat history
- ✅ Fix ElevenLabs voice selection diagnostics
- ❌ No changes to API routes or backend

**Affected Files**: `CatChat.tsx`, `ChatInput.tsx`, `elevenlabs-tts.ts`

---

## New UX Flow

```
┌─────────────────────────────────┐
│ Header: Agent Name + Close      │  ← Wave icon REMOVED from here
├─────────────────────────────────┤
│                                 │
│ Chat Messages (text only)       │
│                                 │
├─────────────────────────────────┤
│ [SUBTITLE OVERLAY]              │  ← Appears during voice
│ "Thinking..." / response text   │
├─────────────────────────────────┤
│ [🌊] [Text Input...] [Send]     │  ← Wave icon replaces mic
└─────────────────────────────────┘

Flow: Hold 🌊 → "Listening" → Release → "Thinking" →
      Subtitles + Audio plays → Auto-hide → Text in chat
```

### Detailed Interaction Sequence

```
1. User sees input bar with wave icon NEXT to text input (no separate mic button)
2. User HOLDS wave icon → wave overlay appears above input showing "Listening..." with animated bars
3. User SPEAKS
4. User RELEASES wave icon → wave overlay changes to "Thinking..."
5. API processes: STT → LLM → TTS
6. Response arrives → wave overlay shows agent's response TEXT (like subtitles/captions) while audio AUTO-PLAYS simultaneously
7. After audio finishes → wave overlay auto-hides with smooth animation
8. Agent's full response text appears in chat history as a regular message (for context/reference)
9. User's transcription also appears in chat as their message (for context)
```

---

## Task Breakdown

### T1 [MAIN] CatChat.tsx — Cleanup dead code (S)

Remove all unused state, refs, and functions:

| Remove | Lines (approx) | Reason |
|--------|----------------|--------|
| `isVoiceMode`, `setIsVoiceMode` from provider | ~173, 185 | Never used in component |
| `isRecording` from provider | ~174 | Legacy recording timer |
| `_isMessagePlaying` | ~175 | Alias, never used |
| `suggestions` | ~177 | Destructured but never referenced |
| `sendAudio` | ~187 | Only used by legacy `stopListening` |
| `recordingDuration` + timer useEffect | ~223, 272-289 | Legacy recording timer |
| `localIsPlaying` + `handlePlayPause` | ~222, 562-564 | Only for AudioMessageComponent (no longer used) |
| `isInlineRecording`, `showMicTooltip`, refs | ~226-231 | Inline mic removed |
| `inlineMediaRecorderRef`, `inlineAudioChunksRef` | ~441-442 | Inline mic removed |
| `mediaRecorderRef`, `audioChunksRef` | ~251, 253 | Legacy voice |
| `audioLevel` | ~235 | VAD removed, no real audio data |
| `startListening`, `stopListening` | ~391-420 | Legacy voice |
| `startInlineRecording`, `stopInlineRecording` | ~444-538 | Inline mic removed |
| `handleMicMouseDown`, `handleMicMouseUp` | ~540-569 | Inline mic removed |
| Inline mic cleanup useEffect | ~572-577 | Inline mic removed |
| `AudioMessageComponent` function + props | ~34-98 | No longer used (voice messages → text) |

**Verify**: No remaining references to removed variables/functions.

---

### T2 [MAIN] CatChat.tsx — Add wave subtitles state (S)

Add new state for the overlay subtitle display:

```typescript
const [waveSubtitles, setWaveSubtitles] = useState('');
```

This holds the agent's response text during the speaking phase. Cleared when overlay hides.

---

### T3 [MAIN] CatChat.tsx — Remove wave from header (S)

Remove the entire wave button block from the header (currently `absolute left-4`). The header becomes:
- **Center**: Agent name
- **Right**: Collapse (studio only) + Close

---

### T4 [MAIN] CatChat.tsx — Update processVoiceTurn (M)

Change how messages are created after voice processing:

**Current** (broken):
```typescript
// User message with type:'voice' + audioBlob → shows audio player, hides text
// Assistant message with type:'voice' + audioUrl → shows audio player, hides text
```

**New**:
```typescript
// 1. Add user transcription as plain text message (like typing)
// 2. Set waveSubtitles = response text → overlay shows subtitles
// 3. Auto-play TTS audio
// 4. After audio finishes → clear subtitles, add agent response to chat
```

Key changes:
- User message: `type: undefined` (renders as text), no `audioBlob`
- Agent message: `type: undefined` (renders as text), no `audioUrl`
- Set `waveSubtitles` before playing audio
- Clear `waveSubtitles` and set status to `'idle'` after audio finishes
- Add agent message to chat AFTER audio finishes (so overlay is the primary display)

`[CRITICAL]` The agent message must be added to chat in the `onended` callback of the audio, not immediately. This ensures the overlay is the primary display during speaking, and chat gets the permanent record after.

---

### T5 [MAIN] CatChat.tsx — Update ChatInput props (S)

Remove old mic props, add new wave + subtitle props:

**Remove**:
- `isInlineRecording`
- `onMicHoldStart`
- `onMicHoldEnd`
- `showHoldTooltip`
- `audioLevel`

**Add**:
- `onWaveHoldStart: () => void`
- `onWaveHoldEnd: () => void`
- `waveSubtitles: string`

**Keep**:
- `isVoiceConversationActive` (derived: `voiceConversationStatus !== 'idle'`)
- `voiceConversationStatus`

---

### T6 [PARALLEL] ChatInput.tsx — Replace mic with wave icon (M)

#### A. Update props interface — match T5 changes

#### B. Replace mic button with wave icon
- Same position (left of input)
- Hold-to-speak interaction: `onMouseDown`/`onMouseUp`/`onMouseLeave`/`onTouchStart`/`onTouchEnd`
- Wave SVG icon (same as was in header) instead of mic icon
- When active: red pulse + animated bars inside button
- Size matches current mic button (`h-11/h-12/h-14`)

#### C. Update voice overlay (the `AnimatePresence` block above input)
- Keep animated bars for all statuses
- Remove `audioLevel` dependency → use simulated random heights
- During `'listening'`: bars + "Listening..."
- During `'thinking'`: bars + "Thinking..."
- During `'speaking'`: bars + `waveSubtitles` text (multi-line if needed) + "Speaking..."
- Subtitle text styled like captions: `text-sm text-white/90 max-h-[80px] overflow-y-auto`
- Auto-hides when status goes to `'idle'`

#### D. Remove mic tooltip — no longer needed

---

### T7 [PARALLEL] elevenlabs-tts.ts — Voice diagnostics (S)

Add diagnostic logging to help debug the custom voice issue:

```typescript
console.log(`[ElevenLabsTTS] Using voice ID: ${voiceId} for agent: ${agent}`);
```

Also bump `similarity_boost` from `0.75` to `0.85` to better preserve custom voice characteristics.

`[VERIFY]` After deployment, check server logs for `[ElevenLabsTTS]` to confirm the correct voice ID is being used for Leopoldo.

---

## Parallelization Map

```
Group A (parallel, no dependencies):
  T1: CatChat dead code cleanup
  T7: ElevenLabs voice diagnostics

Group B (after T1):
  T2: Add wave subtitles state
  T3: Remove wave from header

Group C (after T2):
  T4: Update processVoiceTurn
  T5: Update ChatInput props

Group D (after T5):
  T6: ChatInput wave replacement

Group E (after all):
  Build verification (`npx next build` in /app)
```

---

## Key Decisions

1. **Overlay is primary display during voice** — Agent response text shows in overlay as subtitles while audio plays. Chat gets the permanent record after overlay hides.
2. **User transcription added to chat immediately** — Shows as text right after processing (before audio plays).
3. **Agent response added to chat after audio finishes** — So overlay is the main experience during speaking.
4. **No audio player in chat** — Messages are plain text. Audio auto-plays from overlay.
5. **Single wave button** — Same icon, same flow, no confusion.
6. **Simulated bar animation** — No real audio level needed, just visual feedback.

---

## Files Reference

| File | Purpose |
|------|---------|
| `app/src/components/chat/CatChat.tsx` | Main chat component — wave logic, processVoiceTurn, state |
| `app/src/components/chat/ChatInput.tsx` | Input bar — wave button, overlay, text input |
| `app/src/lib/ai/elevenlabs-tts.ts` | TTS provider — voice selection, diagnostic logging |
| `app/src/app/api/chat/voice/process/route.ts` | Voice pipeline API (no changes needed) |
| `app/src/lib/ai/mistral-client.ts` | LLM client (timeout already fixed to 30s) |

---

## Acceptance Criteria

- [ ] Wave icon is in the input bar (left of text input), NOT in the header
- [ ] No mic button anywhere — single wave button only
- [ ] Hold wave → "Listening..." overlay with animated bars
- [ ] Release wave → "Thinking..." overlay
- [ ] Response arrives → overlay shows response text as subtitles + audio auto-plays
- [ ] Audio finishes → overlay auto-hides with animation
- [ ] Agent's full response text appears in chat as regular text message
- [ ] User's transcription appears in chat as regular text message
- [ ] ElevenLabs uses the correct custom voice for the active agent
- [ ] `bun build` / `npx next build` passes with zero errors
