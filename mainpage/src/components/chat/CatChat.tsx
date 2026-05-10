'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from './CatChatProvider';
import { AGENT_CONFIGS } from '@/types/chat';
import { useViewportSize } from '@/hooks/useViewportSize';
import { useAvatarExpression } from '@/context/AvatarExpressionContext';
import { getAvatarUrl } from '@/lib/expressions/cloudinary';
import { useAgentGreeting } from '@/hooks/useAgentGreeting';
import { QuickActionsCarousel } from './QuickActionsCarousel';

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface AudioMessageProps {
  audioUrl?: string;
  audioBlob?: Blob;
  duration?: number;
  isPlaying: boolean;
  onPlayPause: () => void;
}

function AudioMessageComponent({ audioUrl, audioBlob, duration = 0, isPlaying, onPlayPause }: AudioMessageProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setCurrentTime(0);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      setAudioElement(audio);
    } else if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => setCurrentTime(0);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      setAudioElement(audio);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioUrl, audioBlob]);

  const handlePlayPause = () => {
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      onPlayPause();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePlayPause}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600"
      >
        <Icon icon={isPlaying ? 'lucide:pause' : 'lucide:play'} className="h-4 w-4 text-white" />
      </button>
      <div className="flex-1">
        <div className="h-6 w-full overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            className="h-full bg-zinc-500"
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-400">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2"
    >
      <span className="text-xs text-zinc-500 italic">
        {agentName} is typing
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ...
        </motion.span>
      </span>
    </motion.div>
  );
}

