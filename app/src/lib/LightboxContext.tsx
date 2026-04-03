'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

export interface LightboxProduct {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrls: string[];
  colors?: Array<{ name: string; hex: string; available: boolean }>;
  sizes?: Array<{ size: string; minQuantity: number }>;
  specs?: Record<string, string>;
  baseCost?: number;
  suggestedRetail?: number;
  sustainabilityBadges?: string[];
}

export interface LightboxContextType {
  isOpen: boolean;
  selectedProduct: LightboxProduct | null;
  selectedImageIndex: number;
  viewMode: 'grid' | 'slider';
  openLightbox: (product: LightboxProduct, imageIndex?: number) => void;
  closeLightbox: () => void;
  setSelectedImageIndex: (index: number) => void;
  setViewMode: (mode: 'grid' | 'slider') => void;
}

const LightboxContext = createContext<LightboxContextType | undefined>(undefined);

/**
 * Lightbox Provider for Catalog
 * Manages state for product detail lightbox
 * Part of Phase 3.5.5-3.5.7
 */
export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LightboxProduct | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'slider'>('grid');

  const openLightbox = useCallback((product: LightboxProduct, imageIndex = 0) => {
    setSelectedProduct(product);
    setSelectedImageIndex(imageIndex);
    setIsOpen(true);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
    setSelectedProduct(null);
    setSelectedImageIndex(0);
    // Restore body scroll
    document.body.style.overflow = 'unset';
  }, []);

  const value: LightboxContextType = {
    isOpen,
    selectedProduct,
    selectedImageIndex,
    viewMode,
    openLightbox,
    closeLightbox,
    setSelectedImageIndex,
    setViewMode,
  };

  return <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>;
}

/**
 * Hook to use Lightbox context
 */
export function useLightbox(): LightboxContextType {
  const context = useContext(LightboxContext);
  if (context === undefined) {
    throw new Error('useLightbox must be used within LightboxProvider');
  }
  return context;
}
