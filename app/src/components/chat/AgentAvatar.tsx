'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
  const imgRef = useRef<HTMLImageElement>(null);
  const imgWidth = IMG_WIDTH_MAP[size];

  // Preload all expressions for this agent on mount
  useEffect(() => {
    preloadExpressions(agentName);
  }, [agentName]);

  // Handle cached images: if already loaded before React attaches onLoad, set isLoaded immediately
  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [currentExpression]);

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
      className={cn('relative h-full w-full overflow-hidden rounded-full bg-transparent', className)}
      animate={isIdle ? 'idle' : 'active'}
      variants={idleVariants}
    >
      <img
        key={`${agentName}-${currentExpression}`}
        ref={imgRef}
        src={imageUrl}
        alt={`${agentName} - ${currentExpression}`}
        className={cn(
          'h-full w-full object-cover object-top transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          imageClassName
        )}
        onLoad={() => setIsLoaded(true)}
        loading="eager"
      />
    </motion.div>
  );
}
