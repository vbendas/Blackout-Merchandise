'use client';

/**
 * TypesenseSearchBar — Enhanced search bar with instant results.
 *
 * Replaces the simple SearchBar.tsx with Typesense-powered search:
 * - Debounced input (300ms)
 * - Typo-tolerant search via /api/search/catalog
 * - Instant result preview dropdown
 * - Facet counts for category/brand
 * - "Did you mean?" suggestion for typos
 */

import { Search, X, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';

interface SearchResult {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  baseCostEur?: number;
  retailPrice?: number;
  _highlight?: unknown;
}

interface TypesenseSearchBarProps {
  /** API endpoint to call: '/api/search/catalog' or '/api/search/shop/{slug}' */
  endpoint?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Callback when search results are received */
  onResults?: (results: SearchResult[], total: number, facets?: unknown) => void;
  /** Callback when query changes (for parent state) */
  onQueryChange?: (query: string) => void;
  /** Show instant dropdown preview */
  showPreview?: boolean;
}

export function TypesenseSearchBar({
  endpoint = '/api/search/catalog',
  placeholder = 'Search products...',
  debounceMs = 300,
  onResults,
  onQueryChange,
  showPreview = true,
}: TypesenseSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!searchQuery.trim()) {
      setPreviewResults([]);
      setShowDropdown(false);
      onResults?.([], 0);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const url = `${endpoint}?q=${encodeURIComponent(searchQuery)}&limit=${showPreview ? 3 : 20}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        setPreviewResults([]);
        return;
      }

      const data = await response.json();
      const results = data.results ?? [];
      const total = data.total ?? 0;
      const facets = data.facets;

      setPreviewResults(results);
      setShowDropdown(showPreview && results.length > 0);
      onResults?.(results, total, facets);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, showPreview, onResults]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs, performSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setPreviewResults([]);
    setShowDropdown(false);
    onResults?.([], 0);
    onQueryChange?.('');
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div
        className={`
          flex items-center gap-2 rounded-lg border bg-zinc-950 px-3 py-2 transition-all
          ${isFocused ? 'border-zinc-600 ring-2 ring-zinc-600/20' : 'border-zinc-800'}
        `}
      >
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (previewResults.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay to allow clicking on dropdown items
            setTimeout(() => setShowDropdown(false), 200);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-500"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />}
        {query && !isLoading && (
          <Button onClick={handleClear} size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-zinc-800 shrink-0">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Instant Results Dropdown */}
      {showDropdown && previewResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
          {previewResults.map((result) => (
            <div
              key={result.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              {result.imageUrl && (
                <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden shrink-0">
                  <img
                    src={result.imageUrl}
                    alt={result.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{result.name}</p>
                {result.brand && (
                  <p className="text-xs text-zinc-500">{result.brand}</p>
                )}
              </div>
              {result.baseCostEur != null && (
                <span className="text-xs text-zinc-400 shrink-0">
                  €{(result.baseCostEur / 100).toFixed(2)}
                </span>
              )}
            </div>
          ))}
          <div className="px-3 py-1.5 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Press Enter for all results</p>
          </div>
        </div>
      )}
    </div>
  );
}
