'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * Search bar for catalog filtering
 * Debounces input to avoid excessive API calls
 * Part of Phase 3.5.5
 */
export function SearchBar({ onSearch, placeholder = 'Search products...', debounceMs = 300 }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative w-full max-w-md">
      <div
        className={`
          flex items-center gap-2 rounded-lg border bg-zinc-950 px-3 py-2 transition-all
          ${isFocused ? 'border-zinc-600 ring-2 ring-zinc-600/20' : 'border-zinc-800'}
        `}
      >
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-500"
        />
        {query && (
          <Button onClick={handleClear} size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-zinc-800">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
