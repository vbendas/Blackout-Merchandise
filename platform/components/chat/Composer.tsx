'use client';

import { useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Mic, Plus, X } from 'lucide-react';
import { PromptInput, PromptInputButton, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { VoiceWaveIcon } from '@/components/chat/icons';
import { SuggestionsDropdown } from '@/components/chat/SuggestionsDropdown';
import { useSuggestions } from '@/components/chat/useSuggestions';
import type { UploadAttachment, UseUploadReturn } from '@/components/chat/useUpload';
import { ACCEPTED_IMAGE_TYPES } from '@/components/chat/useUpload';
import type { AgentRequest, Suggestion } from '@/lib/agent/protocol';

const DEFAULT_UPLOAD_TEXT = 'I uploaded my artwork';

interface ComposerProps {
  onSend: (text: string, attachments?: AgentRequest['attachments']) => void;
  disabled: boolean;
  /** the dropdown renders below the composer in the empty state, above it
   * once the thread is active (per the design mock). */
  dropdownPosition: 'above' | 'below';
  upload: UseUploadReturn;
  /** dragging a file anywhere over the thread/composer — draws the dashed hairline */
  isDragging: boolean;
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
    <div className="mf-hairline mf-fade-in flex w-fit max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-[12px]">
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

export function Composer({ onSend, disabled, dropdownPosition, upload, isDragging }: ComposerProps) {
  const [text, setText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

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
          value={text}
          onChange={onChangeText}
          onKeyDown={onKeyDown}
          onPaste={onPasteAttachment}
          placeholder="Message MerchFrom…"
          disabled={disabled}
          rows={1}
        />
        <PromptInputButton
          type="button"
          aria-label="Voice — coming soon"
          title="Voice — coming soon"
          disabled
          className="mf-icon-btn mf-icon-btn-ghost size-9 shrink-0"
        >
          <Mic className="mf-icon" />
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
            aria-label="Talk to MerchFrom — coming soon"
            title="Talk to MerchFrom — coming soon"
            disabled
            className="mf-icon-btn mf-icon-btn-solid mf-breathe size-10 shrink-0"
          >
            <VoiceWaveIcon className="mf-icon" />
          </button>
        )}
      </PromptInput>
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
