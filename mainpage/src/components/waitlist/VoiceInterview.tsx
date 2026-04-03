'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [hasRecorded, setHasRecorded] = useState(false);

  const processAudio = useCallback(async () => {
    setIsTranscribing(true);
    setError(null);

    try {
      const base64Audio = await getBase64Audio();
      
      const response = await fetch('/api/waitlist/voice-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
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
      setHasRecorded(false);
    }
  }, [getBase64Audio, onTranscribed, resetRecording]);

  useEffect(() => {
    if (isRecording && audioDuration > 30000) {
      stopRecording();
    }
  }, [isRecording, audioDuration, stopRecording]);

  useEffect(() => {
    if (!isRecording && audioDuration > 0 && !hasRecorded) {
      setHasRecorded(true);
      processAudio();
    }
  }, [isRecording, audioDuration, hasRecorded, processAudio]);

  const handleStartRecording = async () => {
    setError(null);
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <Avatar
            src="https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/leopoldo/speaking_a_attr1_subject.png"
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

        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <AudioWaveform 
            isRecording={isRecording} 
            isPlaying={isProcessing}
          />
        </div>

        {isRecording && (
          <p className="text-rose-400 font-mono text-lg">
            {formatDuration(audioDuration)}
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <RecordingButton
          isRecording={isRecording}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          disabled={isProcessing || isTranscribing}
        />
      </div>

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

      {(error || recordingError) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center"
        >
          <p className="text-red-400 text-sm">{error || recordingError}</p>
        </motion.div>
      )}

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
