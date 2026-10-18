# Wave 2 Task 4: App Audio Input System

## Objective
Create voice conversation capability for the main app chat interface. Users can tap the mic button and speak with any of the three agents (Leopoldo, Francisca, or Antônia).

## Context
This is the app-side companion to the waitlist voice interview. Same technology, integrated into the chat UI.

## Files to Create

### 1. /app/src/components/AudioConversationLightbox.tsx
Full-screen voice conversation overlay.

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { MiniMaxOrb } from './ui/MiniMaxOrb';
import { RecordingButton } from './ui/RecordingButton';
import { useAudioRecording, formatDuration } from '@/hooks/useAudioRecording';

interface AudioConversationLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  agent: 'Leopoldo' | 'Francisca' | 'Antônia';
  onTranscription: (text: string) => void;
}

export function AudioConversationLightbox({
  isOpen,
  onClose,
  agent,
  onTranscription,
}: AudioConversationLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  const {
    isRecording,
    audioDuration,
    startRecording,
    stopRecording,
    getBase64Audio,
  } = useAudioRecording();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle recording
  const handleStartRecording = async () => {
    setStatus('listening');
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    setStatus('processing');
  };

  // Process audio after recording
  useEffect(() => {
    if (!isRecording && audioDuration > 0) {
      processAudio();
    }
  }, [isRecording, audioDuration]);

  const processAudio = async () => {
    try {
      const base64Audio = await getBase64Audio();
      
      const response = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          agent,
        }),
      });

      const data = await response.json();
      
      if (data.userText) {
        setTranscript(data.userText);
        onTranscription(data.userText);
      }
      
      if (data.aiText) {
        setAiResponse(data.aiText);
        setStatus('speaking');
        
        // Play audio response
        if (data.aiAudio) {
          playAudio(data.aiAudio);
        }
      }

    } catch (error) {
      console.error('Voice processing error:', error);
      setStatus('idle');
    }
  };

  const playAudio = (base64Audio: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.onended = () => {
      setStatus('idle');
    };
    audio.play();
  };

  const agentColors = {
    Leopoldo: '#e11d48', // Rose
    Francisca: '#8b5cf6', // Violet
    Antônia: '#06b6d4',   // Cyan
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Agent indicator */}
            <div className="mb-8 text-center">
              <p className="text-zinc-400 text-sm mb-1">Speaking with</p>
              <h2 
                className="text-2xl font-bold"
                style={{ color: agentColors[agent] }}
              >
                {agent}
              </h2>
            </div>

            {/* Orb visualization */}
            <div className="mb-8">
              <MiniMaxOrb 
                status={status} 
                agentColor={agentColors[agent]}
              />
            </div>

            {/* Transcript display */}
            <div className="w-full max-w-md mb-8 space-y-4">
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-800/50 rounded-2xl rounded-tr-md p-4 ml-auto max-w-[80%]"
                >
                  <p className="text-zinc-300">{transcript}</p>
                </motion.div>
              )}

              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-800/30 rounded-2xl rounded-tl-md p-4 max-w-[80%]"
                >
                  <p className="text-zinc-200">{aiResponse}</p>
                </motion.div>
              )}
            </div>

            {/* Recording controls */}
            <div className="text-center space-y-4">
              <RecordingButton
                isRecording={isRecording}
                onStart={handleStartRecording}
                onStop={handleStopRecording}
                disabled={status === 'processing'}
                color={agentColors[agent]}
              />

              <p className="text-zinc-400">
                {status === 'idle' && 'Tap to speak'}
                {status === 'listening' && `Recording ${formatDuration(audioDuration)}`}
                {status === 'processing' && 'Processing...'}
                {status === 'speaking' && `${agent} is speaking...`}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
```

### 2. /app/src/components/ui/MiniMaxOrb.tsx
Animated orb component.

```typescript
'use client';

import { motion } from 'framer-motion';

interface MiniMaxOrbProps {
  status: 'idle' | 'listening' | 'processing' | 'speaking';
  agentColor: string;
}

export function MiniMaxOrb({ status, agentColor }: MiniMaxOrbProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return '#3b82f6'; // Blue
      case 'processing':
        return '#f59e0b'; // Amber
      case 'speaking':
        return '#22c55e'; // Green
      default:
        return agentColor;
    }
  };

  const color = getStatusColor();

  return (
    <div className="relative w-32 h-32">
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: status === 'listening' ? [1, 1.2, 1] : 1,
          opacity: status === 'idle' ? 0.3 : 0.6,
        }}
        transition={{
          duration: 2,
          repeat: status === 'listening' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        }}
      />

      {/* Middle ring */}
      <motion.div
        className="absolute inset-4 rounded-full border-2"
        animate={{
          rotate: status === 'processing' ? 360 : 0,
          scale: status === 'speaking' ? [1, 1.05, 1] : 1,
        }}
        transition={{
          rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
          scale: { duration: 0.5, repeat: status === 'speaking' ? Infinity : 0 },
        }}
        style={{ borderColor: `${color}60` }}
      />

      {/* Inner orb */}
      <motion.div
        className="absolute inset-8 rounded-full"
        animate={{
          scale: status !== 'idle' ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: status !== 'idle' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}, ${color}80)`,
          boxShadow: `0 0 40px ${color}60`,
        }}
      />

      {/* Status icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        {status === 'listening' && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </motion.div>
        )}
        
        {status === 'processing' && (
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        
        {status === 'speaking' && (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-6 bg-white rounded-full"
                animate={{ height: [12, 24, 12] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. /app/src/components/ui/RecordingButton.tsx
Recording button with color support.

```typescript
'use client';

