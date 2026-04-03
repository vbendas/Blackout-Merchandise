'use client';

import { useSyncExternalStore } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'large';

interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  large: number;
}

const breakpoints: BreakpointConfig = {
  mobile: 0,
  tablet: 640, // sm
  desktop: 1024, // lg
  large: 1280, // xl
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints.large) return 'large';
  if (width >= breakpoints.desktop) return 'desktop';
  if (width >= breakpoints.tablet) return 'tablet';
  return 'mobile';
}

// SSR-safe breakpoint detection using useSyncExternalStore
function subscribe(callback: () => void): () => void {
  let timeout: NodeJS.Timeout | null = null;

  const debouncedCallback = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(callback, 150);
  };

  window.addEventListener('resize', debouncedCallback);
  window.addEventListener('orientationchange', debouncedCallback);

  return () => {
    window.removeEventListener('resize', debouncedCallback);
    window.removeEventListener('orientationchange', debouncedCallback);
    if (timeout) clearTimeout(timeout);
  };
}

function getSnapshot(): Breakpoint {
  return getBreakpoint(window.innerWidth);
}

function getServerSnapshot(): Breakpoint {
  // Default to 'desktop' for SSR safety
  return 'desktop';
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'mobile';
}

export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'tablet';
}

export function useIsDesktop(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'desktop' || breakpoint === 'large';
}

export function useIsLarge(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'large';
}
