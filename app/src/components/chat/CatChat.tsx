'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AGENT_CONFIGS } from '@/types/chat';
import type { CardMessageData } from '@/types/chat';
import { useChat } from './CatChatProvider';
import { ClarificationMessage } from './ClarificationMessage';
import { ProductCardInline } from './ProductCardInline';
import { MockupCardInline } from './MockupCardInline';
import { DesignCardInline } from './DesignCardInline';

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
  const {
    isOpen,
    currentAgent,
    messages,
    isVoiceMode,
    isRecording,
    isTyping,
    suggestions,
    toggleChat,
    setIsVoiceMode,
    sendMessage,
    sendAudio,
    handleClarificationSelect,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const agentConfig = AGENT_CONFIGS[currentAgent];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

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
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-50 flex h-20 w-20 items-center justify-center rounded-full shadow-2xl focus:outline-none"
            style={{
              backgroundColor: '#18181b',
              boxShadow: '0 0 25px rgba(161, 161, 170, 0.25), 0 8px 30px rgba(0, 0, 0, 0.5)',
            }}
            aria-label="Open chat"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-full">
              <motion.div
                className="absolute inset-0 -z-10 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)',
                }}
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <div className="h-full w-full overflow-hidden rounded-full">
                <img
                  src={`https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_200/merch-from/avatars/${currentAgent}/1_-_neutral_attr1_subject`}
                  alt={agentConfig.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl"
            style={{
              width: '420px',
              maxWidth: 'calc(100vw - 48px)',
              height: '680px',
              maxHeight: 'calc(100vh - 100px)',
              boxShadow: '0 50px 100px -20px rgba(161, 161, 170, 0.25), 0 0 50px -20px rgba(161, 161, 170, 0.15)',
            }}
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between px-5 py-4"
              style={{
                background: 'linear-gradient(135deg, rgba(161, 161, 170, 0.12) 0%, rgba(161, 161, 170, 0.04) 100%)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    className="h-12 w-12 overflow-hidden rounded-full border-2 shadow-lg"
                    style={{ borderColor: agentConfig.color }}
                    animate={isTyping ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, repeat: isTyping ? Infinity : 0 }}
                  >
                    <img
                      src={`https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_200/merch-from/avatars/${currentAgent}/1_-_neutral_attr1_subject`}
                      alt={agentConfig.name}
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950"
                    style={{ backgroundColor: agentConfig.color }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{agentConfig.name}</h3>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="relative flex h-2 w-2">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ backgroundColor: agentConfig.color }}
                      />
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: agentConfig.color }}
                      />
                    </span>
                    Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsVoiceMode(!isVoiceMode)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    isVoiceMode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                  title={isVoiceMode ? 'Text mode' : 'Voice mode'}
                >
                  <Icon icon={isVoiceMode ? 'lucide:message-square' : 'lucide:mic'} className="h-4 w-4" />
                </motion.button>
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
                    if (message.clarificationData) {
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          layout
                        >
                          <ClarificationMessage
                            options={message.clarificationData.options}
                            onSelect={handleClarificationSelect}
                          />
                        </motion.div>
                      );
                    }

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
            <div className="border-t border-white/10 bg-zinc-950/50 p-4 backdrop-blur-xl">
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
                    className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                      isRecording ? 'animate-pulse' : ''
                    }`}
                    style={{
                      backgroundColor: isRecording ? '#EF4444' : agentConfig.color,
                      boxShadow: `0 0 30px ${isRecording ? '#EF4444' : agentConfig.color}50`,
                    }}
                  >
                    <motion.div
                      animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5, repeat: isRecording ? Infinity : 0 }}
                    >
                      <Icon icon="lucide:mic" className="h-8 w-8 text-white" />
                    </motion.div>
                  </motion.button>
                  <p className="text-xs text-zinc-400">
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

                  <div className="flex items-end gap-2">
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
                        className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder-zinc-500 transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
                        style={{ minHeight: '48px', maxHeight: '100px' }}
                      />
                      <AnimatePresence>
                        {inputValue.length > 0 && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-3 right-3 text-[10px] text-zinc-500"
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
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
                        !inputValue.trim() || isTyping ? 'cursor-not-allowed bg-zinc-800 text-zinc-600' : 'text-white'
                      }`}
                      style={inputValue.trim() && !isTyping ? { backgroundColor: agentConfig.color } : {}}
                      aria-label="Send message"
                    >
                      <Icon icon="lucide:send" className="h-5 w-5" />
                    </motion.button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
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
