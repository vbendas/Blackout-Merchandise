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
export type GarmentView = 'front' | 'back' | 'left' | 'right' | 'detail';

export interface GarmentEntry {
  sku: string;
  productType: string;
  colorCode: string;
  colorName: string;
  colorHex: string;
  view: string;
  imagePath: string;
}

export interface DesignPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

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
  // Garment state
  selectedGarment: GarmentEntry | null;
  garmentColor: string;
  activeView: GarmentView;
  activePlacement: PrintArea;
  designPosition: DesignPosition;
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

  // Garment state
  setSelectedGarment: (garment: GarmentEntry | null) => void;
  setGarmentColor: (color: string) => void;
  setActiveView: (view: GarmentView) => void;
  setActivePlacement: (placement: PrintArea) => void;
  setDesignPosition: (position: DesignPosition | ((prev: DesignPosition) => DesignPosition)) => void;

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
  // Garment state
  const [selectedGarment, setSelectedGarment] = useState<GarmentEntry | null>(null);
  const [garmentColor, setGarmentColor] = useState<string>('');
  const [activeView, setActiveView] = useState<GarmentView>('front');
  const [activePlacement, setActivePlacement] = useState<PrintArea>('front');
  const [designPosition, setDesignPosition] = useState<DesignPosition>({ x: 0, y: 0, scale: 1, rotation: 0 });

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

  // Garment state actions
  const handleSetSelectedGarment = useCallback((garment: GarmentEntry | null) => {
    setSelectedGarment(garment);
    if (garment) {
      setGarmentColor(garment.colorHex);
    }
  }, []);

  const handleSetGarmentColor = useCallback((color: string) => {
    setGarmentColor(color);
  }, []);

  const handleSetActiveView = useCallback((view: GarmentView) => {
    setActiveView(view);
  }, []);

  const handleSetActivePlacement = useCallback((placement: PrintArea) => {
    setActivePlacement(placement);
  }, []);

  const handleSetDesignPosition = useCallback(
    (position: DesignPosition | ((prev: DesignPosition) => DesignPosition)) => {
      setDesignPosition(position);
    },
    []
  );

  // Reset
  const clearStudio = useCallback(() => {
    setDesignInstances([]);
    setSeparatedColorsState([]);
    setHalftoneLPIState(55);
    setIsApprovedState(false);
    setSelectedGarment(null);
    setGarmentColor('');
    setActiveView('front');
    setActivePlacement('front');
    setDesignPosition({ x: 0, y: 0, scale: 1, rotation: 0 });
  }, []);

  // Context value
  const value = useMemo<StudioContextType>(
    () => ({
      designInstances,
      separatedColors,
      halftoneLPI,
      isApproved,
      selectedGarment,
      garmentColor,
      activeView,
      activePlacement,
      designPosition,
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
      setSelectedGarment: handleSetSelectedGarment,
      setGarmentColor: handleSetGarmentColor,
      setActiveView: handleSetActiveView,
      setActivePlacement: handleSetActivePlacement,
      setDesignPosition: handleSetDesignPosition,
      clearStudio,
    }),
    [
      designInstances,
      separatedColors,
      halftoneLPI,
      isApproved,
      selectedGarment,
      garmentColor,
      activeView,
      activePlacement,
      designPosition,
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
      handleSetSelectedGarment,
      handleSetGarmentColor,
      handleSetActiveView,
      handleSetActivePlacement,
      handleSetDesignPosition,
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
