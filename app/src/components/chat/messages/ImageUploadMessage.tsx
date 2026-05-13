'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface ImageUploadMessageProps {
  onUpload: (file: File) => Promise<void>;
}

export function ImageUploadMessage({ onUpload }: ImageUploadMessageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      setIsUploading(true);
      try {
        await onUpload(files[0]);
      } finally {
        setIsUploading(false);
      }
    }
  }, [onUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        await onUpload(files[0]);
      } finally {
        setIsUploading(false);
      }
    }
  }, [onUpload]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        isDragging
          ? 'border-purple-500/50 bg-purple-500/10'
          : 'border-zinc-700/50 bg-zinc-900/40'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-sm text-zinc-400">Uploading...**</p>
        </div>
      ) : (
        <>
          <Icon icon="lucide:upload-cloud" className="mx-auto h-10 w-10 text-zinc-500" />
          <p className="mt-2 text-sm text-zinc-400">
            Drop an image here, or{' '}
            <label className="cursor-pointer text-purple-400 hover:text-purple-300">
              browse
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-zinc-600">Supports: JPG, PNG, WEBP up to 10MB**</p>
        </>
      )}
    </motion.div>
  );
}
