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

function TypingIndicator({ color }: { color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-end gap-2"
    >
      <div className="h-8 w-8 overflow-hidden rounded-full border-2" style={{ borderColor: color }}>
        <img
          src={`https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_100/merch-from/avatars/antonia/1_-_neutral_attr1_subject`}
          alt="Antônia"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-zinc-800/90 px-4 py-3 backdrop-blur-xl">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
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
    isVoiceMode,
    isRecording,
    isPlaying: _isMessagePlaying,
    isTyping,
    suggestions,
    quickActions,
    toggleChat,
    setIsVoiceMode,
    sendMessage,
    sendAudio,

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
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const _chatWindowRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
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
    setInputValue(action);
    handleSend();
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

  const handlePlayPause = () => {
    setLocalIsPlaying(!localIsPlaying);
  };

  return (
    <>
      {/* Floating Avatar Button - Bottom Right (hidden on studio) */}
      {!isStudio && (
      <motion.button
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
        className={`fixed z-60 overflow-visible cursor-pointer rounded-full bg-zinc-900 ${
          isMobile 
            ? 'right-[-14px] bottom-[-36px] w-[140px] h-[180px]' 
            : isTablet 
              ? 'right-[-18px] bottom-[-45px] w-[160px] h-[200px]'
              : 'right-[-25px] bottom-[-50px] w-[168px] h-[224px]'
        }`}
        style={{
          filter: 'drop-shadow(0 0 15px rgba(161, 161, 170, 0.25))',
        }}
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
                      height: '680px',
                      maxHeight: 'calc(100vh - 140px)',
                    }
                : {
                    width: 'calc(100% - 32px)',
                    height: 'calc(100vh - 148px)',
                    borderRadius: '1.5rem',
                  }
            }
          >
            {/* Header */}
            <motion.div
              className={`flex items-center justify-center border-b border-white/10 ${
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
                        {!isUser && (
                          <div
                            className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2"
                            style={{ borderColor: agentCfg.color }}
                          >
                            <img
                              src={`https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_100/merch-from/avatars/${messageAgent}/1_-_neutral_attr1_subject`}
                              alt={agentCfg.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            isUser
                              ? 'rounded-br-sm bg-gradient-to-r from-zinc-700 to-zinc-600 text-white'
                              : 'rounded-bl-sm bg-zinc-900/80 text-zinc-100 backdrop-blur-xl'
                          }`}
                        >
                          {message.type === 'voice' ? (
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

                <AnimatePresence>{isTyping && <TypingIndicator color={agentConfig.color} />}</AnimatePresence>
              </div>
            </div>

            {/* Input */}
            <div className={`border-t border-white/10 bg-zinc-950/50 backdrop-blur-xl ${
              isMobile ? 'p-3' : isTablet ? 'p-5' : 'p-4'
            }`}>
              {isVoiceMode ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseDown={startListening}
                    onMouseUp={stopListening}
                    onMouseLeave={stopListening}
                    onTouchStart={startListening}
                    onTouchEnd={stopListening}
                    className={`flex items-center justify-center rounded-full transition-all ${
                      isRecording ? 'animate-pulse' : ''
                    } ${isMobile ? 'h-16 w-16' : isTablet ? 'h-24 w-24' : 'h-20 w-20'}`}
                    style={{
                      backgroundColor: isRecording ? '#EF4444' : agentConfig.color,
                      boxShadow: `0 0 30px ${isRecording ? '#EF4444' : agentConfig.color}50`,
                    }}
                  >
                    <motion.div
                      animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5, repeat: isRecording ? Infinity : 0 }}
                    >
                      <Icon icon="lucide:mic" className={`text-white ${isMobile ? 'h-6 w-6' : isTablet ? 'h-10 w-10' : 'h-8 w-8'}`} />
                    </motion.div>
                  </motion.button>
                  <p className={`text-zinc-400 ${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-xs'}`}>
                    {isRecording ? `Recording... ${formatDuration(recordingDuration)}` : 'Hold to speak'}
                  </p>
                </motion.div>
              ) : (
                <>
                  <AnimatePresence>
                    {inputFocused && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 flex gap-2 overflow-x-auto pb-1"
                      >
                        {suggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleQuickAction(suggestion)}
                            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                          >
                            <Icon icon="lucide:sparkles" className="h-3 w-3" />
                            {suggestion.split(' ').slice(0, 2).join(' ')}...
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <QuickActionsCarousel actions={quickActions} onAction={handleQuickAction} />

                  <div className="flex items-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsVoiceMode(!isVoiceMode)}
                      className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
                        isVoiceMode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
                      title={isVoiceMode ? 'Text mode' : 'Voice mode'}
                    >
                      <Icon icon={isVoiceMode ? 'lucide:message-square' : 'lucide:mic'} className={isMobile ? 'h-4 w-4' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
                    </motion.button>
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
                        !inputValue.trim() || isTyping ? 'cursor-not-allowed bg-zinc-800 text-zinc-600' : 'text-white'
                      } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
                      style={inputValue.trim() && !isTyping ? { backgroundColor: agentConfig.color } : {}}
                      aria-label="Send message"
                    >
                      <Icon icon="lucide:send" className={isMobile ? 'h-4 w-4' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
                    </motion.button>
                  </div>
                  <div className={`flex items-center justify-between text-zinc-500 ${
                    isMobile ? 'mt-2 text-[10px]' : isTablet ? 'mt-3 text-xs' : 'mt-2 text-[10px]'
                  }`}>
                    <span>Enter to send</span>
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:shield-check" className="h-3 w-3" />
                      Secure
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
