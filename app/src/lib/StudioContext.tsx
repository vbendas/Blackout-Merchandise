'use client';

/**
 * Simplified StudioContext for Chat-First Design
 *
 * This context now only manages design data (instances, transformations, color separation)
 * All UI interactions have moved to the chat interface.
 */

import type React from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Transformation } from '@/types/transformations';

// Types
export type PrintArea = 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'inner_tag';

export interface SeparatedColor {
  id: string;
  name: string;
  pantone: string;
  hex: string;
  inkType: string;
  visible: boolean;
}

export interface DesignInstance {
  id: string;
  name: string;
  designUrl: string;
  printArea: PrintArea;
  source: 'upload' | 'ai-generated';
  transformations: Transformation[];
  printReadyUrl?: string;
}

export interface StudioState {
  designInstances: DesignInstance[];
  separatedColors: SeparatedColor[];
  halftoneLPI: number;
  isApproved: boolean;
}

export interface StudioContextType extends StudioState {
  // Design instance management
  addDesignInstance: (instance: Omit<DesignInstance, 'id' | 'transformations'>) => void;
  removeDesignInstance: (id: string) => void;
  updateDesignInstance: (id: string, updates: Partial<DesignInstance>) => void;

  // Transformations
  addTransformation: (designId: string, transformation: Transformation) => void;
  removeLastTransformation: (designId: string) => void;
  clearTransformations: (designId: string) => void;

  // Color separation
  setSeparatedColors: (colors: SeparatedColor[]) => void;
  toggleColorVisibility: (colorId: string) => void;

  // Print settings
  setHalftoneLPI: (lpi: number) => void;
  setIsApproved: (approved: boolean) => void;
  setPrintReadyUrl: (designId: string, url: string) => void;

  // Reset
  clearStudio: () => void;
}

// Create context
export const StudioContext = createContext<StudioContextType | undefined>(undefined);

// Provider props
interface StudioProviderProps {
  children: React.ReactNode;
}

// Provider component
export function StudioProvider({ children }: StudioProviderProps): React.ReactElement {
  // State
  const [designInstances, setDesignInstances] = useState<DesignInstance[]>([]);
  const [separatedColors, setSeparatedColorsState] = useState<SeparatedColor[]>([]);
  const [halftoneLPI, setHalftoneLPIState] = useState<number>(55);
  const [isApproved, setIsApprovedState] = useState<boolean>(false);

  // Design instance management
  const addDesignInstance = useCallback((instance: Omit<DesignInstance, 'id' | 'transformations'>) => {
    const newInstance: DesignInstance = {
      ...instance,
      id: crypto.randomUUID(),
      transformations: [],
    };
    setDesignInstances((prev) => [...prev, newInstance]);
  }, []);

  const removeDesignInstance = useCallback((id: string) => {
    setDesignInstances((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateDesignInstance = useCallback((id: string, updates: Partial<DesignInstance>) => {
    setDesignInstances((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);

  // Transformations
  const addTransformation = useCallback((designId: string, transformation: Transformation) => {
    setDesignInstances((prev) =>
      prev.map((d) => (d.id === designId ? { ...d, transformations: [...d.transformations, transformation] } : d))
    );
  }, []);

  const removeLastTransformation = useCallback((designId: string) => {
    setDesignInstances((prev) =>
      prev.map((d) => (d.id === designId ? { ...d, transformations: d.transformations.slice(0, -1) } : d))
    );
  }, []);

  const clearTransformations = useCallback((designId: string) => {
    setDesignInstances((prev) => prev.map((d) => (d.id === designId ? { ...d, transformations: [] } : d)));
  }, []);

  // Color separation
  const setSeparatedColors = useCallback((colors: SeparatedColor[]) => {
    setSeparatedColorsState(colors);
  }, []);

  const toggleColorVisibility = useCallback((colorId: string) => {
    setSeparatedColorsState((prev) => prev.map((c) => (c.id === colorId ? { ...c, visible: !c.visible } : c)));
  }, []);

  // Print settings
  const setHalftoneLPI = useCallback((lpi: number) => {
    setHalftoneLPIState(lpi);
  }, []);

  const setIsApproved = useCallback((approved: boolean) => {
    setIsApprovedState(approved);
  }, []);

  const setPrintReadyUrl = useCallback((designId: string, url: string) => {
    setDesignInstances((prev) => prev.map((d) => (d.id === designId ? { ...d, printReadyUrl: url } : d)));
  }, []);

  // Reset
  const clearStudio = useCallback(() => {
    setDesignInstances([]);
    setSeparatedColorsState([]);
    setHalftoneLPIState(55);
    setIsApprovedState(false);
  }, []);

  // Context value
  const value = useMemo<StudioContextType>(
    () => ({
      designInstances,
      separatedColors,
      halftoneLPI,
      isApproved,
      addDesignInstance,
      removeDesignInstance,
      updateDesignInstance,
      addTransformation,
      removeLastTransformation,
      clearTransformations,
      setSeparatedColors,
      toggleColorVisibility,
      setHalftoneLPI,
      setIsApproved,
      setPrintReadyUrl,
      clearStudio,
    }),
    [
      designInstances,
      separatedColors,
      halftoneLPI,
      isApproved,
      addDesignInstance,
      removeDesignInstance,
      updateDesignInstance,
      addTransformation,
      removeLastTransformation,
      clearTransformations,
      setSeparatedColors,
      toggleColorVisibility,
      setHalftoneLPI,
      setIsApproved,
      setPrintReadyUrl,
      clearStudio,
    ]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

// Custom hook
export function useStudio(): StudioContextType {
  const context = useContext(StudioContext);

  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }

  return context;
}
