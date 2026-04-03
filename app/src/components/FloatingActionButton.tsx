'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: string;
  label?: string;
  ariaLabel: string;
  className?: string;
  showOnScroll?: boolean;
  scrollThreshold?: number;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

export function FloatingActionButton({
  onClick,
  icon = 'lucide:plus',
  label,
  ariaLabel,
  className = '',
  showOnScroll = false,
  scrollThreshold = 100,
  position = 'bottom-right',
}: FloatingActionButtonProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(!showOnScroll);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track scroll position
  useEffect(() => {
    if (!showOnScroll) return;

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setIsVisible(currentScroll > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showOnScroll, scrollThreshold]);

  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  // Position classes
  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-center': 'left-1/2 -translate-x-1/2',
    'bottom-left': 'left-4',
  };

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isVisible ? 1 : 0,
        opacity: isVisible ? 1 : 0,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
      onClick={handleClick}
      className={`
        fixed bottom-6 ${positionClasses[position]}
        z-40
        w-14 h-14
        bg-zinc-100 hover:bg-white
        text-zinc-900
        rounded-full
        shadow-lg shadow-zinc-950/50
        flex items-center justify-center
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900
        active:bg-zinc-200
        touch-manipulation
        ${className}
      `}
      style={{
        // Ensure minimum touch target size
        minWidth: '56px',
        minHeight: '56px',
      }}
      aria-label={ariaLabel}
      type="button"
    >
      <Icon icon={icon} className="w-6 h-6" aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </motion.button>
  );
}

// Extended FAB with multiple actions (Speed Dial pattern)
interface SpeedDialAction {
  icon: string;
  label: string;
  onClick: () => void;
  color?: string;
}

interface SpeedDialProps {
  actions: SpeedDialAction[];
  mainIcon?: string;
  mainLabel?: string;
  ariaLabel: string;
  className?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

export function SpeedDial({
  actions,
  mainIcon = 'lucide:plus',
  mainLabel = 'Open menu',
  ariaLabel,
  className = '',
  position = 'bottom-right',
}: SpeedDialProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleActionClick = useCallback((action: SpeedDialAction) => {
    action.onClick();
    setIsOpen(false);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-speed-dial]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-center': 'left-1/2 -translate-x-1/2',
    'bottom-left': 'left-4',
  };

  if (!isMobile) {
    return null;
  }

  return (
    <div data-speed-dial className={`fixed bottom-6 ${positionClasses[position]} z-40`}>
      {/* Action Buttons */}
      <div className="flex flex-col-reverse items-center gap-3 mb-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{
              scale: isOpen ? 1 : 0,
              opacity: isOpen ? 1 : 0,
              y: isOpen ? 0 : 20,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: index * 0.05,
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleActionClick(action)}
            className={`
              w-12 h-12
              bg-zinc-800 hover:bg-zinc-700
              text-zinc-100
              rounded-full
              shadow-lg
              flex items-center justify-center
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-zinc-500
              touch-manipulation
              ${className}
            `}
            style={{
              minWidth: '48px',
              minHeight: '48px',
              backgroundColor: action.color,
            }}
            aria-label={action.label}
            type="button"
          >
            <Icon icon={action.icon} className="w-5 h-5" aria-hidden="true" />
          </motion.button>
        ))}
      </div>

      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        onClick={toggleOpen}
        className={`
          w-14 h-14
          bg-zinc-100 hover:bg-white
          text-zinc-900
          rounded-full
          shadow-lg shadow-zinc-950/50
          flex items-center justify-center
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900
          active:bg-zinc-200
          touch-manipulation
          ${className}
        `}
        style={{
          minWidth: '56px',
          minHeight: '56px',
        }}
        aria-label={isOpen ? 'Close menu' : ariaLabel}
        aria-expanded={isOpen}
        type="button"
      >
        <Icon icon={mainIcon} className="w-6 h-6" aria-hidden="true" />
        <span className="sr-only">{mainLabel}</span>
      </motion.button>
    </div>
  );
}

export default FloatingActionButton;
