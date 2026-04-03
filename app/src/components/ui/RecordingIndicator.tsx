'use client';

import { Mic } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RecordingIndicatorProps {
  isRecording: boolean;
  _duration?: number; // Duration in seconds (reserved for future use)
  showTimer?: boolean;
}

/**
 * Recording indicator component
 * Shows animated pulse and optional timer during recording
 */
export function RecordingIndicator({ isRecording, _duration, showTimer = true }: RecordingIndicatorProps) {
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setDisplayTime(0);
      return;
    }

    const interval = setInterval(() => {
      setDisplayTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
      {/* Animated pulse indicator */}
      <div className="flex items-center gap-1">
        <Mic className="w-4 h-4 text-red-500" />
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-3 bg-red-500 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.15}s`,
                opacity: 0.6 + i * 0.15,
              }}
            />
          ))}
        </div>
      </div>

      {/* Timer */}
      {showTimer && <span className="text-xs font-mono text-red-500 ml-1">{formatTime(displayTime)}</span>}
    </div>
  );
}
