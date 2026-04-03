'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAvatarExpression } from '@/context/AvatarExpressionContext';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';
import { detectSentiment, getExpressionForMessage } from '@/lib/expressions/sentiment';
import type { Expression } from '@/types/expressions';

function TypingIndicator({ color }: { color: string }) {
  const { currentExpression } = useAvatarExpression();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-end gap-2"
    >
      <div className="h-8 w-8 overflow-hidden rounded-full border-2" style={{ borderColor: color }}>
        <img
          src={getCloudinaryUrl('Antônia', currentExpression as Expression, 100)}
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

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

const WELCOME_SUGGESTIONS = [
  'Como funciona a plataforma?',
  'Quais produtos vocês oferecem?',
  'Quanto custa para começar?',
  'Falar com um vendedor',
];

const AGENT_NAME = 'Antônia';
const AGENT_COLOR = '#a1a1aa';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function VisitorFloatingChat() {
  const {
    currentExpression,
    setExpression,
    startSpeaking,
    stopSpeaking,
    openChat: contextOpenChat,
    closeChat: contextCloseChat,
  } = useAvatarExpression();

  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const toggleChat = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      contextOpenChat();
    } else {
      contextCloseChat();
    }
  }, [isOpen, contextOpenChat, contextCloseChat]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set expression when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setExpression('happy');
    }
  }, [isOpen, messages.length, setExpression]);

  // Handle input focus - show listening expression
  const handleInputFocus = () => {
    setInputFocused(true);
    if (!isTyping && !isSpeaking) {
      setExpression('neutral');
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Show thinking while processing
    setExpression('thinking');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/chat/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue.trim(),
          history: messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Detect expression from response
      const detectedExpression = getExpressionForMessage(data.response, [...messages, userMessage, assistantMessage]);
      setExpression(detectedExpression);

      // Play audio if voice mode
      if (isVoiceMode && data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        setIsSpeaking(true);
        startSpeaking();
        audio.onended = () => {
          setIsSpeaking(false);
          stopSpeaking();
        };
        audio.play();
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, houve um erro. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setExpression('confused');
    } finally {
      setIsTyping(false);
    }
  };

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

  const toggleVoiceMode = () => {
    setIsVoiceMode((prev) => !prev);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsTyping(true);
        setExpression('thinking');

        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');

          const response = await fetch('/api/chat/visitor/voice', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Voice request failed');

          const data = await response.json();

          const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: data.transcription,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, userMessage]);

          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);

          const detectedExpression = getExpressionForMessage(data.response, [userMessage, assistantMessage]);
          setExpression(detectedExpression);

          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            setIsSpeaking(true);
            startSpeaking();
            audio.onended = () => {
              setIsSpeaking(false);
              stopSpeaking();
            };
            audio.play();
          }
        } catch (error) {
          console.error('Voice processing error:', error);
          setExpression('confused');
        } finally {
          setIsTyping(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setExpression('speaking_a');
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Get avatar expression based on state
  const getAvatarExpression = (): Expression => {
    if (isTyping || isSpeaking || isListening) {
      return currentExpression;
    }
    return currentExpression;
  };

  const avatarExpression = getAvatarExpression();

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
            aria-label="Abrir chat"
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
              <motion.div
                className="h-full w-full overflow-hidden rounded-full"
                animate={isSpeaking || isTyping ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.5, repeat: isSpeaking || isTyping ? Infinity : 0 }}
              >
                <img
                  src={getCloudinaryUrl('Antônia', avatarExpression, 200)}
                  alt={AGENT_NAME}
                  className="h-full w-full object-cover"
                />
              </motion.div>
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
                    style={{ borderColor: '#a1a1aa' }}
                    animate={isSpeaking || isTyping ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, repeat: isSpeaking || isTyping ? Infinity : 0 }}
                  >
                    <img
                      src={getCloudinaryUrl('Antônia', avatarExpression, 200)}
                      alt={AGENT_NAME}
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950"
                    style={{ backgroundColor: '#a1a1aa' }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{AGENT_NAME}</h3>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="relative flex h-2 w-2">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ backgroundColor: AGENT_COLOR }}
                      />
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: AGENT_COLOR }}
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
                  onClick={toggleVoiceMode}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    isVoiceMode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                  title={isVoiceMode ? 'Modo texto' : 'Modo voz'}
                >
                  <Icon icon={isVoiceMode ? 'lucide:message-square' : 'lucide:mic'} className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleChat}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  aria-label="Fechar chat"
                >
                  <Icon icon="lucide:x" className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2"
                          style={{ borderColor: AGENT_COLOR }}
                        >
                          <img
                            src={getCloudinaryUrl('Antônia', 'happy', 200)}
                            alt={AGENT_NAME}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="rounded-2xl rounded-tl-sm bg-zinc-900/80 px-4 py-3 backdrop-blur-xl">
                            <p className="text-sm text-zinc-100">
                              Olá! Sou <span className="font-semibold">{AGENT_NAME}</span>, sua assistente virtual.
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">Como posso ajudar você hoje?</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {WELCOME_SUGGESTIONS.map((suggestion, index) => (
                              <motion.button
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.08 }}
                                onClick={() => handleQuickAction(suggestion)}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                              >
                                {suggestion}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="popLayout">
                  {messages.map((message) => {
                    const isUser = message.role === 'user';
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
                            style={{ borderColor: AGENT_COLOR }}
                          >
                            <img
                              src={getCloudinaryUrl('Antônia', detectSentiment(message.content) || 'neutral', 100)}
                              alt={AGENT_NAME}
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
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          <span className="mt-1 block text-right text-[10px] text-zinc-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <AnimatePresence>{isTyping && <TypingIndicator color={AGENT_COLOR} />}</AnimatePresence>
              </div>
            </div>

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
                      isListening ? 'animate-pulse' : ''
                    }`}
                    style={{
                      backgroundColor: isListening ? '#EF4444' : AGENT_COLOR,
                      boxShadow: `0 0 30px ${isListening ? '#EF4444' : AGENT_COLOR}50`,
                    }}
                  >
                    <motion.div
                      animate={isListening ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
                    >
                      <Icon icon="lucide:mic" className="h-8 w-8 text-white" />
                    </motion.div>
                  </motion.button>
                  <p className="text-xs text-zinc-400">{isListening ? 'Ouvindo...' : 'Segure para falar'}</p>
                </motion.div>
              ) : (
                <>
                  <AnimatePresence>
                    {inputFocused && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 flex gap-2 overflow-x-auto pb-1"
                      >
                        {WELCOME_SUGGESTIONS.slice(0, 3).map((suggestion, index) => (
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
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="Digite sua mensagem..."
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
                      style={inputValue.trim() && !isTyping ? { backgroundColor: AGENT_COLOR } : {}}
                      aria-label="Enviar mensagem"
                    >
                      <Icon icon="lucide:send" className="h-5 w-5" />
                    </motion.button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Enter para enviar</span>
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:shield-check" className="h-3 w-3" />
                      Seguro
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
