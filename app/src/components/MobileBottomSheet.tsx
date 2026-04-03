'use client';

import { motion, type PanInfo, useAnimation, useMotionValue } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SnapPoint = '25%' | '50%' | '75%' | '100%';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoint?: SnapPoint;
  title?: string;
  showHandle?: boolean;
  showBackdrop?: boolean;
  className?: string;
}

const SNAP_POINTS: Record<SnapPoint, number> = {
  '25%': 0.25,
  '50%': 0.5,
  '75%': 0.75,
  '100%': 1,
};

export function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  snapPoint = '75%',
  title,
  showHandle = true,
  showBackdrop = true,
  className = '',
}: MobileBottomSheetProps): React.ReactElement | null {
  const controls = useAnimation();
  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [windowHeight, setWindowHeight] = useState(0);

  // Calculate snap position based on window height
  const snapHeight = windowHeight * SNAP_POINTS[snapPoint];
  const dismissThreshold = windowHeight * 0.2; // Dismiss if dragged 20% down

  useEffect(() => {
    setWindowHeight(window.innerHeight);
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    } else {
      controls.start({ y: windowHeight });
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, controls, windowHeight]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      const currentY = y.get();

      // Close if dragged down past threshold or with significant velocity
      if (currentY > dismissThreshold || info.velocity.y > 500) {
        controls.start({ y: windowHeight }).then(() => {
          onClose();
        });
      } else {
        // Snap back to open position
        controls.start({ y: 0 });
      }
    },
    [controls, dismissThreshold, onClose, windowHeight, y]
  );

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Don't render if window height is not yet calculated
  if (windowHeight === 0) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 ${
            isOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          onClick={handleBackdropClick}
          aria-hidden={!isOpen}
        />
      )}

      {/* Bottom Sheet */}
      <motion.div
        ref={sheetRef}
        initial={{ y: windowHeight }}
        animate={controls}
        transition={{
          type: 'spring',
          damping: isDragging ? 20 : 30,
          stiffness: isDragging ? 300 : 400,
          mass: 0.8,
        }}
        style={{
          y,
          height: snapHeight,
          maxHeight: '100vh',
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: windowHeight }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl z-50 overflow-hidden shadow-2xl ${className}`}
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
      >
        {/* Handle Bar */}
        {showHandle && (
          <div
            className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none"
            aria-hidden="true"
          >
            <div className="w-10 h-1.5 bg-zinc-600 rounded-full" />
          </div>
        )}

        {/* Title (if provided) */}
        {title && (
          <div className="px-4 pb-3 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="h-full overflow-y-auto overscroll-contain scrollbar-hide">{children}</div>
      </motion.div>
    </>
  );
}

// Hook for using bottom sheet
export function useMobileBottomSheet() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default MobileBottomSheet;
