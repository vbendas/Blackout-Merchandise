'use client';

/**
 * ShopSearch — Store-scoped search widget for MerchShop pages.
 *
 * Simple search bar + results for a specific artist's store.
 * Filters by storeSlug automatically.
 */

import { useState, useCallback, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface ShopSearchProps {
  storeSlug: string;
  placeholder?: string;
  onProductSelect?: (product: Record<string, unknown>) => void;
}

export function ShopSearch({
  storeSlug,
  placeholder = 'Search this store...',
  onProductSelect,
}: ShopSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search/shop/${storeSlug}?q=${encodeURIComponent(query)}&limit=10`
      );
      if (!response.ok) return;

      const data = await response.json();
      setResults(data.results ?? []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [storeSlug, query]);

  useEffect(() => {
    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [performSearch]);

  return (
    <div className="relative w-full max-w-lg">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-500"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />}
        {query && (
          <Button onClick={() => { setQuery(''); setResults([]); setShowResults(false); }} size="sm" variant="ghost" className="h-6 w-6 p-0">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.map((product) => {
            const p = product as { id: string; name: string; mockupUrl?: string; retailPrice?: number; description?: string };
            return (
              <button
                key={p.id}
                onClick={() => {
                  onProductSelect?.(product);
                  setShowResults(false);
                }}
                className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 w-full text-left transition-colors"
              >
                {p.mockupUrl && (
                  <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden shrink-0">
                    <img src={p.mockupUrl} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{p.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{p.description}</p>
                </div>
                {p.retailPrice != null && (
                  <span className="text-sm text-zinc-300 shrink-0">
                    €{(p.retailPrice / 100).toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
