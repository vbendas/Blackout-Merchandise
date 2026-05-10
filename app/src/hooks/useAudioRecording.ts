'use client';

import { useCallback, useRef, useState } from 'react';

export interface AudioRecordingState {
  isRecording: boolean;
  duration: number;
  start: () => Promise<void>;
  stop: () => void;
}

interface UseAudioRecordingOptions {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
}

/**
 * Push-to-talk audio recording hook.
 *
 * Records audio while the user holds the button,
 * then sends the audio blob when released.
 */
export function useAudioRecording({
  onSendAudio,
}: UseAudioRecordingOptions): AudioRecordingState {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await onSendAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  }, [onSendAudio]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    duration,
    start,
    stop,
  };
}
