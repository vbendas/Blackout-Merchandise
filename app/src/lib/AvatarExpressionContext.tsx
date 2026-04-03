'use client';

import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import type { AgentName, Expression, ExpressionContextType } from '@/types/expressions';

interface AvatarExpressionProviderProps {
  children: ReactNode;
  agentName?: AgentName;
}

const AvatarExpressionContext = createContext<ExpressionContextType | undefined>(undefined);

export function AvatarExpressionProvider({ children, agentName = 'Leopoldo' }: AvatarExpressionProviderProps) {
  const [currentExpression, setCurrentExpression] = useState<Expression>('neutral');
  const [isAnimating, setIsAnimating] = useState(false);
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setExpression = useCallback((expression: Expression) => {
    // Stop any speaking animation if we're setting a different expression
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
      setIsAnimating(false);
    }

    setCurrentExpression(expression);
  }, []);

  const startSpeaking = useCallback(() => {
    // Clear any existing interval
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
    }

    setIsAnimating(true);
    // Use only speaking_a to avoid eye expression changes
    setCurrentExpression('speaking_a');
  }, []);

  const stopSpeaking = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    setIsAnimating(false);
    setCurrentExpression('neutral');
  }, []);

  const resetToNeutral = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    setIsAnimating(false);
    setCurrentExpression('neutral');
  }, []);

  const contextValue: ExpressionContextType = {
    currentExpression,
    agentName,
    isAnimating,
    setExpression,
    startSpeaking,
    stopSpeaking,
    resetToNeutral,
  };

  return <AvatarExpressionContext.Provider value={contextValue}>{children}</AvatarExpressionContext.Provider>;
}

export function useAvatarExpression() {
  const context = useContext(AvatarExpressionContext);
  if (!context) {
    throw new Error('useAvatarExpression must be used within an AvatarExpressionProvider');
  }
  return context;
}
