# Wave 2 Task 3: AI Interview Voice Mode

## Objective
Create voice interview mode using MiniMax Speech 2.6. This adds the "wow factor" - users can talk naturally with Leopoldo.

## Context
Voice mode should feel magical: tap mic → speak → hear Leopoldo's voice respond. Latency target under 3 seconds.

## Files to Create

### 1. /mainpage/src/lib/ai/minimax-speech.ts
MiniMax Speech 2.6 client for STT and TTS.

```typescript
// MiniMax Speech 2.6 API Client
// Docs: https://www.minimaxi.com/document/speech

interface STTResponse {
  text: string;
  confidence?: number;
}

interface TTSResponse {
  audio: string; // base64 encoded audio
  format: string;
}

export class MiniMaxSpeechClient {
  private apiKey: string;
  private baseUrl = 'https://api.minimaxi.chat/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Speech to Text (STT)
   * Converts audio to text
   */
  async speechToText(audioBase64: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/speech/recognize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        model: 'speech-02-6', // Latest model
        language: 'auto', // Auto-detect language
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax STT error: ${error}`);
    }

    const data: STTResponse = await response.json();
    return data.text;
  }

  /**
   * Text to Speech (TTS)
   * Converts text to audio
   */
  async textToSpeech(
    text: string, 
    options?: {
      voice?: string;
      speed?: number;
      volume?: number;
    }
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/speech/synthesize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model: 'speech-02-6',
        voice: options?.voice || 'leopoldo_male', // Custom voice if available
        speed: options?.speed ?? 1.0,
        volume: options?.volume ?? 1.0,
        language: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax TTS error: ${error}`);
    }

    const data: TTSResponse = await response.json();
    return data.audio; // base64 encoded
  }

  /**
   * Real-time voice stream (WebSocket)
   * For lower latency continuous conversation
   */
  async createVoiceStream(): Promise<WebSocket> {
    const wsUrl = `${this.baseUrl}/speech/stream?api_key=${this.apiKey}`;
    const ws = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('MiniMax voice stream connected');
        resolve(ws);
      };
      ws.onerror = (error) => {
        console.error('MiniMax voice stream error:', error);
        reject(error);
      };
    });
  }
}

// Singleton instance
let speechClient: MiniMaxSpeechClient | null = null;

export function getSpeechClient(): MiniMaxSpeechClient {
  if (!speechClient) {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY not set');
    }
    speechClient = new MiniMaxSpeechClient(apiKey);
  }
  return speechClient;
}
```

### 2. /mainpage/src/hooks/useAudioRecording.ts
Browser audio recording hook.

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
  resetRecording: () => void;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Reset state
      setAudioBlob(null);
      setAudioDuration(0);
      setError(null);
      chunksRef.current = [];

      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setAudioBlob(blob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        setAudioDuration(Date.now() - startTimeRef.current);
      }, 100);

    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone permission denied. Please allow microphone access.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('Unknown error starting recording');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const getBase64Audio = useCallback(async (): Promise<string> => {
    if (!audioBlob) {
      throw new Error('No audio recorded');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }, [audioBlob]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioDuration(0);
    setError(null);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    audioBlob,
    audioDuration,
    error,
    startRecording,
    stopRecording,
    getBase64Audio,
    resetRecording,
  };
}

// Helper function to format duration
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
```

### 3. /mainpage/src/app/api/waitlist/voice-interview/route.ts
API route for voice interview pipeline.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MiniMaxSpeechClient } from '@/lib/ai/minimax-speech';
import { OpenRouterProvider } from '@/lib/ai/openrouter';
import { 
  interviewQuestions, 
  getNextQuestionId, 
  isLastQuestion,
  getQuestionById,
  InterviewResponse 
} from '@/lib/waitlist/interview-questions';

const speechClient = new MiniMaxSpeechClient(process.env.MINIMAX_API_KEY!);
const aiProvider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);

const LEOPOLDO_SYSTEM_PROMPT = `You are Leopoldo, the onboarding agent for Blackout Merchandise.

Personality: Warm, slightly Brazilian accent, passionate about quality merch.
Keep responses under 100 words. Be conversational and engaging.`;

export async function POST(req: NextRequest) {
  try {
    const { 
      audio, // base64 encoded audio
      questionId,
      previousResponses,
    }: {
      audio: string;
      questionId: string;
      previousResponses: InterviewResponse[];
    } = await req.json();

    // Validate input
    if (!audio || !questionId) {
      return NextResponse.json(
        { error: 'Missing audio or questionId' },
        { status: 400 }
      );
    }

    // Step 1: Speech to Text
    console.time('STT');
    let userText: string;
    try {
      userText = await speechClient.speechToText(audio);
      console.timeEnd('STT');
      console.log('Transcribed:', userText);
    } catch (error) {
      console.error('STT error:', error);
      return NextResponse.json({
        error: 'Failed to transcribe audio',
        fallbackToText: true,
      }, { status: 200 });
    }

    // Step 2: Get question context
    const question = getQuestionById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Step 3: Get AI response
    console.time('LLM');
    const conversationContext = previousResponses
      .map(r => `Q: ${r.question}\nA: ${r.response}`)
      .join('\n\n');

    const prompt = `Previous conversation:
