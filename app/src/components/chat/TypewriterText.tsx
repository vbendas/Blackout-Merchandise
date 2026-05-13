'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  /** The full text to reveal */
  text: string;
  /** Whether this is the currently streaming message (controls animation) */
  isStreaming?: boolean;
  /** Characters to reveal per tick (default: 2) */
  speed?: number;
  /** Milliseconds between ticks (default: 16 ≈ 60fps) */
  intervalMs?: number;
  /** Callback when typewriter finishes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders text with a typewriter effect.
 * When `isStreaming` is true, the text animates character by character.
 * When false, renders the full text immediately (for previously completed messages).
 */
export function TypewriterText({
  text,
  isStreaming = false,
  speed = 2,
  intervalMs = 16,
  onComplete,
  className = '',
}: TypewriterTextProps) {
  const [displayedLength, setDisplayedLength] = useState(isStreaming ? 0 : text.length);
  const prevTextRef = useRef(text);
  const hasCompletedRef = useRef(false);

  // If text changes (new streaming session), reset
  useEffect(() => {
    if (isStreaming && prevTextRef.current !== text) {
      // Text content changed — if it grew, we're continuing; if it shrank, it's new
      if (text.length < prevTextRef.current.length) {
        setDisplayedLength(0);
      }
      prevTextRef.current = text;
      hasCompletedRef.current = false;
    }
  }, [text, isStreaming]);

  // Typewriter animation
  useEffect(() => {
    if (!isStreaming) {
      // Not streaming — show full text immediately
      setDisplayedLength(text.length);
      return;
    }

    if (displayedLength >= text.length) {
      // Typing complete
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        const next = Math.min(prev + speed, text.length);
        if (next >= text.length) {
          clearInterval(timer);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, text.length, displayedLength, speed, intervalMs, onComplete]);

  // For completed messages or full reveal, just render the text
  if (!isStreaming || displayedLength >= text.length) {
    return <span className={className}>{text}</span>;
  }

  // Streaming — show partial text with cursor
  const displayed = text.slice(0, displayedLength);
  return (
    <span className={className}>
      {displayed}
      <span className="animate-pulse text-zinc-400">|</span>
    </span>
  );
}
