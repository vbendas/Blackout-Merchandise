'use client';

import { Download, Zap } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';

export interface DesignCardInlineProps {
  designId: string;
  title: string;
  imageUrl: string;
  description?: string;
  generatedBy?: string; // 'ai' | 'user' | 'template'
  tags?: string[];
  onDownload?: (designId: string) => void;
  onApply?: (designId: string) => void;
}

/**
 * AI-generated or user-created design card
 * Displays design artwork with generation info
 * Part of Phase 3.5.4
 */
export function DesignCardInline({
  designId,
  title,
  imageUrl,
  description,
  generatedBy = 'ai',
  tags,
  onDownload,
  onApply,
}: DesignCardInlineProps) {
  return (
    <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Design Image */}
      <div className="relative h-48 w-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center">
        <Image src={imageUrl} alt={title} fill className="object-contain p-4" priority={false} />
        {generatedBy === 'ai' && (
          <div className="absolute top-2 right-2 bg-purple-500/20 backdrop-blur border border-purple-500/30 text-purple-200 text-xs font-medium px-2 py-1 rounded flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            AI Generated
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold text-white line-clamp-2">{title}</h3>
          {description && <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{description}</p>}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-zinc-900 text-zinc-300 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
            {tags.length > 3 && <span className="text-xs text-zinc-500 px-2 py-1">+{tags.length - 3}</span>}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-zinc-500 space-y-1">
          <p>
            Design ID: <span className="font-mono">{designId.slice(0, 8)}...</span>
          </p>
          <p>
            Source: <span className="capitalize">{generatedBy === 'ai' ? 'AI Assistant' : generatedBy}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onApply?.(designId)} size="sm" className="flex-1 gap-1.5" variant="default">
            Use Design
          </Button>
          <Button onClick={() => onDownload?.(designId)} size="sm" variant="outline" className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