${conversationContext}

Current question: ${question.question}
User said: "${userText}"

Respond as Leopoldo. Acknowledge what they said, be warm, and move the conversation forward.
${isLastQuestion(questionId) ? 'This is the last question - wrap up enthusiastically.' : ''}`;

    const aiResponse = await aiProvider.chat({
      model: 'minimax/m2.5',
      messages: [
        { role: 'system', content: LEOPOLDO_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    console.timeEnd('LLM');

    const aiText = aiResponse.choices[0].message.content;

    // Step 4: Text to Speech
    console.time('TTS');
    let aiAudio: string;
    try {
      aiAudio = await speechClient.textToSpeech(aiText, {
        voice: 'leopoldo_male',
        speed: 1.0,
      });
      console.timeEnd('TTS');
    } catch (error) {
      console.error('TTS error:', error);
      // Return text without audio
      return NextResponse.json({
        userText,
        aiText,
        aiAudio: null,
        nextQuestionId: getNextQuestionId(questionId),
        isComplete: isLastQuestion(questionId),
        audioFailed: true,
      });
    }

    // Calculate latency
    const isComplete = isLastQuestion(questionId);

    return NextResponse.json({
      userText,      // What user said (for display)
      aiText,        // What Leopoldo said (for display)
      aiAudio,       // Base64 audio response
      nextQuestionId: isComplete ? null : getNextQuestionId(questionId),
      isComplete,
    });

  } catch (error) {
    console.error('Voice interview error:', error);
    return NextResponse.json({
      error: 'Voice processing failed',
      fallbackToText: true,
      message: 'Having trouble with voice mode. Let\'s switch to text!',
    }, { status: 200 });
  }
}
```

### 4. /mainpage/src/components/waitlist/VoiceModeToggle.tsx
Text/Voice mode toggle.

```typescript
'use client';

import { motion } from 'framer-motion';

interface VoiceModeToggleProps {
  mode: 'text' | 'voice';
  onChange: (mode: 'text' | 'voice') => void;
}

export function VoiceModeToggle({ mode, onChange }: VoiceModeToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
      <button
        onClick={() => onChange('text')}
        className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
          mode === 'text' 
            ? 'text-white' 
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {mode === 'text' && (
          <motion.div
            layoutId="activeMode"
            className="absolute inset-0 bg-zinc-700 rounded-md"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Text
        </span>
      </button>

      <button
        onClick={() => onChange('voice')}
        className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
          mode === 'voice'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {mode === 'voice' && (
          <motion.div
            layoutId="activeMode"
            className="absolute inset-0 bg-zinc-700 rounded-md"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        
        <span className="relative z-10 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Voice
        </span>
      </button>
    </div>
  );
}
```

### 5. /mainpage/src/components/waitlist/AudioWaveform.tsx
Animated waveform visualization.

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioWaveformProps {
  isRecording: boolean;
  isPlaying?: boolean;
}

export function AudioWaveform({ isRecording, isPlaying = false }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 20;
    const barWidth = canvas.width / (bars * 2);
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isRecording && !isPlaying) {
        // Draw flat line
        ctx.fillStyle = '#52525b';
        for (let i = 0; i < bars; i++) {
          const x = i * barWidth * 2 + barWidth / 2;
          const height = 4;
          const y = (canvas.height - height) / 2;
          ctx.fillRect(x, y, barWidth, height);
        }
        return;
      }

      // Animated waveform
      ctx.fillStyle = isRecording ? '#e11d48' : '#22c55e';
      
      for (let i = 0; i < bars; i++) {
        const x = i * barWidth * 2 + barWidth / 2;
        
        // Generate wave pattern
        const amplitude = isRecording ? 0.8 : 0.5;
        const frequency = 0.1;
        const height = Math.sin(phase + i * frequency) * canvas.height * amplitude + canvas.height * 0.3;
        
        const y = (canvas.height - height) / 2;
        
        // Draw bar with rounded corners
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 4);
        ctx.fill();
      }

      phase += 0.1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className="w-full h-16"
    />
  );
}
```

### 6. /mainpage/src/components/waitlist/RecordingButton.tsx
Recording button with pulsing animation.

```typescript
'use client';

import { motion } from 'framer-motion';

