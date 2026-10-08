'use client';

import { useEffect, useRef } from 'react';
import { ConversationProvider } from '@elevenlabs/react';
import { Mic, MicOff, X } from 'lucide-react';
import { useVoice, type VoiceState } from '@/components/chat/useVoice';

interface VoiceOverlayProps {
  open: boolean;
  onClose: () => void;
  sendText: (text: string) => void;
  onAssistantDone: (callback: (text: string) => void) => () => void;
}

const STATE_LABELS: Record<VoiceState, string> = {
  connecting: 'Connecting',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  paused: 'Paused',
  error: 'Paused',
};

/** Full-screen hands-free conversation mode. Mounted only while `open` —
 * closing it unmounts `VoiceOverlayContent` (and with it `useVoice`), which
 * is what tears down the mic/session; there is nothing to persist between
 * opens. */
export function VoiceOverlay({ open, onClose, sendText, onAssistantDone }: VoiceOverlayProps) {
  if (!open) return null;
  return (
    <ConversationProvider>
      <VoiceOverlayContent onClose={onClose} sendText={sendText} onAssistantDone={onAssistantDone} />
    </ConversationProvider>
  );
}

function VoiceOverlayContent({ onClose, sendText, onAssistantDone }: Omit<VoiceOverlayProps, 'open'>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const voice = useVoice({ audioRef, sendText, onAssistantDone });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const label = STATE_LABELS[voice.state];

  return (
    <div className="mf-voice-overlay" role="dialog" aria-modal="true" aria-label="Voice conversation">
      <button
        type="button"
        aria-label="Close voice conversation"
        onClick={onClose}
        className="mf-icon-btn mf-icon-btn-ghost absolute right-5 top-5 size-10"
      >
        <X className="mf-icon" />
      </button>

      <button
        type="button"
        onClick={voice.ringTap}
        aria-label={voice.state === 'speaking' ? 'Stop and listen' : 'Voice status'}
        className="mf-voice-ring"
        data-state={voice.state}
      />
      <div className="mf-voice-state-label">{label}</div>
      {voice.heardText ? <div className="mf-voice-transcript mf-dimmed">{voice.heardText}</div> : null}
      {voice.replyText ? <div className="mf-voice-transcript">{voice.replyText}</div> : null}
      {voice.errorMessage ? (
        <div className="mf-voice-transcript" style={{ color: 'var(--danger)' }}>
          {voice.errorMessage}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={voice.toggleMute}
          aria-pressed={voice.muted}
          aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
          className="mf-icon-btn mf-icon-btn-ghost size-10"
        >
          {voice.muted ? <MicOff className="mf-icon" /> : <Mic className="mf-icon" />}
        </button>
        <button type="button" onClick={onClose} className="mf-pill mf-pill-primary">
          End
        </button>
      </div>

      {/* Hidden sink for the fallback engine's TTS playback — the overlay
          never needs visible transport controls. */}
      <audio ref={audioRef} hidden />
    </div>
  );
}
