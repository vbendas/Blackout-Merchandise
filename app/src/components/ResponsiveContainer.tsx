'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: ContainerSize;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-3xl', // 768px
  md: 'max-w-4xl', // 896px
  lg: 'max-w-6xl', // 1152px
  xl: 'max-w-7xl', // 1280px
  full: 'max-w-none',
};

const paddingClasses = 'px-4 sm:px-6 lg:px-8';

export function ResponsiveContainer({
  children,
  className,
  size = 'lg',
}: ResponsiveContainerProps): React.ReactElement {
  const classes = cn('w-full mx-auto', sizeClasses[size], paddingClasses, className);

  return <div className={classes}>{children}</div>;
}

// Specialized container components for common use cases
export function PageContainer({ children, className }: Omit<ResponsiveContainerProps, 'size'>): React.ReactElement {
  return (
    <ResponsiveContainer size="xl" className={className}>
      {children}
    </ResponsiveContainer>
  );
}

export function ContentContainer({ children, className }: Omit<ResponsiveContainerProps, 'size'>): React.ReactElement {
  return (
    <ResponsiveContainer size="lg" className={className}>
      {children}
    </ResponsiveContainer>
  );
}

export function NarrowContainer({ children, className }: Omit<ResponsiveContainerProps, 'size'>): React.ReactElement {
  return (
    <ResponsiveContainer size="sm" className={className}>
      {children}
    </ResponsiveContainer>
  );
}
