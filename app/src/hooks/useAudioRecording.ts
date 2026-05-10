'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_CONFIG } from '@/lib/chat/config';

export interface AudioRecordingState {
  isRecording: boolean;
  duration: number;
  audioDuration: number; // backward-compatible alias
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  // Backward-compatible aliases for existing consumers
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  getBase64Audio: () => Promise<string | null>;
}

interface UseAudioRecordingOptions {
  onSendAudio?: (audioBlob: Blob) => Promise<void>;
  maxDurationSeconds?: number;
}

/**
 * Push-to-talk audio recording hook.
 *
 * Records audio while the user holds the button,
 * then sends the audio blob when released.
 *
 * Features:
 * - Auto-cleanup on unmount (releases mic, clears timers)
 * - Error propagation (not silently swallowed)
 * - Optional max duration auto-stop
 * - Stream track cleanup on error
 */
export function useAudioRecording(
  options: UseAudioRecordingOptions = {}
): AudioRecordingState {
  const { onSendAudio, maxDurationSeconds = 60 } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);

  // Callback ref to prevent stale closure
  const onSendAudioRef = useRef(onSendAudio);
  useEffect(() => {
    onSendAudioRef.current = onSendAudio;
  }, [onSendAudio]);

  const cleanup = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Already stopped or errored
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Clean up stream tracks immediately
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        lastBlobRef.current = audioBlob;

        // Send audio and handle errors properly
        if (onSendAudioRef.current) {
          onSendAudioRef
            .current(audioBlob)
            .catch((err) => {
              console.error('[AudioRecording] Send failed:', err);
              setError('Failed to send audio. Please try again.');
            });
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error('[AudioRecording] Recorder error:', e);
        setError('Recording error. Please try again.');
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Auto-stop at max duration
      maxDurationTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, maxDurationSeconds * 1000);
    } catch (error) {
      console.error('Microphone access denied:', error);
      setError('Microphone access denied. Please check permissions.');
    }
  }, [cleanup, maxDurationSeconds]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
  }, [cleanup]);

  const getBase64Audio = useCallback(async (): Promise<string | null> => {
    const blob = lastBlobRef.current;
    if (!blob) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data URL prefix to return just base64
        resolve(result.split(',')[1] || result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isRecording,
    duration,
    audioDuration: duration, // backward-compatible alias
    error,
    start,
    stop,
    // Backward-compatible aliases
    startRecording: start,
    stopRecording: stop,
    getBase64Audio,
  };
}
