'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import type { Expression } from '@/types/expressions';

interface UseInputDetectionOptions {
  debounceMs?: number;
  inputExpression?: Expression;
  resetExpression?: Expression;
}

/**
 * Hook to detect user input and update avatar expression
 */
export function useInputDetection({
  debounceMs = 500,
  inputExpression = 'thinking',
  resetExpression = 'neutral',
}: UseInputDetectionOptions = {}) {
  const { setExpression, resetToNeutral } = useAvatarExpression();
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputFocus = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsTyping(true);
    setExpression(inputExpression);
  }, [inputExpression, setExpression]);

  const handleInputBlur = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (resetExpression === 'neutral') {
        resetToNeutral();
      } else {
        setExpression(resetExpression);
      }
    }, debounceMs);
  }, [debounceMs, resetExpression, resetToNeutral, setExpression]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    handleInputFocus,
    handleInputBlur,
  };
}
