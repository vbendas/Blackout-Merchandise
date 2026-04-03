'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AudioWaveform, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AvatarContainer } from '@/components/AvatarContainer';
import { LiveWaveform } from '@/components/ui/live-waveform';
import { Orb } from '@/components/ui/orb';
import type { AgentName } from '@/types/expressions';

type AudioState = 'idle' | 'listening' | 'processing' | 'speaking';

interface FloatingVoicePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgent: AgentName;
}

const AGENT_COLORS: Record<AgentName, [string, string]> = {
  Leopoldo: ['#CADCFC', '#A0B9D1'],
  Francisca: ['#E5E7EB', '#D1D5DB'],
  Antônia: ['#9CA3AF', '#6B7280'],
};

export function FloatingVoicePanel({ isOpen, onClose, currentAgent }: FloatingVoicePanelProps) {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [pulseValue, setPulseValue] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const agentColors = AGENT_COLORS[currentAgent];

  const getAgentState = (): 'thinking' | 'listening' | 'talking' | null => {
    if (audioState === 'listening') return 'listening';
    if (audioState === 'speaking') return 'talking';
    if (audioState === 'processing') return 'thinking';
    return null;
  };

  const getExpression = (): 'speaking_a' | 'speaking_b' | 'neutral' | 'mouth_closed' | 'mouth_wide_open' => {
    if (audioState === 'speaking') {
      return Math.random() > 0.5 ? 'speaking_a' : 'speaking_b';
    }
    if (audioState === 'listening') {
      return 'mouth_wide_open';
    }
    return 'neutral';
  };

  useEffect(() => {
    if (audioState === 'idle') {
      setPulseValue(0);
      return;
    }

    const interval = setInterval(() => {
      setPulseValue(Math.random() * 0.5 + 0.3);
    }, 150);

    return () => clearInterval(interval);
  }, [audioState]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsRecording(true);
      setAudioState('listening');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setAudioState('listening');
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    setAudioState('processing');

    setTimeout(() => {
      setAudioState('speaking');
      setTimeout(() => {
        setAudioState('idle');
      }, 3000);
    }, 1500);
  };

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

  const showWaveform = audioState === 'speaking';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-[160] flex flex-col items-center"
      >
        {/* Waveform - only visible when agent speaks */}
        <AnimatePresence>
          {showWaveform && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="mb-3"
            >
              <div className="bg-zinc-900/80 backdrop-blur-lg rounded-full px-3 py-2 shadow-lg">
                <LiveWaveform
                  active={true}
                  processing={false}
                  height={32}
                  barWidth={2}
                  barGap={1}
                  barRadius={1}
                  mode="static"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar Container */}
        <div className="relative">
          {/* Close Button - positioned top-right of avatar */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-zinc-800/90 backdrop-blur flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shadow-lg border border-zinc-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Mic Button - positioned bottom-right of avatar */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleMicToggle}
            className={`absolute -bottom-2 -right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg border-2 ${
              isRecording ? 'bg-red-500 border-red-400 hover:bg-red-600' : 'bg-white border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {isRecording ? (
              <Square className="w-4 h-4 text-white" />
            ) : (
              <AudioWaveform className="w-4 h-4 text-zinc-900" />
            )}
          </motion.button>

          {/* Avatar with Orb */}
          <motion.div
            animate={
              audioState === 'speaking' ? { y: [0, -3, 0] } : audioState === 'listening' ? { scale: [1, 1.02, 1] } : {}
            }
            transition={{
              duration: audioState === 'speaking' ? 0.5 : 0.3,
              repeat: audioState !== 'idle' ? Infinity : 0,
              ease: 'easeInOut',
            }}
            className="relative w-28 h-28"
          >
            <div className="absolute inset-0 rounded-full overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.3),0_4px_20px_rgba(0,0,0,0.4)] pointer-events-none">
              <Orb
                colors={agentColors}
                seed={currentAgent === 'Leopoldo' ? 1000 : currentAgent === 'Francisca' ? 2000 : 3000}
                agentState={getAgentState()}
                volumeMode="manual"
                manualInput={isRecording ? pulseValue : 0}
                manualOutput={audioState === 'speaking' ? pulseValue : 0}
              />
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-10">
              <AvatarContainer mode="hero" agentName={currentAgent} expression={getExpression()} />
            </div>
          </motion.div>
        </div>

        {/* State indicator - very subtle below avatar */}
        <div className="mt-2 flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              audioState === 'listening'
                ? 'bg-blue-500 animate-pulse'
                : audioState === 'speaking'
                  ? 'bg-pink-500 animate-pulse'
                  : audioState === 'processing'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-zinc-600'
            }`}
          />
          <span className="text-[10px] text-zinc-500 font-medium">
            {audioState === 'listening' && 'Listening...'}
            {audioState === 'speaking' && 'Speaking'}
            {audioState === 'processing' && 'Processing...'}
            {audioState === 'idle' && 'Tap to speak'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
