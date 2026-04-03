'use client';

import { useCallback } from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { detectSentiment, getExpressionForMessage } from '@/lib/expressions/sentiment';
import type { Expression } from '@/types/expressions';

interface UseSentimentDetectionOptions {
  autoApply?: boolean;
  duration?: number;
}

/**
 * Hook to detect sentiment in messages and update avatar expression
 */
export function useSentimentDetection({ autoApply = true, duration = 3000 }: UseSentimentDetectionOptions = {}) {
  const { setExpression, resetToNeutral } = useAvatarExpression();

  const analyzeMessage = useCallback((role: 'user' | 'assistant', content: string): Expression | null => {
    const sentiment = detectSentiment(content);
    if (sentiment) {
      return sentiment;
    }

    // If no specific sentiment detected, use role-based expression
    return getExpressionForMessage(content, [], 'Leopoldo');
  }, []);

  const applySentiment = useCallback(
    (role: 'user' | 'assistant', content: string) => {
      const expression = analyzeMessage(role, content);

      if (expression && autoApply) {
        setExpression(expression);

        // Reset to neutral after duration
        if (duration > 0) {
          setTimeout(() => {
            resetToNeutral();
          }, duration);
        }
      }

      return expression;
    },
    [analyzeMessage, autoApply, duration, setExpression, resetToNeutral]
  );

  return {
    analyzeMessage,
    applySentiment,
  };
}
