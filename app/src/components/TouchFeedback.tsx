'use client';

import { motion, useAnimation } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TouchFeedbackProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  disabled?: boolean;
  ripple?: boolean;
  rippleColor?: string;
  onClick?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function TouchFeedback({
  children,
  className = '',
  scale = 0.96,
  disabled = false,
  ripple = true,
  rippleColor = 'rgba(255, 255, 255, 0.2)',
  onClick,
  onTouchStart,
  onTouchEnd,
}: TouchFeedbackProps): React.ReactElement {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdCounter = useRef(0);

  const handleTouchStart = useCallback(
    async (e: React.TouchEvent | React.MouseEvent) => {
      if (disabled) return;

      // Add ripple effect
      if (ripple && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const newRipple: Ripple = {
          id: rippleIdCounter.current++,
          x,
          y,
        };

        setRipples((prev) => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);
      }

      // Scale down animation
      await controls.start({
        scale,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 30,
          duration: 0.1,
        },
      });

      onTouchStart?.();
    },
    [controls, disabled, onTouchStart, ripple, scale]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled) return;

    // Scale back animation
    await controls.start({
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        duration: 0.2,
      },
    });

    onTouchEnd?.();
  }, [controls, disabled, onTouchEnd]);

  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  return (
    <motion.div
      ref={containerRef}
      animate={controls}
      initial={{ scale: 1 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onClick={handleClick}
      className={`
        relative overflow-hidden
        touch-manipulation
        select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}

      {/* Ripple Effects */}
      {ripple &&
        ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full pointer-events-none animate-ripple"
            style={{
              left: r.x,
              top: r.y,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
              backgroundColor: rippleColor,
              transform: 'scale(0)',
              animation: 'ripple-effect 0.6s ease-out',
            }}
          />
        ))}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ripple-effect {
              to {
                transform: scale(40);
                opacity: 0;
              }
            }
          `,
        }}
      />
    </motion.div>
  );
}

// Hook for detecting touch devices
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-expect-error - msMaxTouchPoints is for IE
          navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
    return () => window.removeEventListener('touchstart', checkTouch);
  }, []);

  return isTouch;
}

// Hook for detecting reduced motion preference
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

// Touch-optimized button wrapper
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  scale?: number;
  ripple?: boolean;
}

export function TouchButton({
  children,
  scale = 0.96,
  className = '',
  disabled,
  onClick,
  ...props
}: TouchButtonProps): React.ReactElement {
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleTouchStart = useCallback(() => {
    if (!disabled) {
      setIsPressed(true);
    }
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  return (
    <button
      ref={buttonRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden
        touch-manipulation
        select-none
        transition-transform duration-150 ease-out
        ${isPressed ? `scale-[${scale.toString().replace('.', '')}]` : 'scale-100'}
        ${className}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        minHeight: '44px', // Minimum touch target size
        minWidth: '44px',
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default TouchFeedback;
