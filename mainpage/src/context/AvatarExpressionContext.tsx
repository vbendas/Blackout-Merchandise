'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { IDLE_EXPRESSIONS, SPEAKING_EXPRESSIONS } from '@/lib/expressions/constants';
import type { Expression, ExpressionContextType } from '@/types/expressions';

const DEFAULT_EXPRESSION: Expression = 'neutral';
const SPEAKING_EXPRESSION_INTERVAL = 500;
const IDLE_TIMEOUT = 5000;
const IDLE_INTERVAL = 3000;

interface ExtendedContextType extends ExpressionContextType {
  openChat: () => void;
  closeChat: () => void;
  isChatOpen: boolean;
}

const AvatarExpressionContext = createContext<ExtendedContextType | undefined>(undefined);

interface AvatarExpressionProviderProps {
  children: ReactNode;
}

export function AvatarExpressionProvider({ children }: AvatarExpressionProviderProps) {
  const [currentExpression, setCurrentExpression] = useState<Expression>(DEFAULT_EXPRESSION);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleCycleRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (speakingTimerRef.current) {
      clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
    if (idleCycleRef.current) {
      clearInterval(idleCycleRef.current);
      idleCycleRef.current = null;
    }
  }, []);

  const setExpression = useCallback((expression: Expression) => {
    setCurrentExpression(expression);
  }, []);

  const startSpeaking = useCallback(() => {
    clearAllTimers();
    setIsSpeaking(true);
    setIsAnimating(true);

    let index = 0;
    setCurrentExpression(SPEAKING_EXPRESSIONS[index]);

    speakingTimerRef.current = setInterval(() => {
      index = (index + 1) % SPEAKING_EXPRESSIONS.length;
      setCurrentExpression(SPEAKING_EXPRESSIONS[index]);
    }, SPEAKING_EXPRESSION_INTERVAL);
  }, [clearAllTimers]);

  const stopSpeaking = useCallback(() => {
    clearAllTimers();
    setIsSpeaking(false);
    setIsAnimating(false);
    setCurrentExpression('neutral');
  }, [clearAllTimers]);

  const resetToNeutral = useCallback(() => {
    setCurrentExpression('neutral');
  }, []);

  const startIdleAnimation = useCallback(() => {
    let index = 0;
    setCurrentExpression(IDLE_EXPRESSIONS[index]);

    idleCycleRef.current = setInterval(() => {
      index = (index + 1) % IDLE_EXPRESSIONS.length;
      setCurrentExpression(IDLE_EXPRESSIONS[index]);
    }, IDLE_INTERVAL);
  }, []);

  const openChat = useCallback(() => {
    setIsChatOpen(true);
    clearAllTimers();
    setCurrentExpression('happy');
    idleTimerRef.current = setTimeout(() => {
      if (!isSpeaking) {
        startIdleAnimation();
      }
    }, IDLE_TIMEOUT);
  }, [clearAllTimers, startIdleAnimation, isSpeaking]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    clearAllTimers();
    setCurrentExpression('neutral');
  }, [clearAllTimers]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const value: ExtendedContextType = {
    currentExpression,
    agentName: 'Antônia',
    isAnimating,
    setExpression,
    startSpeaking,
    stopSpeaking,
    resetToNeutral,
    openChat,
    closeChat,
    isChatOpen,
  };

  return <AvatarExpressionContext.Provider value={value}>{children}</AvatarExpressionContext.Provider>;
}

export function useAvatarExpression(): ExtendedContextType {
  const context = useContext(AvatarExpressionContext);
  if (context === undefined) {
    throw new Error('useAvatarExpression must be used within an AvatarExpressionProvider');
  }
  return context;
}

export function useChatOpen() {
  const context = useContext(AvatarExpressionContext);
  if (context === undefined) {
    throw new Error('useChatOpen must be used within an AvatarExpressionProvider');
  }
  return {
    openChat: context.openChat,
    closeChat: context.closeChat,
    isChatOpen: context.isChatOpen,
  };
}
