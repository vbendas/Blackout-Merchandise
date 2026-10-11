'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Mic, Plus, Square, X } from 'lucide-react';
import { PromptInput, PromptInputButton, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { VoiceWaveIcon } from '@/components/chat/icons';
import { SuggestionsDropdown } from '@/components/chat/SuggestionsDropdown';
import { useSuggestions } from '@/components/chat/useSuggestions';
import { pickAudioMimeType, micPermissionErrorMessage } from '@/components/chat/useVoice';
import type { UploadAttachment, UseUploadReturn } from '@/components/chat/useUpload';
import { ACCEPTED_IMAGE_TYPES } from '@/components/chat/useUpload';
import { transcribeAudio } from '@/lib/agent/client';
import type { AgentRequest, Suggestion } from '@/lib/agent/protocol';

const DEFAULT_UPLOAD_TEXT = 'I uploaded my artwork';
const TAP_THRESHOLD_MS = 300;

type MicState = 'idle' | 'recording' | 'transcribing';
type MicPhase = 'idle' | 'holding' | 'latched';

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface ComposerProps {
  onSend: (text: string, attachments?: AgentRequest['attachments']) => void;
  disabled: boolean;
  /** the dropdown renders below the composer in the empty state, above it
   * once the thread is active (per the design mock). */
  dropdownPosition: 'above' | 'below';
  upload: UseUploadReturn;
  /** dragging a file anywhere over the thread/composer — draws the dashed hairline */
  isDragging: boolean;
  /** opens the full-screen hands-free conversation mode */
  onOpenVoice: () => void;
}

function AttachmentChip({ attachment, onRemove }: { attachment: UploadAttachment; onRemove: () => void }) {
  return (
    <div className="mf-hairline mf-fade-in relative size-12 shrink-0 overflow-hidden rounded-xl">
      <img src={attachment.previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--paper)] text-[var(--signal)] opacity-90"
      >
        <X style={{ width: 10, height: 10 }} />
      </button>
    </div>
  );
}

function ProgressPill({ attachment, onRemove }: { attachment: UploadAttachment; onRemove: () => void }) {
  const failed = attachment.status === 'error';
  return (
    <div className="mf-hairline mf-fade-in flex w-fit max-w-full items-center gap-2 rounded-[2px] px-3 py-1.5 text-[12px]">
      <span className="mf-dimmed max-w-[160px] truncate">{attachment.name}</span>
      {failed ? (
        <span className="text-[11px]" style={{ color: 'var(--danger)' }}>
          {attachment.error ?? "Couldn't upload"}
        </span>
      ) : (
        <span className="relative h-px w-16 overflow-hidden" style={{ background: 'color-mix(in srgb, var(--signal) 18%, transparent)' }}>
          <span
            className="absolute inset-y-0 left-0"
            style={{ width: `${attachment.progress}%`, background: 'var(--signal)', transition: 'width 200ms var(--ease-settle)' }}
          />
        </span>
      )}
      <button type="button" onClick={onRemove} aria-label={`Remove ${attachment.name}`} className="mf-dimmed">
        <X className="mf-icon" style={{ width: 12, height: 12 }} />
      </button>
    </div>
  );
}

