'use client';

import { Edit3, Eye } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';

export interface MockupCardInlineProps {
  mockupId: string;
  productName: string;
  mockupUrl: string; // Cloudinary URL of product with design applied
  designPreviewUrl: string; // The design image
  colors?: Array<{ name: string; hex: string }>;
  onEdit?: (mockupId: string) => void;
  onPreview?: (mockupId: string) => void;
}

/**
 * Mockup card showing product with design applied
 * Displays how design looks on actual product
 * Part of Phase 3.5.3
 */
export function MockupCardInline({
  mockupId,
  productName,
  mockupUrl,
  designPreviewUrl,
  colors,
  onEdit,
  onPreview,
}: MockupCardInlineProps) {
  return (
    <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Mockup Image */}
      <div className="relative h-48 w-full bg-zinc-900 flex items-center justify-center">
        <Image src={mockupUrl} alt={`${productName} with design`} fill className="object-cover" priority={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold text-white">{productName}</h3>
          <p className="text-xs text-zinc-500">Design Preview</p>
        </div>

        {/* Design Preview Thumbnail */}
        {designPreviewUrl && (
          <div className="relative h-20 w-full rounded border border-zinc-800 bg-zinc-900 overflow-hidden">
            <Image src={designPreviewUrl} alt="Design preview" fill className="object-contain p-1" priority={false} />
          </div>
        )}

        {/* Color Options */}
        {colors && colors.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <p className="text-xs font-medium text-zinc-400">Available Colors</p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <div key={color.name} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border border-zinc-600"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                  <span className="text-xs text-zinc-400">{color.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onEdit?.(mockupId)} size="sm" className="flex-1 gap-1.5" variant="default">
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button onClick={() => onPreview?.(mockupId)} size="sm" variant="outline" className="flex-1 gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Preview
          </Button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-zinc-500 text-center">Click Edit to adjust design colors and placement</p>
      </div>
    </div>
  );
}
