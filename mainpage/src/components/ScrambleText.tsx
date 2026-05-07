'use client';

import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

interface ScrambleTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  onComplete?: () => void;
}

export function ScrambleText({
  text,
  className = '',
  delay = 0,
  duration = 900,
  onComplete,
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    const chars = text.split('');
    const totalChars = chars.length;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      let result = '';
      for (let i = 0; i < totalChars; i++) {
        if (chars[i] === ' ') {
          result += ' ';
          continue;
        }

        // Each character resolves at a different point in the animation
        // Earlier characters resolve sooner
        const charThreshold = (i / totalChars) * 0.7 + 0.1;

        if (progress > charThreshold) {
          result += chars[i];
        } else {
          // Random glyph based on position and time for visual variety
          const glyphIndex = (Math.floor(elapsed / 90) + i * 13) % GLYPHS.length;
          result += GLYPHS[glyphIndex];
        }
      }

      setDisplayText(result);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [started, text, duration, onComplete]);

  if (!started) return null;

  return <span className={className}>{displayText}</span>;
}
