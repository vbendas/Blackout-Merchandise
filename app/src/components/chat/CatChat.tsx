'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from './CatChatProvider';
import { AGENT_CONFIGS } from '@/types/chat';
import { useViewportSize } from '@/hooks/useViewportSize';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { AgentAvatar } from './AgentAvatar';
import { useAgentGreeting } from '@/hooks/useAgentGreeting';
import type { CardMessageData } from '@/types/chat';
import { ProductCardInline } from './ProductCardInline';
import { MockupCardInline } from './MockupCardInline';
import { DesignCardInline } from './DesignCardInline';
import { QuickActionsCarousel } from './QuickActionsCarousel';
import { ChatInput } from './ChatInput';
import { TypewriterText } from './TypewriterText';


function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function CardRenderer({ cardData }: { cardData: CardMessageData }) {
  switch (cardData.cardType) {
    case 'product':
      return (
        <ProductCardInline
          productId={cardData.productId}
          name={cardData.name}
          brand={cardData.brand}
          category={cardData.category}
          imageUrl={cardData.imageUrl}
          baseCost={cardData.baseCost}
          suggestedRetail={cardData.suggestedRetail}
          colors={cardData.colors}
          specs={cardData.specs}
        />
      );
    case 'mockup':
      return (
        <MockupCardInline
          mockupId={cardData.productId}
          productName={cardData.name}
          mockupUrl={cardData.imageUrl}
          designPreviewUrl={cardData.imageUrl}
          colors={cardData.colors}
        />
      );
    case 'design':
      return (
        <DesignCardInline
          designId={cardData.productId}
          title={cardData.name}
          imageUrl={cardData.imageUrl}
          description={cardData.category}
          generatedBy="ai"
          tags={cardData.brand ? [cardData.brand] : undefined}
        />
      );
    default:
      return null;
  }
}

function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2"
    >
      <div className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
        <div className="flex gap-[2px]">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1 w-1 rounded-full bg-zinc-400"
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 backdrop-blur-xl px-3 py-2">
        <span className="text-xs text-zinc-500 italic flex items-center gap-1">
          {agentName} is typing
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ...
          </motion.span>
        </span>
      </div>
    </motion.div>
  );
}

