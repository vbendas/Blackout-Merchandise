import type { Suggestion } from '@/lib/agent/protocol';

interface SuggestionsDropdownProps {
  query: string;
  suggestions: Suggestion[];
  highlightedIndex: number | null;
  onSelect: (suggestion: Suggestion) => void;
  onHover: (index: number) => void;
  position: 'above' | 'below';
}

/** Splits `text` on the first case-insensitive match of `query` so the match
 * can be underlined, matching the mock's typed-substring highlight. */
function splitOnMatch(text: string, query: string): [string, string, string] {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return [text, '', ''];
  return [text.slice(0, at), text.slice(at, at + query.length), text.slice(at + query.length)];
}

export function SuggestionsDropdown({
  query,
  suggestions,
  highlightedIndex,
  onSelect,
  onHover,
  position,
}: SuggestionsDropdownProps) {
  return (
    <div
      role="listbox"
      aria-label="Suggestions"
      className={`mf-dropdown mf-rise absolute left-0 right-0 z-10 flex flex-col gap-0.5 p-2 ${
        position === 'below' ? 'top-[calc(100%+12px)]' : 'bottom-[calc(100%+12px)]'
      }`}
    >
      {suggestions.map((suggestion, index) => {
        const [before, match, after] = splitOnMatch(suggestion.text, query.trim());
        const active = index === highlightedIndex;
        return (
          <button
            key={suggestion.text}
            type="button"
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHover(index)}
            onClick={() => onSelect(suggestion)}
            className="mf-row flex h-11 items-center justify-between px-[18px] text-left"
            style={{ background: active ? 'var(--tint-8)' : 'transparent' }}
          >
            <span className="truncate text-[15px]">
              {before}
              {match ? <span className="underline underline-offset-[3px]">{match}</span> : null}
              {after}
            </span>
            <span className="mf-label mf-dimmed ml-3 shrink-0">{suggestion.area}</span>
          </button>
        );
      })}
      <div className="flex items-center justify-between px-[18px] pb-1.5 pt-2.5">
        <span className="mf-label mf-dimmed">Suggestions follow what you are doing</span>
        <span className="mf-label mf-dimmed">↑↓ · Tab</span>
      </div>
    </div>
  );
}