import { motion } from 'framer-motion';

interface RecordingButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  color?: string;
}

export function RecordingButton({
  isRecording,
  onStart,
  onStop,
  disabled = false,
  color = '#e11d48',
}: RecordingButtonProps) {
  return (
    <div className="relative">
      {/* Pulsing rings when recording */}
      {isRecording && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ backgroundColor: `${color}40` }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            style={{ backgroundColor: `${color}30` }}
          />
        </>
      )}

      {/* Main button */}
      <motion.button
        onClick={isRecording ? onStop : onStart}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all"
        style={{
          backgroundColor: isRecording ? color : '#27272a',
          border: isRecording ? 'none' : `2px solid ${color}60`,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isRecording ? (
          <div className="w-6 h-6 bg-white rounded-sm" />
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
```

### 4. /app/src/hooks/useAudioRecording.ts
Copy the same hook from mainpage (adjust paths if needed).

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';

interface UseAudioRecordingReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioDuration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  getBase64Audio: () => Promise<string>;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setAudioBlob(null);
      setAudioDuration(0);
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Update duration
      const interval = setInterval(() => {
        setAudioDuration(Date.now() - startTimeRef.current);
      }, 100);

      mediaRecorder.onstop = () => {
        clearInterval(interval);
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

    } catch (err) {
      setError('Microphone access denied or not available');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const getBase64Audio = useCallback(async (): Promise<string> => {
    if (!audioBlob) throw new Error('No audio recorded');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string).split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }, [audioBlob]);

  return {
    isRecording,
    audioBlob,
    audioDuration,
    error,
    startRecording,
    stopRecording,
    getBase64Audio,
  };
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}
```

### 5. /app/src/app/api/chat/voice/route.ts
API route for app voice chat.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MiniMaxSpeechClient } from '@/lib/ai/minimax-speech';
import { OpenRouterProvider } from '@/lib/ai/openrouter';
import { auth } from '@clerk/nextjs';

const speechClient = new MiniMaxSpeechClient(process.env.MINIMAX_API_KEY!);
const aiProvider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);

// Agent personalities
const agentPrompts = {
  Leopoldo: `You are Leopoldo, the Store Manager. Warm, slightly Brazilian, protective of artists.`,
  Francisca: `You are Francisca, the Art Director. Passionate about design, perfectionist, creative.`,
  Antônia: `You are Antônia, the Operations Lead. Efficient, optimistic, gets things done.`,
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio, agent }: { audio: string; agent: keyof typeof agentPrompts } = await req.json();

    if (!audio || !agent) {
      return NextResponse.json({ error: 'Missing audio or agent' }, { status: 400 });
    }

    // Step 1: STT
    const userText = await speechClient.speechToText(audio);

    // Step 2: Get context (you'd fetch conversation history here)
    // const context = await getConversationContext(userId);

    // Step 3: LLM with agent personality
    const aiResponse = await aiProvider.chat({
      model: 'minimax/m2.5',
      messages: [
        { role: 'system', content: agentPrompts[agent] },
        { role: 'user', content: userText }
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const aiText = aiResponse.choices[0].message.content;

    // Step 4: TTS
    const aiAudio = await speechClient.textToSpeech(aiText, {
      voice: agent === 'Francisca' ? 'female' : 'male',
    });

    return NextResponse.json({
      userText,
      aiText,
      aiAudio,
    });

  } catch (error) {
    console.error('Voice chat error:', error);
    return NextResponse.json(
      { error: 'Voice processing failed' },
      { status: 500 }
    );
  }
}
```

### 6. ChatInput Integration
Update `/app/src/components/chat/ChatInput.tsx` to add mic button:

```typescript
// Add import
import { AudioConversationLightbox } from '@/components/AudioConversationLightbox';

// Add state
const [isVoiceOpen, setIsVoiceOpen] = useState(false);

// Add in JSX after input, before send button:
<button
  onClick={() => setIsVoiceOpen(true)}
  className="p-2 text-zinc-400 hover:text-white transition-colors"
  title="Voice mode"
>
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
</button>

// Add at end of component:
<AudioConversationLightbox
  isOpen={isVoiceOpen}
  onClose={() => setIsVoiceOpen(false)}
  agent={currentAgent} // Pass current agent from context
  onTranscription={(text) => {
    setInput(text);
    setIsVoiceOpen(false);
    // Optionally auto-send
  }}
/>
```

## Testing

1. Open app chat
2. Click mic button
3. Speak to agent
4. Verify audio response plays
5. Check transcript appears in chat
6. Test all 3 agents

## Completion Criteria

- [ ] Mic button in chat input
- [ ] Lightbox opens full screen
- [ ] Orb pulses with state
- [ ] Audio recording works
- [ ] Full voice pipeline works
- [ ] Different colors per agent
- [ ] Closes properly back to chat
