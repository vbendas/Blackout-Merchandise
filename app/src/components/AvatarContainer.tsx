'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { getCloudinaryUrl, preloadExpressions } from '@/lib/expressions/cloudinary';
import { cn } from '@/lib/utils';
import type { AgentName, Expression } from '@/types/expressions';

type ViewMode = 'hero' | 'copilot' | 'orb';

interface AvatarContainerProps {
  mode?: ViewMode;
  className?: string;
  agentName?: AgentName;
  expression?: Expression;
}

const sizeClasses: Record<ViewMode, string> = {
  hero: 'w-44 h-44 md:w-56 md:h-56',
  copilot: 'w-16 h-16 md:w-20 md:h-20',
  orb: 'w-8 h-8',
};

const sizeWidths: Record<ViewMode, number> = {
  hero: 600,
  copilot: 200,
  orb: 100,
};

export function AvatarContainer({
  mode = 'copilot',
  className,
  agentName = 'Leopoldo',
  expression: propExpression,
}: AvatarContainerProps) {
  // Use context expression if no prop provided
  const { currentExpression } = useAvatarExpression();
  const expression = propExpression || currentExpression || 'neutral';

  const [imageUrl, setImageUrl] = useState(() => getCloudinaryUrl(agentName, expression, sizeWidths[mode]));
  const [isLoaded, setIsLoaded] = useState(false);

  // Update URL when expression or mode changes
  useEffect(() => {
    const newUrl = getCloudinaryUrl(agentName, expression, sizeWidths[mode]);
    setImageUrl(newUrl);
    setIsLoaded(false);
  }, [agentName, expression, mode]);

  // Preload all expressions on mount
  useEffect(() => {
    preloadExpressions(agentName);
  }, [agentName]);

  return (
    <div className={cn('relative overflow-hidden', className || sizeClasses[mode])}>
      <Image
        src={imageUrl}
        alt={`${agentName} - ${expression}`}
        fill
        className={cn('object-cover transition-opacity duration-300', isLoaded ? 'opacity-100' : 'opacity-0')}
        priority={mode === 'hero'}
        onLoadingComplete={() => setIsLoaded(true)}
      />
    </div>
  );
}
