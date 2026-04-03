'use client';
import { useRef, useEffect, useState } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useAnimationFrame,
  useMotionValue,
  useInView,
} from 'motion/react';
import { wrap } from '@motionone/utils';
import { cn } from '@/lib/utils';

interface ParallaxProps {
  children: React.ReactNode;
  baseVelocity: number;
  clasname?: string;
  scrollDependent?: boolean; // Toggle scroll-dependent behavior
  delay?: number; // Delay before animation starts
  startOnVisible?: boolean; // Only start when component is visible
}

export default function ScrollBaseAnimation({
  children,
  baseVelocity = -5,
  clasname,
  scrollDependent = false, // Default to false
  delay = 0, // Default delay is 0 (no delay)
  startOnVisible = false, // Default to false (start immediately)
}: ParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], {
    clamp: false,
  });

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef<number>(1);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // If startOnVisible is true, wait for inView
    if (startOnVisible && !isInView) return;

    const timer = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, startOnVisible, isInView]);

  useAnimationFrame((t, delta) => {
    if (!hasStarted) return; // Skip if not started

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    // Reverse direction if scrollDependent is true
    if (scrollDependent) {
      if (velocityFactor.get() < 0) {
        directionFactor.current = -1;
      } else if (velocityFactor.get() > 0) {
        directionFactor.current = 1;
      }
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div ref={containerRef} className='overflow-hidden whitespace-nowrap flex flex-nowrap'>
      <motion.div
        className='flex whitespace-nowrap gap-10 flex-nowrap'
        style={{ x }}
      >
        <span className={cn(`block sm:text-[8vw] text-[11vw]`, clasname)}>
          {children}
        </span>
        <span className={cn(`block sm:text-[8vw] text-[11vw]`, clasname)}>
          {children}
        </span>
        <span className={cn(`block sm:text-[8vw] text-[11vw]`, clasname)}>
          {children}
        </span>
        <span className={cn(`block sm:text-[8vw] text-[11vw]`, clasname)}>
          {children}
        </span>
      </motion.div>
    </div>
  );
}