export function Composer({ onSend, disabled, dropdownPosition, upload, isDragging, onOpenVoice }: ComposerProps) {
  const [text, setText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const [micState, setMicState] = useState<MicState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const micPhaseRef = useRef<MicPhase>('idle');
  const pointerDownAtRef = useRef(0);
  const pendingLatchStopRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const suggestions = useSuggestions(text, dismissed);
  const showSuggestions = suggestions.length > 0 && text.trim().length >= 2 && !dismissed;

  const uploading = upload.attachments.filter((attachment) => attachment.status === 'uploading' || attachment.status === 'error');
  const uploaded = upload.attachments.filter((attachment) => attachment.status !== 'uploading' && attachment.status !== 'error');

  // Reset the highlight whenever a new suggestion set arrives — done during
  // render (React's "adjusting state when a prop changes" pattern) rather
  // than in an effect, which would cause an extra synchronous re-render.
  const [suggestionsForHighlight, setSuggestionsForHighlight] = useState(suggestions);
  if (suggestions !== suggestionsForHighlight) {
    setSuggestionsForHighlight(suggestions);
    setHighlightedIndex(null);
  }

  // Stop any live recording if the composer unmounts mid-hold.
  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      recorderRef.current?.stop();
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function finishRecording(mimeType: string | undefined) {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    const blob = new Blob(chunksRef.current, { type: mimeType ?? 'audio/webm' });
    chunksRef.current = [];
    setMicState('transcribing');
    try {
      const result = await transcribeAudio(blob);
      const heard = result.text.trim();
      if (heard) setText((prev) => (prev.trim().length > 0 ? `${prev.trim()} ${heard}` : heard));
    } catch {
      setMicError("Couldn't transcribe that — try again.");
    } finally {
      setMicState('idle');
      textareaRef.current?.focus();
    }
  }

  async function startRecording() {
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      micPhaseRef.current = 'idle';
      setMicError(micPermissionErrorMessage(error));
      return;
    }
    micStreamRef.current = stream;
    const mimeType = pickAudioMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      finishRecording(mimeType);
    };
    recorderRef.current = recorder;
    recorder.start();
    setMicState('recording');
    setElapsedSeconds(0);
    elapsedTimerRef.current = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
  }

  function stopRecording() {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    recorderRef.current?.stop();
  }

  // Press-and-hold records while held; a quick tap (< 300ms) instead latches
  // recording on until the next tap — see the mic button's handlers below.
  function beginMicPress() {
    if (micPhaseRef.current === 'idle') {
      micPhaseRef.current = 'holding';
      pointerDownAtRef.current = Date.now();
      startRecording();
    } else if (micPhaseRef.current === 'latched') {
      pendingLatchStopRef.current = true;
    }
  }

  function endMicPress() {
    if (micPhaseRef.current === 'holding') {
      const heldMs = Date.now() - pointerDownAtRef.current;
      if (heldMs < TAP_THRESHOLD_MS) {
        micPhaseRef.current = 'latched';
      } else {
        micPhaseRef.current = 'idle';
        stopRecording();
      }
    } else if (micPhaseRef.current === 'latched' && pendingLatchStopRef.current) {
      pendingLatchStopRef.current = false;
      micPhaseRef.current = 'idle';
      stopRecording();
    }
  }

  function submitText(value: string) {
    if (disabled) return;
    const trimmed = value.trim();
    const ready = uploaded.filter((attachment) => attachment.url);
    if (!trimmed && ready.length === 0) return;
    const attachments: AgentRequest['attachments'] | undefined =
      ready.length > 0
        ? ready.map((attachment) => ({
            url: attachment.url as string,
            kind: 'image' as const,
            name: attachment.name,
            designId: attachment.designId,
          }))
        : undefined;
    const finalText = trimmed || (attachments ? DEFAULT_UPLOAD_TEXT : '');
    if (!finalText) return;
    onSend(finalText, attachments);
    setText('');
    setHighlightedIndex(null);
    setDismissed(false);
    upload.reset();
  }

  function handleSubmit(message: PromptInputMessage) {
    submitText(message.text);
  }

  function onChangeText(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    setDismissed(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showSuggestions) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current === null ? 0 : Math.min(current + 1, suggestions.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current === null ? suggestions.length - 1 : Math.max(current - 1, 0)));
    } else if (event.key === 'Tab') {
      event.preventDefault();
      setText(suggestions[highlightedIndex ?? 0].text);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDismissed(true);
    } else if (event.key === 'Enter' && !event.shiftKey && highlightedIndex !== null) {
      event.preventDefault();
      submitText(suggestions[highlightedIndex].text);
    }
  }

  function onSelectSuggestion(suggestion: Suggestion) {
    submitText(suggestion.text);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) upload.upload(event.target.files);
    event.target.value = '';
  }

  // Overrides PromptInputTextarea's own (unused) paste-to-attachment logic —
  // images go through the shared upload flow instead of a local blob URL.
  function onPasteAttachment(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === 'file' && ACCEPTED_IMAGE_TYPES.includes(item.type)) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      event.preventDefault();
      upload.upload(files);
    }
  }

  const hasContent = text.trim().length > 0 || uploaded.some((attachment) => attachment.url);
  const micPlaceholder =
    micState === 'recording' ? 'Listening…' : micState === 'transcribing' ? 'Transcribing…' : 'Describe a piece, a drop or a run';
  const micAriaLabel =
    micState === 'recording' ? 'Recording — release or tap to stop' : micState === 'transcribing' ? 'Transcribing' : 'Hold to talk';

  return (
    <div className="relative w-full max-w-[720px]">
      {showSuggestions ? (
        <SuggestionsDropdown
          query={text}
          suggestions={suggestions}
          highlightedIndex={highlightedIndex}
          onSelect={onSelectSuggestion}
          onHover={setHighlightedIndex}
          position={dropdownPosition}
        />
      ) : null}
      {uploaded.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {uploaded.map((attachment) => (
            <AttachmentChip key={attachment.id} attachment={attachment} onRemove={() => upload.remove(attachment.id)} />
          ))}
        </div>
      ) : null}
      <PromptInput className={`mf-composer w-full ${isDragging ? 'mf-drop-highlight' : ''}`} onSubmit={handleSubmit}>
        <input
          ref={upload.inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={onFileChange}
          tabIndex={-1}
        />
        <PromptInputButton
          type="button"
          aria-label="Attach an image"
          title="Attach an image"
          onClick={upload.openPicker}
          className="mf-icon-btn mf-icon-btn-ghost size-9 shrink-0"
        >
          <Plus className="mf-icon" />
        </PromptInputButton>
        <PromptInputTextarea
          ref={textareaRef}
          value={text}
          onChange={onChangeText}
          onKeyDown={onKeyDown}
          onPaste={onPasteAttachment}
          placeholder={micPlaceholder}
          disabled={disabled}
          rows={1}
        />
        {micState === 'recording' ? <span className="mf-mic-timer">{formatTimer(elapsedSeconds)}</span> : null}
        <PromptInputButton
          type="button"
          aria-label={micAriaLabel}
          title={micAriaLabel}
          disabled={disabled || micState === 'transcribing'}
          onPointerDown={(event) => {
            event.preventDefault();
            beginMicPress();
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            endMicPress();
          }}
          onPointerLeave={() => {
            if (micPhaseRef.current === 'holding') endMicPress();
          }}
          onPointerCancel={() => {
            if (micPhaseRef.current === 'holding') endMicPress();
          }}
          onKeyDown={(event) => {
            if (event.key !== ' ' || event.repeat) return;
            event.preventDefault();
            beginMicPress();
          }}
          onKeyUp={(event) => {
            if (event.key !== ' ') return;
            event.preventDefault();
            endMicPress();
          }}
          className={`mf-icon-btn size-9 shrink-0 ${micState === 'recording' ? 'mf-mic-recording' : 'mf-icon-btn-ghost'}`}
        >
          {micState === 'recording' ? (
            // .mf-icon sets fill: none from the stylesheet, which beats an
            // SVG presentation attribute — an inline style is needed to win.
            <Square className="mf-icon" style={{ fill: 'currentColor' }} />
          ) : (
            <Mic className="mf-icon" />
          )}
        </PromptInputButton>
        {hasContent ? (
          <PromptInputSubmit
            disabled={disabled}
            aria-label="Send"
            className="mf-icon-btn mf-icon-btn-solid size-10 shrink-0"
          >
            <ArrowUp className="mf-icon" />
          </PromptInputSubmit>
        ) : (
          <button
            type="button"
            aria-label="Talk to MerchFrom"
            title="Talk to MerchFrom"
            onClick={onOpenVoice}
            disabled={disabled}
            className="mf-icon-btn mf-icon-btn-solid mf-breathe size-10 shrink-0"
          >
            <VoiceWaveIcon className="mf-icon" />
          </button>
        )}
      </PromptInput>
      {micError ? <div className="mf-dimmed mt-2 text-[12px]">{micError}</div> : null}
      {uploading.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {uploading.map((attachment) => (
            <ProgressPill key={attachment.id} attachment={attachment} onRemove={() => upload.remove(attachment.id)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
