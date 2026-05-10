'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_CONFIG } from '@/lib/chat/config';

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceConversationState {
  isActive: boolean;
  status: VoiceStatus;
  audioLevel: number;
  start: () => Promise<void>;
  stop: () => void;
}

interface UseVoiceConversationOptions {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
}

/**
 * Voice Activity Detection (VAD) based voice conversation hook.
 *
 * Features:
 * - Auto-recording on speech detection
 * - Auto-stop on silence (configurable via CHAT_CONFIG)
 * - Continuous turn-taking loop
 * - Audio level visualization
 *
 * Architecture:
 * - All mutable state accessed across async boundaries uses refs (not closures)
 * - This prevents stale closure bugs when setTimeout/requestAnimationFrame fire
 * - Circular callback dependencies are broken by storing callbacks in a single ref
 */
export function useVoiceConversation({
  onSendAudio,
}: UseVoiceConversationOptions): VoiceConversationState {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for VAD and recording infrastructure
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);

  // Mutable flags accessed across async boundaries (refs prevent stale closures)
  const isRecordingVoiceRef = useRef(false);
  const isProcessingVoiceRef = useRef(false);
  const isActiveRef = useRef(false);
  const statusRef = useRef<VoiceStatus>('idle');

  // Sync state to refs (critical for async callbacks to read current values)
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Callback ref to prevent stale closure in async handlers
  const onSendAudioRef = useRef(onSendAudio);
  useEffect(() => {
    onSendAudioRef.current = onSendAudio;
  }, [onSendAudio]);

  // ─── Constants from config ────────────────────────────────────────────────
  const { thresholds, timeouts, vad } = CHAT_CONFIG;

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (vadFrameRef.current) {
      cancelAnimationFrame(vadFrameRef.current);
      vadFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((t) => t.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (voiceMediaRecorderRef.current?.state === 'recording') {
      voiceMediaRecorderRef.current.stop();
    }
    voiceMediaRecorderRef.current = null;
    isRecordingVoiceRef.current = false;
    isProcessingVoiceRef.current = false;
    setAudioLevel(0);
    setStatus('idle');
  }, []);

  // ─── Voice Turn Processing ────────────────────────────────────────────────

  const processVoiceTurn = useCallback(
    async (audioBlob: Blob) => {
      if (isProcessingVoiceRef.current) return;
      isProcessingVoiceRef.current = true;
      setStatus('thinking');

      try {
        await onSendAudioRef.current(audioBlob);
      } catch (err) {
        console.error('[Voice Conversation] sendAudio failed:', err);
      } finally {
        isProcessingVoiceRef.current = false;
        setStatus('speaking');

        // After speaking, restart listening IF still active
        // Use ref to read current isActive (not stale closure)
        setTimeout(() => {
          if (isActiveRef.current && statusRef.current === 'speaking') {
            setStatus('listening');
            // startListening will be called by the VAD loop or manually
            // We trigger it by calling startListening which checks isActiveRef
            startListeningRef.current?.();
          }
        }, 2000);
      }
    },
    [] // No deps — uses refs for all mutable state
  );

  // ─── Recording Control ────────────────────────────────────────────────────

  const stopVoiceRecording = useCallback(() => {
    if (voiceMediaRecorderRef.current?.state === 'recording') {
      voiceMediaRecorderRef.current.stop();
    }
  }, []);

  const startVoiceRecording = useCallback(() => {
    if (!microphoneStreamRef.current || isRecordingVoiceRef.current) return;

    const recorder = new MediaRecorder(microphoneStreamRef.current);
    voiceMediaRecorderRef.current = recorder;
    voiceAudioChunksRef.current = [];
    isRecordingVoiceRef.current = true;
    setStatus('listening');

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) voiceAudioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      isRecordingVoiceRef.current = false;
      const blob = new Blob(voiceAudioChunksRef.current, {
        type: 'audio/webm',
      });
      if (blob.size > thresholds.minVoiceBlobSize) {
        processVoiceTurn(blob);
      } else {
        // Too small, restart listening if still active
        if (isActiveRef.current) {
          setStatus('listening');
          startListeningRef.current?.();
        }
      }
    };

    recorder.start();
  }, [processVoiceTurn, thresholds.minVoiceBlobSize]);

  // ─── VAD Loop ─────────────────────────────────────────────────────────────

  // Store startListening in a ref so processVoiceTurn can call it without circular deps
  const startListeningRef = useRef<(() => void) | null>(null);

  const startListening = useCallback(() => {
    if (!analyserRef.current || !isActiveRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const detect = () => {
      // Read refs for current state (not stale closure values)
      if (!isActiveRef.current || statusRef.current !== 'listening') return;

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      setAudioLevel(avg);

      if (avg > thresholds.audioLevel) {
        if (!isRecordingVoiceRef.current) {
          startVoiceRecording();
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (
        isRecordingVoiceRef.current &&
        !silenceTimerRef.current
      ) {
        silenceTimerRef.current = setTimeout(() => {
          stopVoiceRecording();
          silenceTimerRef.current = null;
        }, timeouts.silenceDetection);
      }

      vadFrameRef.current = requestAnimationFrame(detect);
    };

    vadFrameRef.current = requestAnimationFrame(detect);
  }, [startVoiceRecording, stopVoiceRecording, thresholds.audioLevel, timeouts.silenceDetection]);

  // Update ref so processVoiceTurn can call the latest startListening
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // ─── Public API ───────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = vad.fftSize;
      analyser.smoothingTimeConstant = vad.smoothingTimeConstant;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsActive(true);
      setStatus('listening');
      startListening();
    } catch (error) {
      console.error('[Voice Conversation] Microphone access denied:', error);
      setIsActive(false);
      setStatus('idle');
    }
  }, [startListening, vad.fftSize, vad.smoothingTimeConstant]);

  const stop = useCallback(() => {
    setIsActive(false);
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isActive,
    status,
    audioLevel,
    start,
    stop,
  };
}
