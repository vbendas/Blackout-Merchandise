'use client';

import { motion } from 'framer-motion';
import { AudioWaveform, MessageCircle, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AvatarContainer } from '@/components/AvatarContainer';
import { useChat } from '@/lib/ChatContext';
import { getQuickActionsForStep } from '@/lib/designFlow';
import type { AgentName, Expression } from '@/types/expressions';

const QUICK_ACTIONS: Record<AgentName, { label: string; action: string }[]> = {
  Leopoldo: [
    { label: 'View sales', action: 'Show me my sales' },
    { label: 'Check revenue', action: 'What is my revenue?' },
    { label: 'Store analytics', action: 'Show store analytics' },
    { label: 'My account', action: 'Show my account' },
  ],
  Francisca: [
    { label: 'Create mockup', action: 'I want to create a mockup' },
    { label: 'Browse catalog', action: 'Show me the catalog' },
    { label: 'Start design', action: 'Help me start a design' },
    { label: 'Templates', action: 'Show me templates' },
  ],
  Antônia: [
    { label: 'Track order', action: 'Track my order' },
    { label: 'Get help', action: 'I need help' },
    { label: 'Contact support', action: 'Contact support' },
    { label: 'FAQs', action: 'Show FAQs' },
  ],
};

type AvatarExpression = 'idle' | 'typing' | 'sending' | 'agent_responding';

export function UnifiedBottomBar() {
  const {
    currentAgent,
    sendMessage,
    openChat,
    toggleChat,
    isOpen,
    designFlowStep,
    currentAgent: activeAgent,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [avatarExpression, setAvatarExpression] = useState<AvatarExpression>('idle');
  const avatarExpressionRef = useRef<AvatarExpression>('idle');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    avatarExpressionRef.current = avatarExpression;
  }, [avatarExpression]);

  const quickActions =
    activeAgent === 'Francisca'
      ? getQuickActionsForStep(designFlowStep).map((a) => ({ label: a.label, action: a.action }))
      : QUICK_ACTIONS[activeAgent];

  const getExpression = (): Expression => {
    switch (avatarExpression) {
      case 'typing':
        return 'mouth_closed';
      case 'sending':
        return Math.random() > 0.5 ? 'speaking_a' : 'speaking_b';
      case 'agent_responding':
        return 'speaking_a';
      default:
        return 'neutral';
    }
  };

  useEffect(() => {
    if (inputValue.length > 0 && avatarExpressionRef.current !== 'typing') {
      setAvatarExpression('typing');
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (inputValue.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        if (avatarExpressionRef.current === 'typing') setAvatarExpression('idle');
      }, 1500);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 56)}px`;
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setAvatarExpression('sending');
    sendMessage(inputValue.trim());
    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setTimeout(() => setAvatarExpression('idle'), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    setAvatarExpression('agent_responding');
    sendMessage(action);
    setTimeout(() => setAvatarExpression('idle'), 1000);
  };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const blobUrl = URL.createObjectURL(file);
      setAvatarExpression('sending');
      sendMessage(`Uploaded: ${file.name}`, { type: 'image', imageUrl: blobUrl });
      triggerHaptic();
      setTimeout(() => setAvatarExpression('idle'), 500);
    }
  };

  return (
    <div className="fixed bottom-0 left-16 right-0 z-50">
      {/* Avatar - at bottom-right corner */}
      <div className="absolute right-2 bottom-2 pointer-events-none" style={{ zIndex: 60 }}>
        <motion.div
          animate={
            avatarExpression === 'sending' || avatarExpression === 'agent_responding'
              ? { y: [0, -4, 0] }
              : avatarExpression === 'typing'
                ? { scale: [1, 1.02, 1] }
                : {}
          }
          transition={{ duration: 0.3, repeat: avatarExpression !== 'idle' ? 1 : 0, ease: 'easeInOut' }}
          className="pointer-events-auto"
        >
          <AvatarContainer mode="hero" agentName={currentAgent} expression={getExpression()} />
        </motion.div>
      </div>

      {/* Bottom Bar */}
      <section
        aria-label="Chat interface"
        className="bg-zinc-900/80 backdrop-blur-xl border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <section className="flex flex-col">
          {quickActions.length > 0 && (
            <div className="flex-shrink-0 px-2 py-1.5 overflow-hidden">
              <div className="flex gap-1.5 items-center justify-center overflow-x-auto scrollbar-hide">
                {quickActions.map((item) => (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      triggerHaptic();
                      handleQuickAction(item.action);
                    }}
                    className="rounded-full border border-white/10 bg-zinc-800/60 px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-700/60 hover:text-white whitespace-nowrap flex-shrink-0"
                  >
                    {item.label}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-1.5 px-2 py-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              aria-label="Upload"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                triggerHaptic();
                fileInputRef.current?.click();
              }}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800/60 text-zinc-400 hover:text-white"
              aria-label="Attach"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </motion.button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => openChat()}
                onClick={() => openChat()}
                placeholder={`Message ${currentAgent}...`}
                rows={1}
                className="w-full resize-none bg-zinc-800/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                style={{ minHeight: '32px', maxHeight: '56px' }}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={triggerHaptic}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800/60 text-zinc-400 hover:text-white"
              aria-label="Voice"
            >
              <AudioWaveform className="w-3.5 h-3.5" />
            </motion.button>
            <div className="flex flex-col gap-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  triggerHaptic();
                  toggleChat();
                }}
                className="shrink-0 w-8 h-7 rounded-lg flex items-center justify-center bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700"
                aria-label={isOpen ? 'Close' : 'Open'}
              >
                {isOpen ? <X className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  triggerHaptic();
                  handleSend();
                }}
                disabled={!inputValue.trim()}
                className={`shrink-0 w-8 h-7 rounded-lg flex items-center justify-center border ${inputValue.trim() ? 'bg-white text-zinc-900' : 'bg-zinc-800/60 text-zinc-600 border-transparent'}`}
                aria-label="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
