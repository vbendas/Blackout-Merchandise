'use client';

import { motion } from 'framer-motion';
import type React from 'react';
import type { ReactNode } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useNavigation } from '@/lib/NavigationContext';

interface MainContentProps {
  children: ReactNode;
}

export function MainContent({ children }: MainContentProps): React.ReactElement {
  const { sidebarCollapsed } = useNavigation();
  const breakpoint = useBreakpoint();

  // Determine margin based on breakpoint and sidebar state
  // Layout Behavior Matrix:
  // Mobile (0-639px): No margin, sidebar is drawer
  // Tablet (640-1023px): 72px margin (collapsed sidebar)
  // Desktop (1024-1279px): 280px if expanded, 72px if collapsed
  // Large (1280px+): 280px if expanded, 72px if collapsed
  const getMarginClass = (): string => {
    switch (breakpoint) {
      case 'mobile':
        // Mobile: No margin, sidebar is drawer overlay
        return 'ml-0';
      case 'tablet':
        // Tablet: Always 72px margin (collapsed sidebar)
        return 'ml-[72px]';
      case 'desktop':
      case 'large':
        // Desktop/Large: 280px if expanded, 72px if collapsed
        return sidebarCollapsed ? 'ml-[72px]' : 'ml-[280px]';
      default:
        return 'ml-0';
    }
  };

  const marginClass = getMarginClass();

  return (
    <motion.main
      className={`flex-1 h-screen bg-background transition-all duration-300 ease-in-out ${marginClass}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full max-w-[1200px] mx-auto h-full">{children}</div>
    </motion.main>
  );
}

// Empty State Component
export function EmptyState({ children }: { children?: ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-100px)]">
      <div className="text-center max-w-2xl w-full">{children}</div>
    </div>
  );
}

// Active State Component
export function ActiveState({ children }: { children?: ReactNode }): React.ReactElement {
  return <div className="flex flex-col p-4 sm:p-6 lg:p-8">{children}</div>;
}

// Catalog State Component
export function CatalogState({ children }: { children?: ReactNode }): React.ReactElement {
  return <div className="flex flex-col p-4 sm:p-6 lg:p-8">{children}</div>;
}
