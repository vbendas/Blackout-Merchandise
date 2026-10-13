'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';

/** Wraps the whole app so every motion/react animation follows the visitor's
 * reduced-motion setting: transforms and layout animations are skipped,
 * opacity fades stay. CSS animations follow the same setting in
 * app/globals.css. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
