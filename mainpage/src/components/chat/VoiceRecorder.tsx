'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudioRecording, formatDuration } from '@/hooks/useAudioRecording';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const {
    isRecording,
    audioBlob,
    audioDuration,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecording();

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing'>('idle');

  const bars = Array.from({ length: 24 }, (_, i) => {
    if (!isRecording) return 15;
    const seed = (Date.now() + i * 100) % 100;
    return 20 + (seed % 60);
  });

  const handleStart = async () => {
    setRecordingState('recording');
    await startRecording();
  };

  const handleStop = async () => {
    setRecordingState('processing');
    stopRecording();
  };

  useEffect(() => {
    if (!isRecording && audioBlob && recordingState === 'processing') {
      onRecordingComplete(audioBlob, audioDuration);
      setRecordingState('idle');
      resetRecording();
    }
  }, [isRecording, audioBlob, audioDuration, recordingState, onRecordingComplete, resetRecording]);

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    resetRecording();
    setRecordingState('idle');
    onCancel?.();
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-4">
      <div className="flex items-center justify-center gap-[3px] h-16 w-full max-w-[280px]">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            className={`w-[4px] rounded-full ${
              isRecording ? 'bg-rose-500' : 'bg-zinc-600'
            }`}
            animate={{
              height: isRecording ? [height * 0.5, height, height * 0.7] : 15,
            }}
            transition={{
              duration: 0.2,
              repeat: isRecording ? Infinity : 0,
              repeatDelay: 0.1,
            }}
            style={{ height: `${isRecording ? height : 15}px` }}
          />
        ))}
      </div>

      <div className="text-center">
        {isRecording && (
          <p className="text-rose-400 font-mono text-lg">
            {formatDuration(audioDuration)}
          </p>
        )}
        {!isRecording && recordingState === 'idle' && (
          <p className="text-zinc-400 text-sm">Tap to record</p>
        )}
        {recordingState === 'processing' && (
          <p className="text-zinc-400 text-sm">Processing...</p>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex items-center gap-4">
        {isRecording && (
          <button
            onClick={handleCancel}
            className="p-3 text-zinc-400 hover:text-white transition-colors"
            aria-label="Cancel recording"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <motion.button
          onClick={isRecording ? handleStop : handleStart}
          disabled={recordingState === 'processing'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isRecording 
              ? 'bg-rose-600 hover:bg-rose-700' 
              : 'bg-zinc-700 hover:bg-zinc-600'
          } ${recordingState === 'processing' ? 'opacity-50' : ''}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <div className="w-6 h-6 bg-white rounded-sm" />
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  );
}
