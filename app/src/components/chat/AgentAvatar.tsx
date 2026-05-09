'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl, preloadExpressions } from '@/lib/expressions/cloudinary';
import { cn } from '@/lib/utils';
import type { AgentName, Expression } from '@/types/expressions';

export type ChatExpression = 'neutral' | 'thinking' | 'speaking' | 'happy' | 'confused';

interface AgentAvatarProps {
  agentName: AgentName;
  expression?: ChatExpression;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  enableIdleAnimation?: boolean;
  enableSpeakingAnimation?: boolean;
  imageClassName?: string;
}

const IMG_WIDTH_MAP: Record<string, number> = {
  sm: 100,
  md: 400,
  lg: 800,
};

const EXPRESSION_MAP: Record<ChatExpression, Expression> = {
  neutral: 'neutral',
  thinking: 'thinking',
  speaking: 'speaking_a',
  happy: 'happy',
  confused: 'confused',
};

export function AgentAvatar({
  agentName,
  expression = 'neutral',
  size = 'md',
  className,
  enableIdleAnimation = true,
  enableSpeakingAnimation = true,
  imageClassName,
}: AgentAvatarProps) {
  const [currentExpression, setCurrentExpression] = useState<Expression>(EXPRESSION_MAP[expression]);
  const [isLoaded, setIsLoaded] = useState(false);
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const imgWidth = IMG_WIDTH_MAP[size];

  // Preload all expressions for this agent on mount
  useEffect(() => {
    preloadExpressions(agentName);
  }, [agentName]);

  // Handle expression changes
  useEffect(() => {
    // Clear any existing speaking interval
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    if (expression === 'speaking' && enableSpeakingAnimation) {
      // Start alternating between speaking_a and speaking_b
      let isSpeakingA = true;
      setCurrentExpression('speaking_a');

      speakingIntervalRef.current = setInterval(() => {
        isSpeakingA = !isSpeakingA;
        setCurrentExpression(isSpeakingA ? 'speaking_a' : 'speaking_b');
      }, 400);
    } else {
      setCurrentExpression(EXPRESSION_MAP[expression]);
    }

    return () => {
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
      }
    };
  }, [expression, enableSpeakingAnimation]);

  const imageUrl = getAvatarUrl(agentName, currentExpression, imgWidth);

  // Idle animation variants
  const idleVariants = {
    idle: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    active: {
      scale: 1,
    },
  };

  const isIdle = expression === 'neutral' && enableIdleAnimation;

  return (
    <motion.div
      className={cn('relative h-full w-full overflow-hidden rounded-full', className)}
      animate={isIdle ? 'idle' : 'active'}
      variants={idleVariants}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={`${agentName}-${currentExpression}`}
          src={imageUrl}
          alt={`${agentName} - ${currentExpression}`}
          className={cn(
            'h-full w-full object-cover object-top transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            imageClassName
          )}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: isLoaded ? 1 : 0, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          onLoad={() => setIsLoaded(true)}
          loading="eager"
        />
      </AnimatePresence>
    </motion.div>
  );
}
