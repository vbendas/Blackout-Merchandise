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
  error: 'Not listening',
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Where focus goes back to when the overlay closes: what had it before (the
 * voice button), or, if that has left the page, the voice button or the
 * composer's text box as they are now. */
function returnTarget(previous: Element | null): HTMLElement | null {
  if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) return previous;
  return (
    document.querySelector<HTMLElement>('[data-voice-trigger]') ?? document.querySelector<HTMLElement>('.mf-composer textarea')
  );
}

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const voice = useVoice({ audioRef, sendText, onAssistantDone });

  // Focus moves into the dialog as it opens and back to its trigger as it closes.
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      returnTarget(previous)?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      // aria-modal: Tab cycles through the overlay's own controls.
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && dialog.contains(active) && active !== dialog;
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const label = STATE_LABELS[voice.state];

  return (
    <div
      ref={dialogRef}
      className="mf-voice-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Voice conversation"
      tabIndex={-1}
      // Focus lands on the dialog itself, which needs no ring of its own.
      style={{ outline: 'none' }}
    >
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
      <div className="mf-voice-state-label" aria-live="polite">
        {label}
      </div>
      {voice.heardText ? <div className="mf-voice-transcript mf-dimmed">{voice.heardText}</div> : null}
      {voice.replyText ? <div className="mf-voice-transcript">{voice.replyText}</div> : null}
      {voice.errorMessage ? (
        <div role="alert" className="mf-voice-transcript">
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
