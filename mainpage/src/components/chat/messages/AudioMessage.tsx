'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChatMessage } from '@/types/chat';
import { formatTime } from '@/lib/utils/formatTime';
import { formatDuration } from '@/lib/utils/formatDuration';

interface AudioMessageProps {
  message: ChatMessage;
  showAvatar?: boolean;
}

export function AudioMessage({ message, showAvatar = false }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUser = message.role === 'user';

  const bars = Array.from({ length: 24 }, (_, i) => {
    const seed = message.id.charCodeAt(i % message.id.length) || i * 7;
    return 20 + (seed % 50);
  });

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className={`flex items-end gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {showAvatar && !isUser && (
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-700">
          <Image
            src={`https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/${message.agent.toLowerCase()}/neutral_attr1_subject.png`}
            alt={message.agent}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className={`px-3 py-2 rounded-2xl ${
        isUser 
          ? 'bg-rose-600 text-white rounded-br-md' 
          : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              isUser ? 'bg-rose-700 hover:bg-rose-800' : 'bg-zinc-700 hover:bg-zinc-600'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-[2px] h-8 min-w-[120px]">
            {bars.map((height, i) => {
              const barProgress = i / bars.length;
              const isPlayed = barProgress < progress;
              
              return (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-colors ${
                    isPlayed 
                      ? isUser ? 'bg-rose-300' : 'bg-rose-500'
                      : isUser ? 'bg-rose-400/40' : 'bg-zinc-600'
                  }`}
                  style={{ height: `${Math.max(8, (height / 100) * 32)}px` }}
                />
              );
            })}
          </div>

          <span className="text-xs min-w-[40px] tabular-nums">
            {formatDuration(isPlaying ? currentTime : duration)}
          </span>
        </div>

        {message.audioUrl && (
          <audio
            ref={audioRef}
            src={message.audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          >
            <track kind="captions" />
          </audio>
        )}

        <span className={`text-xs mt-1 block ${isUser ? 'text-rose-200' : 'text-zinc-500'}`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