interface RecordingButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function RecordingButton({ 
  isRecording, 
  onStart, 
  onStop, 
  disabled = false 
}: RecordingButtonProps) {
  return (
    <div className="relative">
      {/* Pulsing rings when recording */}
      {isRecording && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-rose-500/30"
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.5, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-rose-500/20"
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.5, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.5,
            }}
          />
        </>
      )}

      {/* Main button */}
      <motion.button
        onClick={isRecording ? onStop : onStart}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
          isRecording 
            ? 'bg-rose-600 hover:bg-rose-700' 
            : 'bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isRecording ? (
          // Stop icon
          <div className="w-6 h-6 bg-white rounded-sm" />
        ) : (
          // Mic icon
          <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
```

### 7. /mainpage/src/components/waitlist/VoiceInterview.tsx
Main voice interview component (used in Step4Interview when mode='voice').

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@heroui/react';
import { RecordingButton } from './RecordingButton';
import { AudioWaveform } from './AudioWaveform';
import { useAudioRecording, formatDuration } from '@/hooks/useAudioRecording';

interface VoiceInterviewProps {
  onTranscribed: (text: string) => void;
  isProcessing: boolean;
}

export function VoiceInterview({ onTranscribed, isProcessing }: VoiceInterviewProps) {
  const {
    isRecording,
    audioDuration,
    error: recordingError,
    startRecording,
    stopRecording,
    getBase64Audio,
    resetRecording,
  } = useAudioRecording();

  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-stop after 30 seconds
  useEffect(() => {
    if (isRecording && audioDuration > 30000) {
      handleStopRecording();
    }
  }, [isRecording, audioDuration]);

  const handleStartRecording = async () => {
    setError(null);
    await startRecording();
  };

  const handleStopRecording = async () => {
    stopRecording();
  };

  // Process audio after recording stops
  useEffect(() => {
    if (!isRecording && audioDuration > 0) {
      processAudio();
    }
  }, [isRecording, audioDuration]);

  const processAudio = async () => {
    setIsTranscribing(true);
    setError(null);

    try {
      const base64Audio = await getBase64Audio();
      
      // Send to API for transcription
      const response = await fetch('/api/waitlist/voice-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          // Include other required params
        }),
      });

      const data = await response.json();

      if (data.fallbackToText) {
        setError('Voice processing failed. Falling back to text mode.');
        return;
      }

      if (data.userText) {
        setTranscription(data.userText);
        onTranscribed(data.userText);
      }

    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Failed to process audio. Please try again or switch to text mode.');
    } finally {
      setIsTranscribing(false);
      resetRecording();
    }
  };

  return (
    <div className="space-y-6">
      {/* Leopoldo avatar with waveform */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <Avatar
            src="https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/blackout-merchandise/avatars/leopoldo/speaking_a_attr1_subject.png"
            className="w-24 h-24 border-2 border-rose-500/30"
            isBordered
          />
          
          {isProcessing && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 bg-white rounded-full"
              />
            </div>
          )}
        </div>

        {/* Waveform */}
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <AudioWaveform 
            isRecording={isRecording} 
            isPlaying={isProcessing}
          />
        </div>

        {/* Duration */}
        {isRecording && (
          <p className="text-rose-400 font-mono text-lg">
            {formatDuration(audioDuration)}
          </p>
        )}
      </div>

      {/* Recording button */}
      <div className="flex justify-center">
        <RecordingButton
          isRecording={isRecording}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          disabled={isProcessing || isTranscribing}
        />
      </div>

      {/* Instructions */}
      <p className="text-center text-zinc-400 text-sm">
        {isRecording 
          ? 'Recording... tap to stop'
          : isTranscribing
          ? 'Processing your voice...'
          : isProcessing
          ? 'Leopoldo is thinking...'
          : 'Tap and hold to speak with Leopoldo'
        }
      </p>

      {/* Error message */}
      {(error || recordingError) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center"
        >
          <p className="text-red-400 text-sm">{error || recordingError}</p>
        </motion.div>
      )}

      {/* Transcription preview */}
      {transcription && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-zinc-900/30 rounded-lg p-3"
        >
          <p className="text-xs text-zinc-500 mb-1">You said:</p>
          <p className="text-zinc-300 italic">"{transcription}"</p>
        </motion.div>
      )}
    </div>
  );
}
```

## Integration with Step4Interview

Update the Step4Interview component (from Task 2) to include the voice interview:

In the mode === 'voice' section, replace the placeholder with:

```typescript
import { VoiceInterview } from './VoiceInterview';

// ... in the JSX where mode === 'voice':
<VoiceInterview 
  onTranscribed={(text) => {
    // Handle the transcribed text like a text message
    handleVoiceMessage(text);
  }}
  isProcessing={isLoading}
/>
```

## Testing Voice Mode

1. Click "Voice" toggle in Step 4
2. Tap microphone button
3. Speak clearly
4. Verify transcription appears
5. Check AI responds with audio
6. Test fallback to text on errors

## Key Metrics

- **STT Latency**: < 1 second
- **LLM Latency**: < 1.5 seconds
- **TTS Latency**: < 0.5 seconds
- **Total**: < 3 seconds end-to-end

## Completion Criteria

- [ ] Voice recording works in browser
- [ ] STT transcribes accurately
- [ ] TTS generates Leopoldo's voice
- [ ] Full pipeline works end-to-end
- [ ] Fallback to text on failures
- [ ] Latency under 3 seconds
- [ ] Visual feedback (waveform, pulsing button)
