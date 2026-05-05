'use client';

import { useEffect, useState } from 'react';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

interface UseViewportSizeResult {
  viewportSize: ViewportSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  hasMounted: boolean;
}

/**
 * Hook to detect viewport size category with tablet support (landscape-only focus)
 * 
 * Breakpoints:
 * - mobile: < 768px
 * - tablet: 768px - 1024px (optimized for landscape)
 * - desktop: > 1024px
 * 
 * Returns hasMounted=false during SSR and initial render to allow consistent server/client output.
 */
export function useViewportSize(): UseViewportSizeResult {
  const [hasMounted, setHasMounted] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;
      
      // Landscape: aspect ratio > 1 (or close to 1 for tablets in portrait)
      // We focus on landscape optimization
      setIsLandscape(aspectRatio >= 1 || width > 768);
      
      if (width < 768) {
        setViewportSize('mobile');
      } else if (width <= 1024 || (width <= 1400 && aspectRatio < 1.6)) {
        setViewportSize('tablet');
      } else {
        setViewportSize('desktop');
      }
    };

    setHasMounted(true);
    checkViewport();

    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  return {
    viewportSize,
    isMobile: viewportSize === 'mobile',
    isTablet: viewportSize === 'tablet',
    isDesktop: viewportSize === 'desktop',
    isLandscape,
    hasMounted,
  };
}

/**
 * Legacy hook for backward compatibility - now uses useViewportSize internally
 * @deprecated Use useViewportSize instead
 */
export function useIsMobile(): { isMobile: boolean; hasMounted: boolean } {
  const { isMobile, hasMounted } = useViewportSize();
  return { isMobile, hasMounted };
}
