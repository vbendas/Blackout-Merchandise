'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';
import type { LightboxProduct } from './LightboxContext';

export interface PrintArea {
  id: string;
  name: string;
  label: string;
}

export interface ShowroomContextType {
  isOpen: boolean;
  products: LightboxProduct[];
  currentIndex: number;
  openShowroom: (products: LightboxProduct[], startIndex?: number) => void;
  closeShowroom: () => void;
  nextProduct: () => void;
  prevProduct: () => void;
  goToProduct: (index: number) => void;
  getCurrentProduct: () => LightboxProduct | null;
  getPrintAreasForProduct: (category?: string) => PrintArea[];
}

const defaultPrintAreas: PrintArea[] = [
  { id: 'front', name: 'front', label: 'Front' },
  { id: 'back', name: 'back', label: 'Back' },
  { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
  { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
];

const categoryPrintAreas: Record<string, PrintArea[]> = {
  'T-Shirts': [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
    { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
    { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
  ],
  Hoodies: [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
    { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
    { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
    { id: 'hood', name: 'hood', label: 'Hood' },
  ],
  Jackets: [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
    { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
    { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
  ],
  Accessories: [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
  ],
};

const ShowroomContext = createContext<ShowroomContextType | undefined>(undefined);

/**
 * Showroom Provider for Magazine-style Product Slideshow
 * Allows bulk selection of multiple products with different configurations
 */
export function ShowroomProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<LightboxProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openShowroom = useCallback((productList: LightboxProduct[], startIndex = 0) => {
    setProducts(productList);
    setCurrentIndex(startIndex);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeShowroom = useCallback(() => {
    setIsOpen(false);
    setProducts([]);
    setCurrentIndex(0);
    document.body.style.overflow = 'unset';
  }, []);

  const nextProduct = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  }, [products.length]);

  const prevProduct = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  }, [products.length]);

  const goToProduct = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, products.length - 1)));
    },
    [products.length]
  );

  const getCurrentProduct = useCallback(() => {
    return products[currentIndex] || null;
  }, [products, currentIndex]);

  const getPrintAreasForProduct = useCallback((category?: string) => {
    if (category && categoryPrintAreas[category]) {
      return categoryPrintAreas[category];
    }
    return defaultPrintAreas;
  }, []);

  const value: ShowroomContextType = {
    isOpen,
    products,
    currentIndex,
    openShowroom,
    closeShowroom,
    nextProduct,
    prevProduct,
    goToProduct,
    getCurrentProduct,
    getPrintAreasForProduct,
  };

  return <ShowroomContext.Provider value={value}>{children}</ShowroomContext.Provider>;
}

/**
 * Hook to use Showroom context
 */
export function useShowroom(): ShowroomContextType {
  const context = useContext(ShowroomContext);
  if (context === undefined) {
    throw new Error('useShowroom must be used within ShowroomProvider');
  }
  return context;
}
