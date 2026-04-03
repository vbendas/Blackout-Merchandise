'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({ text, speed = 30, className, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  // Skip the animation and show full text
  const skipAnimation = useCallback(() => {
    setDisplayedText(text);
    setIsComplete(true);
    setShowSkip(false);
    onComplete?.();
  }, [text, onComplete]);

  useEffect(() => {
    let currentIndex = 0;
    setDisplayedText('');
    setIsComplete(false);
    setShowSkip(false);

    // Show skip button after a short delay
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 500);

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        setShowSkip(false);
        onComplete?.();
      }
    }, speed);

    return () => {
      clearInterval(interval);
      clearTimeout(skipTimer);
    };
  }, [text, speed, onComplete]);

  return (
    <div className="relative">
      <span className={cn('whitespace-pre-wrap select-text', className)}>
        {displayedText}
        {!isComplete && <span className="animate-pulse inline-block h-4 w-0.5 align-middle ml-0.5 bg-zinc-400" />}
      </span>
      {showSkip && !isComplete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={skipAnimation}
          className="absolute -top-6 right-0 text-xs text-zinc-500 hover:text-zinc-300 h-6 px-2"
        >
          Skip
        </Button>
      )}
    </div>
  );
}
