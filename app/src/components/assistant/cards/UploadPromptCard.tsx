'use client';

import { useCallback, useRef, useState } from 'react';

interface UploadPromptCardProps {
  onFileSelected: (file: File) => void;
}

const isValidFile = (file: File): boolean => {
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/psd', 'image/ai'];
  const validExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.psd', '.ai'];
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return validTypes.includes(file.type) || validExtensions.includes(extension);
};

export function UploadPromptCard({ onFileSelected }: UploadPromptCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (isValidFile(file)) {
          onFileSelected(file);
        }
      }
    },
    [onFileSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelected(files[0]);
      }
    },
    [onFileSelected]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={`w-full rounded-xl border-2 border-dashed p-6 transition-all duration-200 ${
        isDragging ? 'border-white/40 bg-zinc-800/80' : 'border-white/20 bg-zinc-900/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Upload icon */}
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="Upload"
          >
            <title>Upload</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Text */}
        <div>
          <p className="text-sm font-medium text-white mb-1">Drop your artwork here</p>
          <p className="text-xs text-zinc-500">PNG, JPG, SVG, PSD, AI up to 10MB</p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,.psd,.ai"
          className="hidden"
          onChange={handleFileInput}
          aria-label="Upload file"
        />

        {/* Browse button */}
        <button
          type="button"
          onClick={triggerFileInput}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/60 border border-white/10 text-sm font-medium text-zinc-300 hover:bg-zinc-700/60 hover:text-white transition-all"
        >
          Browse files
        </button>
      </div>
    </div>
  );
}
