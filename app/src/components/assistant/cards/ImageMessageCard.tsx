'use client';

import { useState } from 'react';

interface ImageMessageCardProps {
  imageUrl: string;
  alt?: string;
  badge?: 'ai-generated' | 'uploaded';
}

export function ImageMessageCard({ imageUrl, alt = 'Image', badge }: ImageMessageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      {/* Badge */}
      {badge && (
        <div className="absolute top-2 right-2 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-md ${
              badge === 'ai-generated'
                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                : 'bg-zinc-700/60 text-zinc-300 border border-white/10'
            }`}
          >
            {badge === 'ai-generated' ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="AI">
                  <title>AI</title>
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Generated
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  role="img"
                  aria-label="Image"
                >
                  <title>Image</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Uploaded
              </>
            )}
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <div className="w-full h-48 bg-zinc-800 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="w-full h-48 bg-zinc-800 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              role="img"
              aria-label="Error"
            >
              <title>Error</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">Failed to load image</span>
          </div>
        </div>
      )}

      {/* Image */}
      {!hasError && (
        <img
          src={imageUrl}
          alt={alt}
          className={`w-full max-h-[300px] object-contain bg-zinc-950 ${isLoading ? 'hidden' : 'block'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}
