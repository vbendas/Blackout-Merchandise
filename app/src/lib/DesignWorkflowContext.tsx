'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';
import type { ProductListItem } from './ProductListContext';

export type DesignWorkflowStatus = 'pending' | 'designing' | 'review' | 'completed';

export interface DesignWorkflow {
  isActive: boolean;
  items: ProductListItem[];
  source: 'individual' | 'showroom'; // showroom = same design for all
  currentItemIndex: number;
  status: DesignWorkflowStatus;
}

export interface DesignWorkflowContextType {
  workflow: DesignWorkflow;
  startDesignProcess: (items: ProductListItem[], source: 'individual' | 'showroom') => void;
  nextItem: () => void;
  prevItem: () => void;
  completeItem: () => void;
  finishWorkflow: () => void;
  cancelWorkflow: () => void;
  getCurrentItem: () => ProductListItem | null;
  isLastItem: () => boolean;
}

const defaultWorkflow: DesignWorkflow = {
  isActive: false,
  items: [],
  source: 'individual',
  currentItemIndex: 0,
  status: 'pending',
};

const DesignWorkflowContext = createContext<DesignWorkflowContextType | undefined>(undefined);

/**
 * Design Workflow Context
 * Manages the design creation process with Francisca
 * Tracks which products need designs and current progress
 */
export function DesignWorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflow, setWorkflow] = useState<DesignWorkflow>(defaultWorkflow);

  const startDesignProcess = useCallback((items: ProductListItem[], source: 'individual' | 'showroom') => {
    setWorkflow({
      isActive: true,
      items: [...items],
      source,
      currentItemIndex: 0,
      status: 'designing',
    });
  }, []);

  const nextItem = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      currentItemIndex: Math.min(prev.currentItemIndex + 1, prev.items.length - 1),
    }));
  }, []);

  const prevItem = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      currentItemIndex: Math.max(prev.currentItemIndex - 1, 0),
    }));
  }, []);

  const completeItem = useCallback(() => {
    setWorkflow((prev) => {
      const isLast = prev.currentItemIndex >= prev.items.length - 1;
      return {
        ...prev,
        currentItemIndex: isLast ? prev.currentItemIndex : prev.currentItemIndex + 1,
        status: isLast ? 'review' : prev.status,
      };
    });
  }, []);

  const finishWorkflow = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      status: 'completed',
      isActive: false,
    }));
  }, []);

  const cancelWorkflow = useCallback(() => {
    setWorkflow(defaultWorkflow);
  }, []);

  const getCurrentItem = useCallback(() => {
    return workflow.items[workflow.currentItemIndex] || null;
  }, [workflow.items, workflow.currentItemIndex]);

  const isLastItem = useCallback(() => {
    return workflow.currentItemIndex >= workflow.items.length - 1;
  }, [workflow.currentItemIndex, workflow.items.length]);

  const value: DesignWorkflowContextType = {
    workflow,
    startDesignProcess,
    nextItem,
    prevItem,
    completeItem,
    finishWorkflow,
    cancelWorkflow,
    getCurrentItem,
    isLastItem,
  };

  return <DesignWorkflowContext.Provider value={value}>{children}</DesignWorkflowContext.Provider>;
}

/**
 * Hook to use Design Workflow context
 */
export function useDesignWorkflow(): DesignWorkflowContextType {
  const context = useContext(DesignWorkflowContext);
  if (!context) {
    throw new Error('useDesignWorkflow must be used within a DesignWorkflowProvider');
  }
  return context;
}
