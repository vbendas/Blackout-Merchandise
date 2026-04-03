'use client';

import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

interface SmoothScrollProps {
  children: ReactNode;
  options?: {
    lerp?: number;
    duration?: number;
    smoothWheel?: boolean;
    touchMultiplier?: number;
    gestureOrientation?: 'vertical' | 'horizontal' | 'both';
    prevent?: (node: HTMLElement) => boolean;
  };
}

// Default conservative settings that won't interfere with native scrolling
const defaultOptions = {
  lerp: 0.05,
  duration: 0.8,
  smoothWheel: false, // Disabled to prevent keyboard/trackpad issues
  touchMultiplier: 1.0,
  gestureOrientation: 'vertical' as const,
  prevent: (node: HTMLElement) => {
    // Prevent smooth scroll on interactive elements and scrollable containers
    const tagName = node.tagName.toLowerCase();
    const hasOverflow = window.getComputedStyle(node).overflowY;
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      node.isContentEditable ||
      hasOverflow === 'auto' ||
      hasOverflow === 'scroll'
    );
  },
};

export function SmoothScroll({ children, options = {} }: SmoothScrollProps) {
  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <ReactLenis root options={mergedOptions}>
      {children}
    </ReactLenis>
  );
}
