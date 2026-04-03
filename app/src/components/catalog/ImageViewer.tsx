'use client';

import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '../ui/button';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Fullscreen image viewer with zoom and navigation
 * Part of Phase 3.5.6
 */
export function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 1));

  if (images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </span>
          <div className="flex gap-2">
            <Button onClick={zoomOut} size="sm" variant="outline" className="h-8 w-8 p-0" disabled={zoom <= 1}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button onClick={zoomIn} size="sm" variant="outline" className="h-8 w-8 p-0" disabled={zoom >= 3}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-zinc-400 text-xs">{Math.round(zoom * 100)}%</span>
        </div>
        <Button onClick={onClose} size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-800">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Image Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              onClick={prevImage}
              size="sm"
              variant="outline"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full h-10 w-10 p-0"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              onClick={nextImage}
              size="sm"
              variant="outline"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full h-10 w-10 p-0"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Image */}
        <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom})` }}>
          <Image
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            width={1200}
            height={1200}
            className="max-h-[70vh] max-w-full object-contain"
            priority
          />
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-4 border-t border-zinc-800 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentIndex(i);
                setZoom(1);
              }}
              className={`
                flex-shrink-0 relative w-16 h-16 rounded overflow-hidden border-2
                ${i === currentIndex ? 'border-white' : 'border-zinc-700 hover:border-zinc-500'}
              `}
            >
              <Image src={img} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
