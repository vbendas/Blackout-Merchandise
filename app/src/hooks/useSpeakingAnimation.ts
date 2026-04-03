'use client';

import { useEffect, useRef } from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';

/**
 * Hook to handle speaking animation for avatar
 * Alternates between speaking_a and speaking_b expressions
 */
export function useSpeakingAnimation() {
  const { startSpeaking, stopSpeaking, isAnimating } = useAvatarExpression();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    startSpeaking();
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopSpeaking();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    start,
    stop,
    isAnimating,
  };
}
