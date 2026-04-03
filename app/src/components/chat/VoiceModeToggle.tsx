'use client';

import { Mic, Type } from 'lucide-react';
import { Button } from '../ui/button';

interface VoiceModeToggleProps {
  isVoiceMode: boolean;
  onToggle: () => void;
  disabled?: boolean;
  showLabel?: boolean;
}

/**
 * Voice/Text mode toggle button
 * Allows users to switch between text and voice input in chat
 */
export function VoiceModeToggle({ isVoiceMode, onToggle, disabled = false, showLabel = true }: VoiceModeToggleProps) {
  return (
    <Button
      onClick={onToggle}
      disabled={disabled}
      variant={isVoiceMode ? 'default' : 'outline'}
      size="sm"
      className="gap-2"
      title={isVoiceMode ? 'Switch to text input' : 'Switch to voice input'}
    >
      {isVoiceMode ? (
        <>
          <Mic className="w-4 h-4" />
          {showLabel && 'Voice'}
        </>
      ) : (
        <>
          <Type className="w-4 h-4" />
          {showLabel && 'Text'}
        </>
      )}
    </Button>
  );
}
