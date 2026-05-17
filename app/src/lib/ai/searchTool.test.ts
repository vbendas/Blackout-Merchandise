/**
 * Tests for searchTool.ts — detectSearchIntent and formatSearchResultsForPrompt.
 *
 * These are pure functions with no external dependencies, making them
 * ideal for fast unit tests.
 */

import { describe, it, expect } from 'bun:test';
import { detectSearchIntent, formatSearchResultsForPrompt, type ProductSearchResult } from '@/lib/ai/searchTool';

// ─── detectSearchIntent ──────────────────────────────────────────────────────

describe('detectSearchIntent', () => {
  it('detects "show me" action phrase', () => {
    const result = detectSearchIntent('show me hoodies');
    expect(result.hasSearchIntent).toBe(true);
    expect(result.query).toContain('hoodie');
    expect(result.filters.category).toBe('Hoodies');
  });

  it('detects "find" action phrase', () => {
    const result = detectSearchIntent('find organic t-shirts');
    expect(result.hasSearchIntent).toBe(true);
    expect(result.filters.category).toBe('T-Shirts');
    expect(result.filters.material).toBe('Organic Cotton');
  });

  it('detects catalog browse intent', () => {
    const result = detectSearchIntent('show me the catalog');
    expect(result.hasSearchIntent).toBe(true);
    expect(result.query).toBe('*');
  });

  it('detects product keyword without action phrase', () => {
    const result = detectSearchIntent('I need a hoodie');
    expect(result.hasSearchIntent).toBe(true);
  });

  it('extracts price filter from "under €X"', () => {
    const result = detectSearchIntent('show me t-shirts under €30');
    expect(result.filters.maxPrice).toBe(3000); // cents
  });

  it('extracts price filter from "below X"', () => {
    const result = detectSearchIntent('find hoodies below 50');
    expect(result.filters.maxPrice).toBe(5000);
  });

  it('extracts brand filter', () => {
    const result = detectSearchIntent('show me stanley stella products');
    expect(result.filters.brand).toBe('Stanley/Stella');
  });

  it('extracts material filter', () => {
    const result = detectSearchIntent('find organic cotton shirts');
    expect(result.filters.material).toBe('Organic Cotton');
  });

  it('returns no intent for non-search messages', () => {
    const result = detectSearchIntent('hello, how are you?');
    expect(result.hasSearchIntent).toBe(false);
    expect(result.query).toBe('hello, how are you?');
  });

  it('handles "i want" action phrase', () => {
    const result = detectSearchIntent('i want a t-shirt');
    expect(result.hasSearchIntent).toBe(true);
  });

  it('handles "give me" action phrase', () => {
    const result = detectSearchIntent('give me some hoodies');
    expect(result.hasSearchIntent).toBe(true);
  });

  it('handles "can you show" action phrase', () => {
    const result = detectSearchIntent('can you show me products');
    expect(result.hasSearchIntent).toBe(true);
  });

  it('handles "do you have" action phrase', () => {
    const result = detectSearchIntent('do you have mugs');
    expect(result.hasSearchIntent).toBe(true);
  });

  it('preserves product keywords in query', () => {
    const result = detectSearchIntent('show me organic t-shirts under €20');
    expect(result.query).toBeTruthy();
    expect(result.query.length).toBeGreaterThan(0);
    expect(result.filters.category).toBe('T-Shirts');
    expect(result.filters.material).toBe('Organic Cotton');
    expect(result.filters.maxPrice).toBe(2000);
  });

  it('handles empty string', () => {
    const result = detectSearchIntent('');
    expect(result.hasSearchIntent).toBe(false);
  });

  it('handles case insensitivity', () => {
    const result = detectSearchIntent('SHOW ME HOODIES');
    expect(result.hasSearchIntent).toBe(true);
    expect(result.filters.category).toBe('Hoodies');
  });
});

// ─── formatSearchResultsForPrompt ────────────────────────────────────────────

describe('formatSearchResultsForPrompt', () => {
  const mockResults: ProductSearchResult[] = [
    {
      id: '1',
      name: 'Premium Hoodie',
      description: 'Heavyweight organic cotton hoodie',
      price: 2800,
      displayPrice: '€28.00',
      imageUrl: 'https://example.com/hoodie.jpg',
      brand: 'Stanley/Stella',
      category: 'Hoodies',
      relevance: 100,
    },
    {
      id: '2',
      name: 'Organic T-Shirt',
      description: '',
      price: 1200,
      displayPrice: '€12.00',
      imageUrl: null,
      brand: 'Stanley/Stella',
      category: 'T-Shirts',
      relevance: 90,
    },
  ];

  it('returns empty string for no results', () => {
    expect(formatSearchResultsForPrompt([])).toBe('');
  });

  it('formats results with name, brand, and price', () => {
    const output = formatSearchResultsForPrompt(mockResults);
    expect(output).toContain('Premium Hoodie');
    expect(output).toContain('(Stanley/Stella)');
    expect(output).toContain('€28.00');
    expect(output).toContain('Organic T-Shirt');
    expect(output).toContain('€12.00');
  });

  it('includes description snippet', () => {
    const output = formatSearchResultsForPrompt(mockResults);
    expect(output).toContain('Heavyweight organic cotton hoodie');
  });

  it('truncates long descriptions', () => {
    const longDesc: ProductSearchResult = {
      id: '3',
      name: 'Long Description Product',
      description: 'A'.repeat(200),
      price: 1000,
      displayPrice: '€10.00',
      imageUrl: null,
      relevance: 80,
    };
    const output = formatSearchResultsForPrompt([longDesc]);
    expect(output).toContain('...');
    expect(output.length).toBeLessThan(300);
  });

  it('handles results without brand', () => {
    const noBrand: ProductSearchResult = {
      id: '4',
      name: 'No Brand Product',
      description: '',
      price: 500,
      displayPrice: '€5.00',
      imageUrl: null,
      relevance: 70,
    };
    const output = formatSearchResultsForPrompt([noBrand]);
    expect(output).toContain('No Brand Product');
    expect(output).not.toContain('()');
  });

  it('includes result count header', () => {
    const output = formatSearchResultsForPrompt(mockResults);
    expect(output).toContain('2 relevant products');
  });
});
