'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadProductList, saveProductList } from './sessionPersistence';

export interface ProductListItem {
  productId: string;
  productName: string;
  category?: string;
  selectedColors: { name: string; hex: string }[]; // multi-select colors
  selectedSizes: string[]; // multi-select
  selectedPrintAreas: string[]; // multi-select
  baseCost: number;
  suggestedRetail: number;
  addedAt: Date;
  source: 'individual' | 'showroom'; // tracks origin for Francisca
}

export interface ProductListContextType {
  items: ProductListItem[];
  totalItems: number;
  addToList: (item: ProductListItem) => void;
  removeFromList: (productId: string) => void;
  updateItem: (productId: string, item: Partial<ProductListItem>) => void;
  clearList: () => void;
  getTotalCost: () => number;
  hasProducts: () => boolean;
  // Callback system for product added events
  registerProductAddedCallback: (callback: () => void) => void;
  unregisterProductAddedCallback: () => void;
}

const ProductListContext = createContext<ProductListContextType | undefined>(undefined);

/**
 * Product List Context
 * Manages products added to the customer's list for bulk design/ordering
 * Replaces the previous QuoteContext with enhanced multi-select support
 * Includes localStorage persistence with auto-save
 */
export function ProductListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [productAddedCallback, setProductAddedCallback] = useState<(() => void) | undefined>();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadProductList();
    if (saved) {
      setItems(saved);
    }
    setIsLoaded(true);
  }, []);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (!isLoaded) return;

    const timeoutId = setTimeout(() => {
      saveProductList(items);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [items, isLoaded]);

  const addToList = useCallback(
    (item: ProductListItem) => {
      setItems((prev) => {
        // Check if item with same productId already exists
        const existingIndex = prev.findIndex((p) => p.productId === item.productId);

        if (existingIndex >= 0) {
          // Replace existing item (since sizes are multi-select, we replace rather than increment)
          const updated = [...prev];
          updated[existingIndex] = item;
          return updated;
        }

        // Add new item
        return [...prev, item];
      });

      // Fire callback after adding product
      productAddedCallback?.();
    },
    [productAddedCallback]
  );

  const removeFromList = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateItem = useCallback((productId: string, updates: Partial<ProductListItem>) => {
    setItems((prev) => prev.map((item) => (item.productId === productId ? { ...item, ...updates } : item)));
  }, []);

  const clearList = useCallback(() => {
    setItems([]);
  }, []);

  const getTotalCost = useCallback(() => {
    return items.reduce((total, item) => {
      // Calculate cost based on number of sizes selected
      return total + item.baseCost * item.selectedSizes.length;
    }, 0);
  }, [items]);

  const hasProducts = useCallback(() => {
    return items.length > 0;
  }, [items.length]);

  const registerProductAddedCallback = useCallback((callback: () => void) => {
    setProductAddedCallback(() => callback);
  }, []);

  const unregisterProductAddedCallback = useCallback(() => {
    setProductAddedCallback(undefined);
  }, []);

  const value: ProductListContextType = {
    items,
    totalItems: items.length,
    addToList,
    removeFromList,
    updateItem,
    clearList,
    getTotalCost,
    hasProducts,
    registerProductAddedCallback,
    unregisterProductAddedCallback,
  };

  return <ProductListContext.Provider value={value}>{children}</ProductListContext.Provider>;
}

/**
 * Hook to use Product List context
 */
export function useProductList(): ProductListContextType {
  const context = useContext(ProductListContext);
  if (!context) {
    throw new Error('useProductList must be used within a ProductListProvider');
  }
  return context;
}
