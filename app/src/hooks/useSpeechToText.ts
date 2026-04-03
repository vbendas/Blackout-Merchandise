'use client';

import { useCallback, useRef, useState } from 'react';

export interface SpeechToTextOptions {
  language?: string;
  silenceThreshold?: number; // Duration of silence in ms before stopping
  maxDuration?: number; // Max recording duration in ms
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechToTextReturn {
  isRecording: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetTranscript: () => void;
  isSupported: boolean;
}

/**
 * Custom hook for speech-to-text using Deepgram API
 * Used in workspace chat and waitlist interview flows
 *
 * Example usage:
 * ```tsx
 * const { isRecording, transcript, startRecording, stopRecording } = useSpeechToText();
 *
 * <button onClick={startRecording} disabled={isRecording}>
 *   {isRecording ? 'Recording...' : 'Start'}
 * </button>
 * ```
 */
export function useSpeechToText(options: SpeechToTextOptions = {}): UseSpeechToTextReturn {
  const { silenceThreshold = 2000, maxDuration = 60000, onTranscript, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if Web Audio API is supported
  const isSupported: boolean =
    typeof window !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia || (navigator as any).webkitGetUserMedia);

  const resetState = useCallback(() => {
    // Clear timers
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear refs
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    silenceTimerRef.current = null;
    maxDurationTimerRef.current = null;

    setIsRecording(false);
  }, []);

  const sendAudioForTranscription = useCallback(
    async (audioBlob: Blob) => {
      try {
        // Convert blob to base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        // Send to our Deepgram proxy endpoint
        const response = await fetch('/api/speech/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64Audio,
            mimeType: 'audio/webm',
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.transcript) {
          setTranscript((prev) => (prev ? prev + ' ' + data.transcript : data.transcript));
          onTranscript?.(data.transcript);
        } else if (data.error) {
          throw new Error(data.error);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to transcribe audio';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    },
    [onTranscript, onError]
  );

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Speech-to-text is not supported in your browser');
      return;
    }

    try {
      setError(null);
      setIsRecording(true);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio chunks
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      // Handle stop - send audio for transcription
      mediaRecorder.addEventListener('stop', async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudioForTranscription(audioBlob);
        }
        resetState();
      });

      // Start recording
      mediaRecorder.start();

      // Periodically send chunks for real-time transcription
      const _processingInterval = setInterval(() => {
        if (mediaRecorder.state === 'recording' && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          sendAudioForTranscription(audioBlob);
        }
      }, 1000);

      // Reset silence timer on any sound
      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, silenceThreshold);
      };

      // Set initial silence timer
      resetSilenceTimer();

      // Add user activity detection for silence reset
      stream.getAudioTracks()[0]?.addEventListener?.('unmute', resetSilenceTimer);

      // Set max duration timer
      maxDurationTimerRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, maxDuration);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsRecording(false);
    }
  }, [isSupported, silenceThreshold, maxDuration, sendAudioForTranscription, onError, resetState]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    resetState();
  }, [resetState]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
    isSupported,
  };
}