export function CatChat() {
  const { isMobile, isTablet, isDesktop, hasMounted } = useViewportSize();
  const { currentExpression } = useAvatarExpression();
  const {
    isOpen,
    currentAgent,
    messages,
    isRecording,
    isPlaying: _isMessagePlaying,
    isTyping,
    suggestions,
    quickActions,
    toggleChat,
    sendMessage,
    sendAudio,
    setMessages,
    requestHumanHandoff,
    cancelHandoff,
    setContactEmail,
    handoffStatus,
    handoffTicketId,
    assignedStaffName,
    contactEmail,
  } = useChat();
  const { currentGreeting } = useAgentGreeting(currentAgent);

  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);
  const avatarImgRef = useRef<HTMLImageElement>(null);

  // Inline mic hold-to-speak state
  const [isInlineRecording, setIsInlineRecording] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const holdThresholdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const micTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStopRef = useRef(false);
   
  // Voice conversation state
  const [isVoiceConversationActive, setIsVoiceConversationActive] = useState(false);
  const [voiceConversationStatus, setVoiceConversationStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const isVoiceConversationActiveRef = useRef(false);

  // Keep ref in sync with state for async callbacks
  useEffect(() => {
    isVoiceConversationActiveRef.current = isVoiceConversationActive;
  }, [isVoiceConversationActive]);
  
  // VAD refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const isRecordingVoiceRef = useRef(false);
  const isProcessingVoiceRef = useRef(false);

  // Refs to break circular dependencies in voice conversation callbacks
  const startVoiceRecordingRef = useRef<(() => void) | null>(null);
  const stopVoiceRecordingRef = useRef<(() => void) | null>(null);
  const startVoiceListeningRef = useRef<(() => void) | null>(null);
   
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Bubble visibility states
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [hasShownInitially, setHasShownInitially] = useState(false);
  const [hasTappedBubble, setHasTappedBubble] = useState(false);
  const isHoveredRef = useRef(false);
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const agentConfig = AGENT_CONFIGS[currentAgent];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Bubble auto-show/hide timer
  useEffect(() => {
    if (!hasMounted || isOpen) return;
    
    // Initial delay: 1.5s then show
    showTimerRef.current = setTimeout(() => {
      setIsBubbleVisible(true);
      
      // Auto-hide after 5s
      hideTimerRef.current = setTimeout(() => {
        setIsBubbleVisible(false);
        setHasShownInitially(true);
      }, 5000);
    }, 1500);

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [hasMounted, isOpen, hasShownInitially]);

  // Hide bubble when chat opens
  useEffect(() => {
    if (isOpen) {
      setIsBubbleVisible(false);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [isOpen]);

  // Handle cached avatar images
  useEffect(() => {
    if (avatarImgRef.current?.complete) {
      setAvatarLoaded(true);
    }
  }, [currentExpression, agentConfig.name]);

  // Close chat when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target as Node) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(event.target as Node)
      ) {
        toggleChat();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, toggleChat]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;
    await sendMessage(inputValue.trim());
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [inputValue, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 100)}px`;
    }
  };

  const handleQuickAction = (action: string) => {
    if (!action.trim() || isTyping) return;

    if (action === '__HANDOFF__') {
      requestHumanHandoff();
      return;
    }

    sendMessage(action.trim());
    setInputValue('');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || isSubmittingHandoff) return;
    setIsSubmittingHandoff(true);
    try {
      await requestHumanHandoff(emailInput.trim());
    } finally {
      setIsSubmittingHandoff(false);
    }
  };

  const startListening = async () => {
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
        await sendAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // ── Inline Mic Hold-to-Speak (STT → Text Input → Auto Send) ─────────

  const inlineMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inlineAudioChunksRef = useRef<Blob[]>([]);

  const startInlineRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      inlineMediaRecorderRef.current = mediaRecorder;
      inlineAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          inlineAudioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(inlineAudioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Skip very short recordings (less than 1KB = ~100ms of audio)
        if (audioBlob.size < 1024) {
          console.warn('[Inline Mic] Recording too short, skipping transcription');
          return;
        }

        // Send to transcribe API
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');

          const response = await fetch('/api/chat/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[Inline Mic] Transcription API error:', response.status, errorData.error);
            return;
          }

          const data = await response.json();
          
          if (data.transcription) {
            // Send transcription directly as text message
            await sendMessage(data.transcription.trim());
          } else {
            console.warn('[Inline Mic] No transcription received');
          }
        } catch (error) {
          console.error('[Inline Mic] Transcription error:', error);
        }
      };

      mediaRecorder.start();
      
      // Check if stop was requested while we were waiting for mic access
      if (pendingStopRef.current) {
        pendingStopRef.current = false;
        mediaRecorder.stop();
      }
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  }, [sendMessage]);

  const stopInlineRecording = useCallback(() => {
    if (inlineMediaRecorderRef.current && inlineMediaRecorderRef.current.state === 'recording') {
      inlineMediaRecorderRef.current.stop();
    } else {
      // Recorder not ready yet — flag it to stop immediately when ready
      pendingStopRef.current = true;
    }
  }, []);

  const handleMicMouseDown = useCallback(async () => {
    isHoldingRef.current = true;
    holdThresholdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        setIsInlineRecording(true);
        startInlineRecording();
      }
    }, 300);
  }, [startInlineRecording]);

  const handleMicMouseUp = useCallback(() => {
    const wasHolding = isHoldingRef.current;
    isHoldingRef.current = false;

    if (holdThresholdTimerRef.current) {
      clearTimeout(holdThresholdTimerRef.current);
      holdThresholdTimerRef.current = null;
    }

    if (isInlineRecording) {
      setIsInlineRecording(false);
      stopInlineRecording();
    } else if (wasHolding) {
      setShowMicTooltip(true);
      micTooltipTimerRef.current = setTimeout(() => {
        setShowMicTooltip(false);
      }, 3000);
    }
  }, [isInlineRecording, stopInlineRecording]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdThresholdTimerRef.current) clearTimeout(holdThresholdTimerRef.current);
      if (micTooltipTimerRef.current) clearTimeout(micTooltipTimerRef.current);
    };
  }, []);

  const handlePlayPause = () => {
    setLocalIsPlaying(!localIsPlaying);
  };

  // ── Voice Conversation ──────────────────────────────────────────────

  const cleanupVoiceConversation = useCallback(() => {
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
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state === 'recording') {
      voiceMediaRecorderRef.current.stop();
    }
    isRecordingVoiceRef.current = false;
    isProcessingVoiceRef.current = false;
    setAudioLevel(0);
    setVoiceConversationStatus('idle');
  }, []);

  const playAudioResponse = useCallback((audioData: string) => {
    return new Promise<void>((resolve) => {
      const audio = new Audio(audioData);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }, []);

  // ── Voice Conversation Callbacks (circular deps broken via refs) ────

  const processVoiceTurn = useCallback(async (audioBlob: Blob) => {
    if (isProcessingVoiceRef.current) return;
    isProcessingVoiceRef.current = true;
    setVoiceConversationStatus('thinking');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('agent', currentAgent);
      formData.append(
        'history',
        JSON.stringify(
          messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
        )
      );

      const response = await fetch('/api/chat/voice/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Voice Conversation] API error:', response.status, errorData.error);
        return;
      }

      const data = await response.json();

      if (data.transcription) {
        const userMessage = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: data.transcription.trim(),
          type: 'audio' as const,
          audioBlob,
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      if (data.response) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: data.response,
          type: 'audio' as const,
          audioUrl: data.audioData || undefined,
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      if (data.audioData) {
        setVoiceConversationStatus('speaking');
        await playAudioResponse(data.audioData);
      }
    } catch (err) {
      console.error('[Voice Conversation] Processing failed:', err);
    } finally {
      isProcessingVoiceRef.current = false;
      if (isVoiceConversationActiveRef.current) {
        setVoiceConversationStatus('listening');
        startVoiceListeningRef.current?.();
      } else {
        setVoiceConversationStatus('idle');
      }
    }
  }, [currentAgent, messages, playAudioResponse]);

  const startVoiceRecording = useCallback(() => {
    if (!microphoneStreamRef.current || isRecordingVoiceRef.current) return;

    const recorder = new MediaRecorder(microphoneStreamRef.current);
    voiceMediaRecorderRef.current = recorder;
    voiceAudioChunksRef.current = [];
    isRecordingVoiceRef.current = true;
    setVoiceConversationStatus('listening');

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) voiceAudioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      isRecordingVoiceRef.current = false;
      const blob = new Blob(voiceAudioChunksRef.current, { type: 'audio/webm' });
      if (blob.size > 1000) {
        processVoiceTurn(blob);
      } else {
        if (isVoiceConversationActiveRef.current) {
          setVoiceConversationStatus('listening');
          startVoiceListeningRef.current?.();
        }
      }
    };

    recorder.start();
  }, [processVoiceTurn]);

  const stopVoiceRecording = useCallback(() => {
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state === 'recording') {
      voiceMediaRecorderRef.current.stop();
    }
  }, []);

  const startVoiceListening = useCallback(() => {
    if (!analyserRef.current || !isVoiceConversationActiveRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const threshold = 15;
    const silenceDelay = 1200;

    const detect = () => {
      if (!isVoiceConversationActiveRef.current) return;

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      setAudioLevel(avg);

      if (avg > threshold) {
        if (!isRecordingVoiceRef.current) {
          startVoiceRecordingRef.current?.();
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (isRecordingVoiceRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopVoiceRecordingRef.current?.();
          silenceTimerRef.current = null;
        }, silenceDelay);
      }

      vadFrameRef.current = requestAnimationFrame(detect);
    };

    vadFrameRef.current = requestAnimationFrame(detect);
  }, []);

  // Keep callback refs in sync to break circular dependencies
  useEffect(() => {
    startVoiceRecordingRef.current = startVoiceRecording;
    stopVoiceRecordingRef.current = stopVoiceRecording;
    startVoiceListeningRef.current = startVoiceListening;
  });

  const startVoiceConversation = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsVoiceConversationActive(true);
      setVoiceConversationStatus('listening');
      startVoiceListening();
    } catch (error) {
      console.error('[Voice Conversation] Microphone access denied:', error);
      setIsVoiceConversationActive(false);
    }
  }, [startVoiceListening]);

  const stopVoiceConversation = useCallback(() => {
    setIsVoiceConversationActive(false);
    cleanupVoiceConversation();
  }, [cleanupVoiceConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupVoiceConversation();
  }, [cleanupVoiceConversation]);

  return (
    <>
      {/* Floating Avatar Button - Bottom Right */}
      <motion.button
        ref={avatarButtonRef}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.3 }}
        whileHover={!isOpen ? { scale: 1.02 } : {}}
        whileTap={!isOpen ? { scale: 0.98 } : {}}
        onClick={(e) => {
          if (isMobile && !isOpen && !hasTappedBubble) {
            e.preventDefault();
            e.stopPropagation();
            setHasTappedBubble(true);
            setIsBubbleVisible(true);
            // Auto-hide after 3s on mobile
            hideTimerRef.current = setTimeout(() => {
              setIsBubbleVisible(false);
            }, 3000);
          } else {
            toggleChat();
          }
        }}
        onMouseEnter={() => {
          if (!isMobile && hasShownInitially && !isOpen) {
            isHoveredRef.current = true;
            if (hoverHideTimerRef.current) {
              clearTimeout(hoverHideTimerRef.current);
            }
            setIsBubbleVisible(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            isHoveredRef.current = false;
            hoverHideTimerRef.current = setTimeout(() => {
              if (!isHoveredRef.current) {
                setIsBubbleVisible(false);
              }
            }, 500);
          }
        }}
        className={`fixed z-60 overflow-visible cursor-pointer rounded-full bg-transparent shadow-none ${
          isMobile 
            ? 'right-[-14px] bottom-[-36px] w-[140px] h-[180px]' 
            : isTablet 
              ? 'right-[-18px] bottom-[-45px] w-[160px] h-[200px]'
              : 'right-[-25px] bottom-[-50px] w-[168px] h-[224px]'
        }`}
        aria-label="Open chat"
      >
        {/* Speech Bubble */}
        <motion.div
          className={`absolute -top-10 z-10 ${isMobile ? 'right-[50px]' : 'right-[40px]'}`}
          animate={!isOpen ? { 
            y: [0, -5, 0],
            scale: [1, 1.02, 1]
          } : { opacity: 0, y: -10 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ 
              opacity: isBubbleVisible ? 1 : 0, 
              y: isBubbleVisible ? 0 : 10,
              scale: isBubbleVisible ? 1 : 0.95
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-xl px-3 py-1.5 shadow-lg max-w-[320px] min-h-[24px]"
          >
            <span className={`font-medium text-zinc-800 block ${isMobile ? 'text-[12px]' : 'text-[10px]'}`}>
              {currentGreeting}
            </span>
            {/* Triangle pointer - inside animated container */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 
              border-l-[6px] border-l-transparent 
              border-r-[6px] border-r-transparent 
              border-t-[6px] border-t-white" />
          </motion.div>
        </motion.div>

        {/* Avatar */}
        <div className="overflow-hidden w-full h-full rounded-full bg-transparent ring-1 ring-zinc-950">
          <img
            key={currentExpression}
            ref={avatarImgRef}
            src={getAvatarUrl(agentConfig.name, isOpen ? 'thinking' : currentExpression, 400)}
            alt={agentConfig.name}
            className={`w-full h-full object-cover object-top transition-opacity duration-300 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setAvatarLoaded(true)}
            loading="eager"
          />
        </div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && hasMounted && (
          <motion.div
            ref={chatWindowRef}
            initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`z-[100] flex flex-col overflow-hidden border border-white/10 bg-zinc-950/95 backdrop-blur-2xl ${
              (isMobile || isTablet)
                ? 'fixed inset-x-4 top-4 w-[calc(100%-32px)] h-[calc(100vh-148px)] rounded-3xl'
                : 'fixed bottom-[165px] right-6 rounded-3xl'
            }`}
            style={
              isDesktop
                ? {
                    width: '420px',
                    maxWidth: 'calc(100vw - 48px)',
                    height: 'auto',
                    minHeight: '400px',
                    maxHeight: 'calc(100vh - 165px)',
                  }
                : {
                    width: 'calc(100% - 32px)',
                    height: 'auto',
                    maxHeight: 'calc(100dvh - 173px)',
                    borderRadius: '1.5rem',
                  }
            }
          >
            {/* Header */}
            <motion.div
              className={`relative flex items-center justify-center border-b border-white/10 ${
                isMobile ? 'px-4 py-3' : isTablet ? 'px-6 py-5' : 'px-5 py-4'
              }`}
              style={{
                background: 'linear-gradient(135deg, rgba(161, 161, 170, 0.12) 0%, rgba(161, 161, 170, 0.04) 100%)',
              }}
            >
              {/* Voice Conversation Toggle - Left side */}
              <div className="absolute left-4 flex items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (isVoiceConversationActive) {
                      stopVoiceConversation();
                    } else {
                      startVoiceConversation();
                    }
                  }}
                  className={`flex items-center justify-center rounded-full transition-all ${
                    isVoiceConversationActive
                      ? 'text-red-400 animate-pulse'
                      : 'text-zinc-400 hover:text-white'
                  } ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}
                  title={isVoiceConversationActive ? 'End voice conversation' : 'Start voice conversation'}
                >
                  {isVoiceConversationActive ? (
                    <div className="flex items-center gap-[3px] h-5">
                      {[0.6, 1, 0.7, 0.4, 0.8].map((scale, i) => (
                        <motion.div
                          key={i}
                          className="w-[3px] rounded-full bg-red-400"
                          animate={{
                            height: [12 * scale, 20 * scale, 8 * scale, 18 * scale, 12 * scale],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.12,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                      <path
                        d="M12 3v18M8 8v8M4 10v4M16 6v12M20 9v6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="opacity-70"
                      />
                    </svg>
                  )}
                </motion.button>
              </div>

              <div className="text-center">
                <h3 className={`font-semibold text-white ${isMobile ? 'text-base' : isTablet ? 'text-lg' : 'text-base'}`}>{agentConfig.name}</h3>
              </div>

              <div className="absolute right-4 flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleChat}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  aria-label="Close chat"
                >
                  <Icon icon="lucide:x" className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>

            {/* Handoff Status Banner */}
            {handoffStatus !== 'none' && handoffStatus !== 'awaiting_email' && (
              <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-900/90 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      handoffStatus === 'queued'
                        ? 'animate-pulse bg-yellow-500'
                        : handoffStatus === 'assigned'
                          ? 'bg-blue-500'
                          : handoffStatus === 'human_joined'
                            ? 'bg-green-500'
                            : 'bg-zinc-500'
                    }`} />
                    <span className="text-sm text-zinc-200">
                      {handoffStatus === 'queued' &&
                        `You're in queue. ${assignedStaffName || 'A team member'} will join soon.`}
                      {handoffStatus === 'assigned' &&
                        `${assignedStaffName || 'Someone'} has been assigned. They'll join shortly.`}
                      {handoffStatus === 'human_joined' &&
                        `👤 ${assignedStaffName || 'A team member'} has joined the conversation.`}
                      {handoffStatus === 'resolved' && 'This conversation has been resolved.'}
                    </span>
                  </div>
                  {handoffStatus !== 'resolved' && (
                    <button
                      onClick={cancelHandoff}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Leave queue
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => {
                    const isUser = message.role === 'user';
                    const messageAgent = message.agent || currentAgent;
                    const agentCfg = AGENT_CONFIGS[messageAgent];
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        layout
                        className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            isUser
                              ? 'rounded-br-sm bg-gradient-to-r from-zinc-700 to-zinc-600 text-white'
                              : 'rounded-bl-sm bg-zinc-900/80 text-zinc-100 backdrop-blur-xl'
                          }`}
                        >
                          {message.type === 'audio' ? (
                            <AudioMessageComponent
                              audioUrl={message.audioUrl}
                              audioBlob={message.audioBlob}
                              duration={message.duration}
                              isPlaying={localIsPlaying}
                              onPlayPause={handlePlayPause}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          )}
                          <span className="mt-1 block text-right text-[10px] text-zinc-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

             <AnimatePresence>{isTyping && <TypingIndicator agentName={agentConfig.name} />}</AnimatePresence>
           </div>
         </div>

         {/* Input */}
         <div className={`border-t border-white/10 bg-zinc-950/50 backdrop-blur-xl ${
           isMobile ? 'p-3' : isTablet ? 'p-5' : 'p-4'
         }`}>
           {/* Voice Conversation Overlay */}
           <AnimatePresence>
             {isVoiceConversationActive && (
               <motion.div
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="mb-3 flex flex-col items-center gap-2"
               >
                 <div className="flex items-center gap-3">
                   {/* Audio Wave Visualizer */}
                   <div className="flex items-center gap-0.5 h-8">
                     {[...Array(12)].map((_, i) => (
                       <motion.div
                         key={i}
                         className="w-1 rounded-full bg-white/80"
                         animate={{
                           height: voiceConversationStatus === 'listening'
                             ? [4, Math.max(4, audioLevel * 0.8 + Math.random() * 20), 4]
                             : voiceConversationStatus === 'speaking'
                               ? [4, 20 + Math.random() * 12, 4]
                               : [4, 8, 4],
                         }}
                         transition={{
                           duration: 0.3 + Math.random() * 0.2,
                           repeat: Infinity,
                           repeatType: 'reverse',
                           delay: i * 0.03,
                         }}
                       />
                     ))}
                   </div>
                   <span className="text-xs text-zinc-400 capitalize">
                     {voiceConversationStatus === 'idle' && 'Ready'}
                     {voiceConversationStatus === 'listening' && 'Listening...'}
                     {voiceConversationStatus === 'thinking' && 'Thinking...'}
                     {voiceConversationStatus === 'speaking' && `${agentConfig.name} is speaking...`}
                   </span>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {!isVoiceConversationActive && (
             <QuickActionsCarousel actions={quickActions} onAction={handleQuickAction} />
           )}

           <div className="flex items-end gap-2">
             {/* Mic Button with Hold-to-Speak */}
             <div className="relative">
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onMouseDown={handleMicMouseDown}
                 onMouseUp={handleMicMouseUp}
                 onMouseLeave={handleMicMouseUp}
                 onTouchStart={(e) => {
                   e.preventDefault();
                   handleMicMouseDown();
                 }}
                 onTouchEnd={(e) => {
                   e.preventDefault();
                   handleMicMouseUp();
                 }}
                 className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
                   isInlineRecording
                     ? 'bg-rose-600 text-white animate-pulse'
                     : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                 } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
                 aria-label="Hold to speak"
               >
                 <Icon 
                   icon="lucide:mic" 
                   className={`${isMobile ? 'h-4 w-4' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} ${isInlineRecording ? 'text-white' : ''}`} 
                 />
               </motion.button>

               {/* Hold to Speak Tooltip */}
               <AnimatePresence>
                 {showMicTooltip && (
                   <motion.div
                     initial={{ opacity: 0, y: 5 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 5 }}
                     transition={{ duration: 0.2 }}
                     className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-50"
                   >
                     Hold to speak
                     <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 rotate-45" />
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             <div className="relative flex-1">
               <textarea
                 ref={inputRef}
                 value={inputValue}
                 onChange={handleInputChange}
                 onKeyDown={handleKeyDown}
                 onFocus={() => setInputFocused(true)}
                 onBlur={() => setInputFocused(false)}
                 placeholder="Type a message..."
                 disabled={isTyping}
                 rows={1}
                 className={`w-full resize-none rounded-2xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50 ${
                   isMobile ? 'px-3 py-3 text-sm' : isTablet ? 'px-5 py-4 text-base' : 'px-4 py-3 text-sm'
                 }`}
                 style={{ minHeight: isMobile ? '44px' : isTablet ? '56px' : '48px', maxHeight: '100px' }}
               />
               <AnimatePresence>
                 {inputValue.length > 0 && (
                   <motion.span
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className={`absolute right-3 text-zinc-500 ${
                       isMobile ? 'bottom-3 text-[10px]' : isTablet ? 'bottom-4 text-xs' : 'bottom-3 text-[10px]'
                     }`}
                   >
                     {inputValue.length}
                   </motion.span>
                 )}
               </AnimatePresence>
             </div>
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={handleSend}
               disabled={!inputValue.trim() || isTyping}
               className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
                 !inputValue.trim() || isTyping
                   ? 'cursor-not-allowed bg-zinc-800 text-zinc-600'
                   : 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-white/10'
               } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
               aria-label="Send message"
             >
               <Icon icon="lucide:send" className={isMobile ? 'h-4 w-4' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
              </motion.button>
            </div>

            {/* Human Handoff Email Form */}
            {handoffStatus === 'awaiting_email' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border border-white/10 bg-zinc-900/80 p-4 backdrop-blur-xl"
              >
                <p className="mb-3 text-sm text-zinc-300">
                  We'll connect you with {assignedStaffName || 'a human'}.
                  What's your email so we can reach you?
                </p>
                <form onSubmit={handleEmailSubmit} className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingHandoff || !emailInput.trim()}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {isSubmittingHandoff ? 'Sending...' : 'Send'}
                  </button>
                </form>
                <button
                  onClick={cancelHandoff}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </div>
           </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
