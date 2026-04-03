'use client';

import { useEffect, useRef } from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { IDLE_EXPRESSIONS } from '@/lib/expressions/constants';
import type { Expression } from '@/types/expressions';

interface UseIdleAnimationOptions {
  interval?: number; // Time between idle animations (ms)
  duration?: number; // Duration each expression shows (ms)
  enabled?: boolean; // Enable/disable idle animation
}

/**
 * Hook to handle idle animation for avatar
 * Shows random expressions when idle
 */
export function useIdleAnimation({ interval = 8000, duration = 2000, enabled = true }: UseIdleAnimationOptions = {}) {
  const { setExpression, resetToNeutral, isAnimating } = useAvatarExpression();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);

  const showIdleExpression = () => {
    if (!enabled || isAnimating) return;

    // Pick a random idle expression (excluding neutral since we'll return to it)
    const idleOptions = IDLE_EXPRESSIONS.filter((e) => e !== 'neutral');
    const randomExpression = idleOptions[Math.floor(Math.random() * idleOptions.length)] as Expression;

    setExpression(randomExpression);

    // Reset to neutral after duration
    timeoutRef.current = setTimeout(() => {
      resetToNeutral();
      isIdleRef.current = false;
    }, duration);
  };

  const startIdleTimer = () => {
    if (!enabled || isAnimating) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for idle animation
    timeoutRef.current = setTimeout(() => {
      isIdleRef.current = true;
      showIdleExpression();
    }, interval);
  };

  // Recreate function when dependencies change
  const startIdleTimerRef = useRef(startIdleTimer);
  startIdleTimerRef.current = startIdleTimer;

  const resetIdleTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isIdleRef.current = false;
    startIdleTimer();
  };

  // Start idle timer on mount
  useEffect(() => {
    if (enabled) {
      startIdleTimerRef.current();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled]);

  return {
    resetIdleTimer,
    isIdle: isIdleRef.current,
  };
}
