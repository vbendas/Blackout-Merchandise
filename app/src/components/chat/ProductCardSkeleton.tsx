'use client';

/**
 * Skeleton loader for product cards
 * Displays while product data is loading
 * Part of Phase 3.5.2
 */
export function ProductCardSkeleton() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="h-48 w-full bg-zinc-900" />

      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Brand/Name Skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-1/3" />
          <div className="h-4 bg-zinc-800 rounded w-2/3" />
        </div>

        {/* Pricing Skeleton */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-4 bg-zinc-800 rounded" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-4 bg-zinc-800 rounded" />
          </div>
        </div>

        {/* Colors Skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-1/3" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-zinc-800" />
            ))}
          </div>
        </div>

        {/* Buttons Skeleton */}
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-8 bg-zinc-800 rounded" />
          <div className="flex-1 h-8 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );
}
