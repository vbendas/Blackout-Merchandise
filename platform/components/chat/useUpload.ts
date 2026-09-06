'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { uploadDesign, type UploadResult } from '@/lib/agent/client';

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 25 * 1024 * 1024;

export interface UploadAttachment {
  id: string;
  name: string;
  /** local object URL, swapped for the server's previewUrl once it lands */
  previewUrl: string;
  progress: number;
  status: 'uploading' | 'ready' | 'needs_cleanup' | 'blocked' | 'error';
  designId?: string;
  url?: string;
  notes?: string[];
  error?: string;
}

function makeId(): string {
  return `up-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/** Shared upload flow behind the composer's attach button/drop zone/paste
 * handler, the 'Upload artwork' quick action, and the `upload` card's
 * 'Choose file' pill — one hook instance lives in ChatShell so every entry
 * point drives the same attachment list and hidden <input>. */
export function useUpload() {
  const [attachments, setAttachments] = useState<UploadAttachment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const controllers = useRef<Map<string, AbortController>>(new Map());

  const update = useCallback((id: string, patch: Partial<UploadAttachment>) => {
    setAttachments((prev) => prev.map((attachment) => (attachment.id === id ? { ...attachment, ...patch } : attachment)));
  }, []);

  const uploadOne = useCallback(
    (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return;
      if (file.size > MAX_BYTES) return;
      const id = makeId();
      const previewUrl = URL.createObjectURL(file);
      setAttachments((prev) => [...prev, { id, name: file.name, previewUrl, progress: 0, status: 'uploading' }]);
      const controller = new AbortController();
      controllers.current.set(id, controller);
      uploadDesign(file, { signal: controller.signal, onProgress: (percent) => update(id, { progress: percent }) })
        .then((result: UploadResult) => {
          update(id, {
            progress: 100,
            status: result.readiness,
            designId: result.designId,
            url: result.url,
            previewUrl: result.previewUrl || previewUrl,
            notes: result.notes,
          });
        })
        .catch(() => {
          update(id, { status: 'error', error: "Uploads aren't live yet — try again shortly." });
        })
        .finally(() => {
          controllers.current.delete(id);
        });
    },
    [update],
  );

  const upload = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach(uploadOne);
    },
    [uploadOne],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    setAttachments((prev) => {
      const found = prev.find((attachment) => attachment.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((attachment) => attachment.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setAttachments((prev) => {
      for (const attachment of prev) URL.revokeObjectURL(attachment.previewUrl);
      return [];
    });
  }, []);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  return useMemo(
    () => ({ attachments, upload, remove, reset, inputRef, openPicker }),
    [attachments, upload, remove, reset, openPicker],
  );
}

export type UseUploadReturn = ReturnType<typeof useUpload>;
