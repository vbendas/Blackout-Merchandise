'use client';

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Mic, Plus, X } from 'lucide-react';
import { PromptInput, PromptInputButton, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { VoiceWaveIcon } from '@/components/chat/icons';
import { SuggestionsDropdown } from '@/components/chat/SuggestionsDropdown';
import { useSuggestions } from '@/components/chat/useSuggestions';
import type { Suggestion } from '@/lib/agent/protocol';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
  /** the dropdown renders below the composer in the empty state, above it
   * once the thread is active (per the design mock). */
  dropdownPosition: 'above' | 'below';
}

export function Composer({ onSend, disabled, dropdownPosition }: ComposerProps) {
  const [text, setText] = useState('');
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useSuggestions(text, dismissed);
  const showSuggestions = suggestions.length > 0 && text.trim().length >= 2 && !dismissed;

  // Reset the highlight whenever a new suggestion set arrives — done during
  // render (React's "adjusting state when a prop changes" pattern) rather
  // than in an effect, which would cause an extra synchronous re-render.
  const [suggestionsForHighlight, setSuggestionsForHighlight] = useState(suggestions);
  if (suggestions !== suggestionsForHighlight) {
    setSuggestionsForHighlight(suggestions);
    setHighlightedIndex(null);
  }

  function submitText(value: string) {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    setAttachedName(null);
    setHighlightedIndex(null);
    setDismissed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    const file = event.target.files?.[0];
    setAttachedName(file ? file.name : null);
  }

  const hasText = text.trim().length > 0;

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
      {attachedName ? (
        <div className="mf-hairline mf-fade-in mb-2 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[12px]">
          <span className="mf-dimmed">{attachedName}</span>
          <button type="button" onClick={() => setAttachedName(null)} aria-label="Remove attachment" className="mf-dimmed">
            <X className="mf-icon" style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ) : null}
      <PromptInput className="mf-composer w-full" onSubmit={handleSubmit}>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} tabIndex={-1} />
        <PromptInputButton
          type="button"
          aria-label="Attach an image"
          title="Attach an image"
          onClick={() => fileInputRef.current?.click()}
          className="mf-icon-btn mf-icon-btn-ghost size-9 shrink-0"
        >
          <Plus className="mf-icon" />
        </PromptInputButton>
        <PromptInputTextarea
          value={text}
          onChange={onChangeText}
          onKeyDown={onKeyDown}
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
        {hasText ? (
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
    </div>
  );
}
