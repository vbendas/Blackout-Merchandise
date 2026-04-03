'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AudioWaveform, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AvatarContainer } from '@/components/AvatarContainer';
import { LiveWaveform } from '@/components/ui/live-waveform';
import { Orb } from '@/components/ui/orb';
import { Portal } from '@/components/ui/portal';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import type { AgentName } from '@/types/expressions';

type AudioState = 'idle' | 'listening' | 'processing' | 'speaking';

interface AudioConversationLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgent: AgentName;
  onTranscription?: (text: string) => void;
}

const AGENT_COLORS: Record<AgentName, [string, string]> = {
  Leopoldo: ['#CADCFC', '#A0B9D1'],
  Francisca: ['#E5E7EB', '#D1D5DB'],
  Antônia: ['#9CA3AF', '#6B7280'],
};

const AGENT_LABELS: Record<AgentName, string> = {
  Leopoldo: 'Leopoldo',
  Francisca: 'Francisca',
  Antônia: 'Antônia',
};

const STATE_CONFIG: Record<AudioState, { text: string; color: string; shimmerColor: string }> = {
  idle: { text: 'Tap the microphone to start', color: '#a1a1aa', shimmerColor: '#71717a' },
  listening: { text: 'Listening...', color: '#60a5fa', shimmerColor: '#3b82f6' },
  processing: { text: 'Processing...', color: '#fbbf24', shimmerColor: '#f59e0b' },
  speaking: { text: 'Speaking', color: '#f472b6', shimmerColor: '#ec4899' },
};

export function AudioConversationLightbox({
  isOpen,
  onClose,
  currentAgent,
  onTranscription,
}: AudioConversationLightboxProps) {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [pulseValue, setPulseValue] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');

  const {
    isRecording,
    audioDuration,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    getBase64Audio,
  } = useAudioRecording();

  const agentColors = AGENT_COLORS[currentAgent];
  const agentLabel = AGENT_LABELS[currentAgent];
  const stateConfig = STATE_CONFIG[audioState];

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

  // Pulsing animation effect for Orb
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
    setAudioState('listening');
    setTranscript('');
    setAiResponseText('');
    await startAudioRecording();
  };

  const stopRecording = () => {
    stopAudioRecording();
    setAudioState('processing');
  };

  const processAudio = async () => {
    try {
      const base64Audio = await getBase64Audio();

      const response = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio, agent: currentAgent }),
      });

      const data = await response.json();

      if (data.userText) {
        setTranscript(data.userText);
        onTranscription?.(data.userText);
      }

      if (data.aiText) {
        setAiResponseText(data.aiText);
        setAudioState('speaking');

        if (data.aiAudio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.aiAudio}`);
          audio.onended = () => setAudioState('idle');
          audio.play();
        } else {
          setTimeout(() => setAudioState('idle'), 3000);
        }
      } else {
        setAudioState('idle');
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      setAudioState('idle');
    }
  };

  useEffect(() => {
    if (!isRecording && audioDuration > 0 && audioState === 'processing') {
      processAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, audioDuration, audioState]);

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-zinc-400" />
                  <h2 className="text-lg font-semibold text-white">{agentLabel}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Content - Orb + Avatar */}
              <div className="flex flex-col items-center justify-center py-8 px-4">
                {/* Orb with Agent */}
                <div className="relative w-48 h-48">
                  <div className="absolute inset-0 rounded-full overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.3)] pointer-events-none">
                    <Orb
                      colors={agentColors}
                      seed={currentAgent === 'Leopoldo' ? 1000 : currentAgent === 'Francisca' ? 2000 : 3000}
                      agentState={getAgentState()}
                      volumeMode="manual"
                      manualInput={isRecording ? pulseValue : 0}
                      manualOutput={audioState === 'speaking' ? pulseValue : 0}
                    />
                  </div>

                  {/* Avatar overlay on top of orb */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <motion.div
                      animate={
                        audioState === 'speaking'
                          ? { y: [0, -4, 0] }
                          : audioState === 'listening'
                            ? { scale: [1, 1.02, 1] }
                            : {}
                      }
                      transition={{
                        duration: audioState === 'speaking' ? 0.5 : 0.3,
                        repeat: audioState !== 'idle' ? Infinity : 0,
                        ease: 'easeInOut',
                      }}
                    >
                      <AvatarContainer mode="hero" agentName={currentAgent} expression={getExpression()} />
                    </motion.div>
                  </div>
                </div>

                {/* State Label with ShimmeringText */}
                <div className="mt-4 h-6 flex items-center justify-center">
                  {audioState === 'speaking' ? (
                    <ShimmeringText
                      text={`${agentLabel} is speaking`}
                      color={stateConfig.color}
                      shimmerColor={stateConfig.shimmerColor}
                      duration={1.5}
                      repeat={true}
                      repeatDelay={0.3}
                    />
                  ) : (
                    <ShimmeringText
                      text={stateConfig.text}
                      color={stateConfig.color}
                      shimmerColor={stateConfig.shimmerColor}
                      duration={2}
                      repeat={audioState === 'idle'}
                      repeatDelay={1}
                    />
                  )}
                </div>

                {/* Live Waveform */}
                <div className="w-full max-w-xs mt-4">
                  <LiveWaveform
                    active={isRecording || audioState === 'speaking'}
                    processing={audioState === 'processing'}
                    height={60}
                    barWidth={3}
                    barGap={2}
                    barRadius={1.5}
                    mode="static"
                  />
                </div>

                {/* Transcript bubbles */}
                {(transcript || aiResponseText) && (
                  <div className="w-full max-w-sm mt-4 space-y-2 px-2">
                    {transcript && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-800/50 rounded-2xl rounded-tr-md p-3 ml-auto max-w-[80%] text-right"
                      >
                        <p className="text-zinc-300 text-sm">{transcript}</p>
                      </motion.div>
                    )}
                    {aiResponseText && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-800/30 rounded-2xl rounded-tl-md p-3 max-w-[80%]"
                      >
                        <p className="text-zinc-200 text-sm">{aiResponseText}</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 p-6 border-t border-white/10">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMicToggle}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-white hover:bg-zinc-200'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-7 h-7 text-white" />
                  ) : (
                    <AudioWaveform className="w-7 h-7 text-zinc-900" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
