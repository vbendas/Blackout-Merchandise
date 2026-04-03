'use client';

import { useState, useRef, useCallback } from 'react';

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  playAudio: (base64Audio: string) => Promise<void>;
  stopAudio: () => void;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    // Stop any existing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audioRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          resolve();
        };
        audio.onerror = () => {
          setIsPlaying(false);
          reject(new Error('Audio playback failed'));
        };

        audio.play().catch(reject);
      } catch (err) {
        setIsPlaying(false);
        reject(err);
      }
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    playAudio,
    stopAudio,
  };
}
