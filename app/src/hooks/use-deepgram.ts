'use client';

import { useCallback, useRef, useState } from 'react';

export type AgentState = 'disconnected' | 'connecting' | 'listening' | 'speaking' | 'processing';

export function useDeepgram() {
  const [state, setState] = useState<AgentState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');

  // Refs to persist objects across renders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const disconnectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    // Force cleanup any existing session first
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    try {
      // Reset state for new session
      setState('connecting');

      // 1. Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Setup MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      // Define cleanup function (to avoid circular dependency)
      const cleanup = () => {
        // Clear silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        // 1. Stop Recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }

        // 2. Stop Tracks
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }

        // 3. Process any remaining audio
        if (audioChunksRef.current.length > 0) {
          const processRemaining = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = Buffer.from(arrayBuffer).toString('base64');

            try {
              const response = await fetch('/api/deepgram/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audio: base64Audio,
                  options: { mimetype: 'audio/webm' },
                }),
              });

              const data = await response.json();

              if (data.success && data.transcript) {
                setTranscript((prev) => prev + ' ' + data.transcript);
              }
            } catch {
              // Deepgram proxy error (final)
            }
          };

          processRemaining();
        }

        // 4. Null out refs
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];

        setState('disconnected');
      };

      // Store cleanup for later use
      disconnectRef.current = cleanup;

      // Manual Silence Detection (Client-Side Fallback)
      const resetSilenceTimeout = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        // Force stop after 2 seconds of no audio
        silenceTimeoutRef.current = setTimeout(() => {
          cleanup();
        }, 2000);
      };

      // Start recording
      mediaRecorderRef.current.start(250);
      setState('listening');
      resetSilenceTimeout();

      // Process audio chunks periodically
      const processAudio = async () => {
        if (audioChunksRef.current.length > 0 && mediaRecorderRef.current?.state === 'recording') {
          // Combine all chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = []; // Clear chunks

          // Convert to base64
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');

          try {
            // Send to proxy endpoint
            const response = await fetch('/api/deepgram/proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: base64Audio,
                options: { mimetype: 'audio/webm' },
              }),
            });

            const data = await response.json();

            if (data.success && data.transcript) {
              setTranscript((prev) => prev + ' ' + data.transcript);
            }
          } catch {
            // Deepgram proxy error
          }

          resetSilenceTimeout();
        }

        // Continue processing if still recording
        if (mediaRecorderRef.current?.state === 'recording') {
          setTimeout(processAudio, 1000);
        }
      };

      // Start processing loop
      setTimeout(processAudio, 1000);
    } catch {
      setError('Failed to connect microphone');
      setState('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (disconnectRef.current) {
      disconnectRef.current();
      disconnectRef.current = null;
    }
  }, []);

  return {
    state,
    transcript,
    error,
    connect,
    disconnect,
    clearTranscript: () => setTranscript(''),
    isListening: state === 'listening' || state === 'speaking',
  };
}
