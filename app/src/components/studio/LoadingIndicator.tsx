'use client';

import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  message?: string;
  details?: string;
  progress?: number; // 0-100, if provided shows progress bar
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated loading indicator with optional message and progress
 * Used when generating designs or other async operations
 */
export function LoadingIndicator({
  message = 'Loading...',
  details,
  progress,
  className,
  size = 'md',
}: LoadingIndicatorProps) {
  const spinnerSize = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size];

  const detailsSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      {/* Animated spinner */}
      <div className="relative">
        <div className={cn(spinnerSize, 'border-2 border-white/20 border-t-blue-500 rounded-full animate-spin')} />
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 animate-pulse" />
      </div>

      {/* Message */}
      <div className="text-center">
        <p className={cn(textSize, 'text-white font-medium')}>{message}</p>

        {details && <p className={cn(detailsSize, 'text-white/60 mt-1')}>{details}</p>}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
