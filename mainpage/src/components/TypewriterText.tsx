'use client';

import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  showCursor?: boolean;
}

export function TypewriterText({
  text,
  delay = 0,
  speed = 40,
  className = '',
  showCursor = true,
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [showBlinker, setShowBlinker] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        // Keep cursor blinking for a bit then hide
        setTimeout(() => setShowBlinker(false), 2000);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [started, text, speed]);

  // Cursor blink
  useEffect(() => {
    if (!showCursor || !started || displayText.length < text.length) return;
    const blink = setInterval(() => {
      setShowBlinker((prev) => !prev);
    }, 530);
    return () => clearInterval(blink);
  }, [showCursor, started, displayText.length, text.length]);

  if (!started) return null;

  return (
    <span className={className}>
      {displayText}
      {showBlinker && (
        <span className="inline-block w-[2px] h-[1em] bg-current ml-[1px] animate-pulse align-middle" />
      )}
    </span>
  );
}
