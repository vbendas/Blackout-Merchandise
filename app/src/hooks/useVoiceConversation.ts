'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
 * - Auto-stop on silence (1.2s)
 * - Continuous turn-taking loop
 * - Audio level visualization
 */
export function useVoiceConversation({
  onSendAudio,
}: UseVoiceConversationOptions): VoiceConversationState {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for VAD and recording
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const isRecordingVoiceRef = useRef(false);
  const isProcessingVoiceRef = useRef(false);

  // Constants
  const SILENCE_THRESHOLD = 15;
  const SILENCE_DELAY_MS = 1200;
  const FFT_SIZE = 256;
  const SMOOTHING = 0.8;

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
    isRecordingVoiceRef.current = false;
    isProcessingVoiceRef.current = false;
    setAudioLevel(0);
    setStatus('idle');
  }, []);

  const processVoiceTurn = useCallback(
    async (audioBlob: Blob) => {
      if (isProcessingVoiceRef.current) return;
      isProcessingVoiceRef.current = true;
      setStatus('thinking');

      try {
        await onSendAudio(audioBlob);
      } catch (err) {
        console.error('[Voice Conversation] sendAudio failed:', err);
      } finally {
        isProcessingVoiceRef.current = false;
        setStatus('speaking');
        // After speaking, restart listening if still active
        setTimeout(() => {
          if (isActive) {
            setStatus('listening');
            startListening();
          }
        }, 2000);
      }
    },
    [onSendAudio, isActive]
  );

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
      const blob = new Blob(voiceAudioChunksRef.current, { type: 'audio/webm' });
      if (blob.size > 1000) {
        processVoiceTurn(blob);
      } else {
        // Too small, restart listening
        if (isActive) {
          setStatus('listening');
          startListening();
        }
      }
    };

    recorder.start();
  }, [processVoiceTurn, isActive]);

  const startListening = useCallback(() => {
    if (!analyserRef.current || !isActive) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const detect = () => {
      if (!isActive || status !== 'listening') return;

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      setAudioLevel(avg);

      if (avg > SILENCE_THRESHOLD) {
        if (!isRecordingVoiceRef.current) {
          startVoiceRecording();
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (isRecordingVoiceRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopVoiceRecording();
          silenceTimerRef.current = null;
        }, SILENCE_DELAY_MS);
      }

      vadFrameRef.current = requestAnimationFrame(detect);
    };

    vadFrameRef.current = requestAnimationFrame(detect);
  }, [isActive, status, startVoiceRecording, stopVoiceRecording]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;
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
  }, [startListening]);

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
