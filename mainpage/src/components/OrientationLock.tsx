'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function OrientationLock() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isWrongOrientation, setIsWrongOrientation] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;

      // Device classification based on viewport dimensions and aspect ratio
      //
      // MOBILE PHONES (block horizontal orientation):
      // - Regular phones: < 768px width
      // - Foldable phones (folded): 768-1024px with aspect ratio > 1.4
      //   Examples: Folded iPhone (expected ~6.7" display)
      //
      // TABLETS (block vertical orientation):
      // - Regular tablets: 768-1024px with aspect ratio 1.0-1.4
      // - Foldable phones (unfolded): > 1024px width
      //   Examples: Unfolded iPhone (expected ~7.6"-10.2" display)
      //
      // DESKTOP (no restrictions):
      // - > 1024px width with aspect ratio < 1.4
      //
      // Common mobile landscape aspect ratios:
      // - iPhone 15 Pro Max: 932x430 = 2.17
      // - iPhone 15 Pro: 852x393 = 2.17
      // - iPhone 14/13/12: 844x390 = 2.16
      // - Samsung S23: 800x360 = 2.22
      // - Foldable (folded): ~900x400-500 = 1.8-2.25
      //
      // Common tablet landscape aspect ratios:
      // - iPad Pro 12.9": 1024x1366 = 0.75 (portrait) / 1366x1024 = 1.33 (landscape)
      // - iPad Pro 11": 834x1194 = 0.70 (portrait) / 1194x834 = 1.43 (landscape)
      // - iPad Air: 820x1180 = 0.69 (portrait) / 1180x820 = 1.44 (landscape)
      // - iPad 10.2": 810x1080 = 0.75 (portrait) / 1080x810 = 1.33 (landscape)
      // - Foldable (unfolded): ~1000x700-800 = 1.25-1.43

      if (width < 768) {
        // Regular mobile phone
        setIsMobile(true);
        setIsTablet(false);
      } else if (width >= 768 && width <= 1024) {
        // Could be folded foldable or tablet
        // Foldable folded: aspect ratio > 1.4 (tall screen)
        // Tablet: aspect ratio ~1.0-1.4 (more square)
        if (aspectRatio > 1.4) {
          // Foldable phone (folded) - treat as mobile
          setIsMobile(true);
          setIsTablet(false);
        } else {
          // Regular tablet
          setIsMobile(false);
          setIsTablet(true);
        }
      } else if (width > 1024 && width <= 1400) {
        // Could be unfolded foldable or tablet
        // Foldable unfolded: aspect ratio ~1.0-1.4 (more square)
        // Desktop: aspect ratio < 1.4
        if (aspectRatio > 1.4) {
          // Unusual - likely a very wide unfolded foldable
          setIsMobile(false);
          setIsTablet(false);
        } else {
          // Unfolded foldable or tablet - allow both orientations
          setIsMobile(false);
          setIsTablet(false);
        }
      } else {
        // Desktop (> 1400px) - no restrictions
        setIsMobile(false);
        setIsTablet(false);
      }
    };

    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;

      if (!hasMounted) return;

      // Mobile: block horizontal (aspect ratio > 1)
      if (isMobile) {
        setIsWrongOrientation(aspectRatio > 1);
      }
      // Tablet: block vertical (aspect ratio < 1)
      else if (isTablet) {
        setIsWrongOrientation(aspectRatio < 1);
      }
      // Desktop/Unfolded foldable: always allow
      else {
        setIsWrongOrientation(false);
      }
    };

    checkDevice();
    checkOrientation();

    window.addEventListener('resize', checkDevice);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [hasMounted, isMobile, isTablet]);

  if (!hasMounted) return null;

  return (
    <AnimatePresence>
      {isWrongOrientation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-8"
        >
          <div className="text-center max-w-md">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mb-6"
            >
              {isMobile ? (
                // Mobile rotate icon (horizontal)
                <svg
                  className="w-20 h-20 mx-auto text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                // Tablet rotate icon (vertical)
                <svg
                  className="w-20 h-20 mx-auto text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 18h.01M8 21h8a2 2 0 002-2v-5a2 2 0 00-2-2H8a2 2 0 00-2 2v5a2 2 0 002 2zm0 0V5a2 2 0 012-2h4a2 2 0 012 2v14"
                  />
                </svg>
              )}
            </motion.div>

            {/* Message */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-white mb-3"
            >
              {isMobile ? 'Rotate Your Device' : 'Rotate Your Tablet'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-zinc-400 text-lg leading-relaxed"
            >
              {isMobile
                ? 'This experience is optimized for vertical orientation. Please rotate your phone to portrait mode.'
                : 'This experience is optimized for horizontal orientation. Please rotate your tablet to landscape mode.'}
            </motion.p>

            {/* Device hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-sm text-zinc-600"
            >
              {isMobile ? '📱 → 📱' : '📱 → 📱'}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