export function CatChat() {
  const { isMobile, isTablet, isDesktop, hasMounted } = useViewportSize();
  const { currentExpression } = useAvatarExpression();
  const pathname = usePathname();
  const isStudio = pathname === '/app/studio';

  const {
    isOpen,
    currentAgent,
    messages,
    isTyping,
    quickActions,
    handoffStatus,
    handoffTicketId,
    assignedStaffName,
    assignedStaffRole,
    contactEmail,
    toggleChat,
    sendMessage,
    setMessages,
    requestHumanHandoff,
    cancelHandoff,
    setContactEmail,
  } = useChat();

  // Studio-specific: expanded by default, can collapse
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-open on studio page
  useEffect(() => {
    if (isStudio && hasMounted && !isOpen && !isCollapsed) {
      toggleChat();
    }
  }, [isStudio, hasMounted, isOpen, isCollapsed, toggleChat]);

  // Handle collapse/expand for studio
  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
    if (isOpen) {
      toggleChat();
    }
  }, [isOpen, toggleChat]);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
    if (!isOpen) {
      toggleChat();
    }
  }, [isOpen, toggleChat]);
  const { currentGreeting } = useAgentGreeting(currentAgent);

  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  // Voice conversation state
  const [voiceConversationStatus, setVoiceConversationStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [waveSubtitles, setWaveSubtitles] = useState('');

  // Human handoff email form state
  const [emailInput, setEmailInput] = useState('');
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);

  // Voice pipeline refs (wave hold-to-speak)
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const isProcessingVoiceRef = useRef(false);
  const isCancelledRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  
  // Bubble visibility states
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [hasShownInitially, setHasShownInitially] = useState(false);
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

  // Close chat when clicking outside (skip in studio mode)
  useEffect(() => {
    if (!isOpen || isStudio) return;
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
  }, [isOpen, isStudio, toggleChat]);

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

  const handleHandoffRequest = async () => {
    if (isSubmittingHandoff) return;
    setIsSubmittingHandoff(true);
    try {
      await requestHumanHandoff(emailInput || undefined);
    } finally {
      setIsSubmittingHandoff(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setContactEmail(emailInput.trim());
    handleHandoffRequest();
  };





  // ── Audio Playback Helper ───────────────────────────────────────────

  const playAudioResponse = useCallback((audioDataUrl: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio(audioDataUrl);
      audio.onended = () => {
        console.log('[Voice Conversation] Audio playback ended');
        resolve();
      };
      audio.onerror = (e) => {
        console.error('[Voice Conversation] Audio playback error:', e);
        resolve();
      };
      audio.play()
        .then(() => {
          console.log('[Voice Conversation] Audio playback started');
        })
        .catch((err) => {
          console.error('[Voice Conversation] Audio play() failed:', err?.name, err?.message);
          resolve();
        });
    });
  }, []);

  // ── Voice Conversation ──────────────────────────────────────────────

  const cleanupVoiceConversation = useCallback(() => {
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state === 'recording') {
      voiceMediaRecorderRef.current.stop();
    }
    isProcessingVoiceRef.current = false;
    isCancelledRef.current = false;
    setVoiceConversationStatus('idle');
    setWaveSubtitles('');
  }, []);

  const processVoiceTurn = useCallback(async (audioBlob: Blob) => {
    if (isProcessingVoiceRef.current) return;
    isProcessingVoiceRef.current = true;
    setVoiceConversationStatus('thinking');

    try {
      const formData = new FormData();
      const fileExt = audioBlob.type.includes('mp4') ? 'audio.mp4' : 'audio.webm';
      formData.append('audio', audioBlob, fileExt);
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
      console.log('[Voice Conversation] API response:', {
        hasTranscription: !!data.transcription,
        hasResponse: !!data.response,
        hasAudio: !!data.audioData,
        audioLength: data.audioData ? data.audioData.length : 0,
      });

      if (data.transcription) {
        const userMessage = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: data.transcription.trim(),
          type: 'text' as const,
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      if (data.response && data.audioData) {
        setVoiceConversationStatus('speaking');
        setWaveSubtitles(data.response);
        await playAudioResponse(data.audioData);

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: data.response,
          type: 'text' as const,
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (data.response) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: data.response,
          type: 'text' as const,
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('[Voice Conversation] Processing failed:', err);
    } finally {
      isProcessingVoiceRef.current = false;
      setVoiceConversationStatus('idle');
      setWaveSubtitles('');
    }
  }, [currentAgent, messages, playAudioResponse, setMessages]);

  // ── Audio Context Unlock for Autoplay ──────────────────────────────

  const unlockAudio = useCallback(() => {
    const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==');
    silent.play().catch(() => {});
  }, []);

  // ── Wave Icon Hold-to-Speak (STT → LLM → TTS) ─────────────────────

  const handleWaveHoldStart = useCallback(async () => {
    if (isProcessingVoiceRef.current) return;
    isCancelledRef.current = false;
    unlockAudio();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });

      // Check if cancelled during permission request
      if (isCancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      voiceMediaRecorderRef.current = mediaRecorder;
      voiceAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceAudioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(voiceAudioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());

        if (blob.size < 1024) {
          setVoiceConversationStatus('idle');
          return;
        }

        await processVoiceTurn(blob);
      };

      // Check if cancelled before starting
      if (isCancelledRef.current) {
        mediaRecorder.stop();
        return;
      }

      setVoiceConversationStatus('listening');
      mediaRecorder.start(100);
    } catch (error) {
      console.error('[Wave Voice] Mic access denied:', error);
      setVoiceConversationStatus('idle');
    }
  }, [processVoiceTurn, unlockAudio]);

  const handleWaveHoldEnd = useCallback(() => {
    isCancelledRef.current = true;
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state === 'recording') {
      voiceMediaRecorderRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupVoiceConversation();
  }, [cleanupVoiceConversation]);

  return (
    <>
      {/* Floating Avatar Button - Bottom Right (hidden on studio) */}
      {!isStudio && (
      <motion.button
        ref={avatarButtonRef}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.3 }}
        whileHover={!isOpen ? { scale: 1.02 } : {}}
        whileTap={!isOpen ? { scale: 0.98 } : {}}
        onClick={() => {
          toggleChat();
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
        <div className="w-full h-full rounded-full overflow-hidden ring-1 ring-zinc-950">
          <AgentAvatar
            agentName={agentConfig.name}
          expression={
            isOpen
              ? 'thinking'
              : currentExpression === 'speaking_a' || currentExpression === 'speaking_b'
                ? 'speaking'
                : currentExpression === 'happy'
                  ? 'happy'
                  : currentExpression === 'confused'
                    ? 'confused'
                    : currentExpression === 'thinking'
                      ? 'thinking'
                      : 'neutral'
          }
          size="md"
          className="w-full h-full"
          enableIdleAnimation={!isOpen}
          enableSpeakingAnimation={true}
        />
      </div>
      </motion.button>
      )}

      {/* Collapsed indicator for studio */}
      <AnimatePresence>
        {isStudio && isCollapsed && hasMounted && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={handleExpand}
            className="fixed right-4 top-1/2 z-[100] -translate-y-1/2 flex items-center gap-2 rounded-l-xl border border-white/10 border-r-0 bg-zinc-900/90 backdrop-blur-xl px-3 py-4 shadow-2xl"
          >
            <Icon icon="lucide:message-circle" className="h-5 w-5 text-zinc-300" />
            <span className="text-xs text-zinc-300 whitespace-nowrap">Chat with Francisca</span>
          </motion.button>
        )}
      </AnimatePresence>

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
                : isStudio
                  ? 'fixed right-0 top-0 bottom-0 rounded-none border-r-0 border-y-0'
                  : 'fixed bottom-[165px] right-6 rounded-3xl'
            }`}
            style={
              isDesktop
                ? isStudio
                  ? {
                      width: '380px',
                      maxWidth: 'calc(100vw - 48px)',
                      height: '100vh',
                      top: 0,
                      right: 0,
                      borderRadius: 0,
                    }
                  : {
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
              <div className="text-center">
                <h3 className={`font-semibold text-white ${isMobile ? 'text-base' : isTablet ? 'text-lg' : 'text-base'}`}>{agentConfig.name}</h3>
              </div>

              <div className="absolute right-4 flex items-center gap-2">
                {isStudio && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCollapse}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    aria-label="Collapse chat"
                    title="Collapse chat"
                  >
                    <Icon icon="lucide:panel-right-close" className="h-4 w-4" />
                  </motion.button>
                )}
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 safe-bottom">
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => {
                    const isUser = message.role === 'user';
                    const isHuman = message.role === 'human';
                    const messageAgent = message.agent || currentAgent;
                    const agentCfg = AGENT_CONFIGS[messageAgent];

                    // Detect streaming: last assistant message with content being streamed
                    const isStreaming =
                      !isUser &&
                      !isHuman &&
                      message.content.length > 0 &&
                      index === messages.length - 1 &&
                      messages[messages.length - 1].role === 'assistant';
                    
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
                        {/* Agent avatar badge for assistant messages */}
                        {!isUser && !isHuman && (
                          <div
                            className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{
                              backgroundColor: `${agentCfg?.color || '#6B7280'}20`,
                              border: `1.5px solid ${agentCfg?.color || '#6B7280'}40`,
                              color: agentCfg?.color || '#6B7280',
                            }}
                          >
                            {agentCfg?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            isUser
                              ? 'rounded-br-sm bg-gradient-to-r from-zinc-700 to-zinc-600 text-white'
                              : isHuman
                                ? 'rounded-bl-sm border border-amber-500/30 bg-amber-950/30 text-amber-100 backdrop-blur-xl'
                                : 'rounded-bl-sm bg-zinc-900/80 text-zinc-100 backdrop-blur-xl'
                          }`}
                        >
                          {isHuman && (
                            <div className="mb-1 flex items-center gap-1">
                              <Icon icon="lucide:user" className="h-3 w-3 text-amber-400" />
                              <span className="text-xs font-medium text-amber-400">
                                {message.senderName || assignedStaffName || 'Human Support'}
                                {message.senderRole && (
                                  <span className="text-amber-500/70">, {message.senderRole}</span>
                                )}
                              </span>
                            </div>
                          )}
                          {isStreaming ? (
                            <TypewriterText
                              text={message.content}
                              isStreaming={true}
                              speed={3}
                              className="text-sm leading-relaxed whitespace-pre-wrap"
                            />
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          )}
                          {message.metadata?.cardData && (
                            <div className="mt-3">
                              <CardRenderer cardData={message.metadata.cardData} />
                            </div>
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
              isMobile ? 'p-3 safe-bottom' : isTablet ? 'p-5 safe-bottom' : 'p-4'
            }`}>
              <ChatInput
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={handleSend}
                onKeyDown={handleKeyDown}
                isTyping={isTyping}
                isVoiceConversationActive={voiceConversationStatus !== 'idle'}
                voiceConversationStatus={voiceConversationStatus}
                waveSubtitles={waveSubtitles}
                quickActions={quickActions}
                onQuickAction={handleQuickAction}
                isMobile={isMobile}
                isTablet={isTablet}
                agentColor={agentConfig.color}
                onWaveHoldStart={handleWaveHoldStart}
                onWaveHoldEnd={handleWaveHoldEnd}
              />

              {/* Human Handoff UI */}
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
