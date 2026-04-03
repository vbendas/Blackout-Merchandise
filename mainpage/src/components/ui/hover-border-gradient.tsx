'use client';

import { motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Direction = 'TOP' | 'LEFT' | 'BOTTOM' | 'RIGHT';

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = 'button',
  duration = 1,
  clockwise = true,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>('TOP');

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ['TOP', 'LEFT', 'BOTTOM', 'RIGHT'];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = clockwise
      ? (currentIndex - 1 + directions.length) % directions.length
      : (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  // Metallic silver/chrome gradient colors - brighter and wider spread
  const movingMap: Record<Direction, string> = {
    TOP: 'radial-gradient(40% 80% at 50% 0%, #FFFFFF 0%, #C0C0C0 40%, rgba(192, 192, 192, 0) 100%)',
    LEFT: 'radial-gradient(30% 60% at 0% 50%, #FFFFFF 0%, #C0C0C0 40%, rgba(192, 192, 192, 0) 100%)',
    BOTTOM: 'radial-gradient(40% 80% at 50% 100%, #FFFFFF 0%, #C0C0C0 40%, rgba(192, 192, 192, 0) 100%)',
    RIGHT: 'radial-gradient(30% 60% at 100% 50%, #FFFFFF 0%, #C0C0C0 40%, rgba(192, 192, 192, 0) 100%)',
  };

  const highlight = 'radial-gradient(75% 181.15% at 50% 50%, #FFFFFF 0%, #C0C0C0 50%, rgba(192, 192, 192, 0) 100%)';

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => {
        setDirection((prevState) => rotateDirection(prevState));
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [hovered, duration, clockwise]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex rounded-full content-center bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700 hover:from-zinc-600 hover:via-zinc-300 hover:to-zinc-600 transition duration-500 items-center flex-col flex-nowrap gap-10 h-min justify-center overflow-visible p-[3px] decoration-clone w-fit',
        containerClassName
      )}
      {...props}
    >
      <div className={cn('w-auto text-white z-10 bg-black px-6 py-3 rounded-[inherit]', className)}>{children}</div>
      <motion.div
        className={cn('flex-none inset-0 overflow-hidden absolute z-0 rounded-[inherit]')}
        style={{
          filter: 'blur(4px)',
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered ? [movingMap[direction], highlight] : movingMap[direction],
        }}
        transition={{ ease: 'linear', duration: duration ?? 1 }}
      />
      {/* Removed inner overlay - using gradient background on container instead */}
    </Tag>
  );
}
