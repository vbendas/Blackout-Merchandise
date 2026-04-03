'use client';

import type React from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DesignUploadZoneProps {
  onFileSelect: (file: File) => void;
  onAIPrompt?: (prompt: string) => void;
  isProcessing?: boolean;
  className?: string;
  selectedStyle?: string | null;
  onStyleChange?: (styleId: string | null) => void;
}

export interface DesignUploadZoneRef {
  triggerFileUpload: () => void;
}

/**
 * Simplified design upload zone - supports drag/drop and file browser
 * Conversations around AI generation and templates are handled by StudioChat
 */
export const DesignUploadZone = forwardRef<DesignUploadZoneRef, DesignUploadZoneProps>(function DesignUploadZone(
  { onFileSelect, className },
  ref
) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Expose triggerFileUpload method to parent via ref
  useImperativeHandle(ref, () => ({
    triggerFileUpload: handleBrowseClick,
  }));

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {!selectedFile ? (
        <button
          type="button"
          onClick={handleBrowseClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'w-full border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200',
            isDragOver
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900'
          )}
        >
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <title>Upload icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Drag your artwork here</h3>
          <p className="text-sm text-zinc-400 mb-6">Supports PNG, JPG, SVG, PSD, AI</p>
          <span className="inline-flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors pointer-events-none">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <title>Browse files icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            Browse files
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.psd,.ai"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File upload"
          />
        </button>
      ) : (
        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Design preview"
                  className="w-full max-h-64 object-contain rounded-lg bg-zinc-800"
                />
              )}
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Remove file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <title>Remove icon</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{selectedFile.name}</p>
              <p className="text-xs text-zinc-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <span className="px-3 py-1 bg-violet-500/20 text-violet-400 text-xs font-medium rounded-full">Ready</span>
          </div>
        </div>
      )}
    </div>
  );
});
