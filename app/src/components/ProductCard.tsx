'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  name: string;
  artist: string;
  price: number;
  imageSrc: string;
  category?: string;
  className?: string;
}

export function ProductCard({ name, artist, price, imageSrc, category, className }: ProductCardProps) {
  return (
    <div
      className={cn(
        'group relative bg-card rounded-lg overflow-hidden border transition-all hover:shadow-lg hover:border-primary/20',
        className
      )}
    >
      {/* Image Container */}
      <div className="aspect-[3/4] relative overflow-hidden bg-muted">
        <Image
          src={imageSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Category Badge */}
        {category && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full text-[10px] font-medium uppercase tracking-wider">
            {category}
          </span>
        )}

        {/* Quick Actions (visible on hover) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-white/90 transition-colors">
            Quick View
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">
          Merch by <span className="text-foreground">@{artist}</span>
        </p>
        <h3 className="font-medium text-sm truncate">{name}</h3>
        <p className="font-semibold">&euro;{price}</p>
      </div>
    </div>
  );
}
