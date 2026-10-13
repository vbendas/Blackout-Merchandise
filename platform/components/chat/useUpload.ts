'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { uploadDesign, type UploadResult } from '@/lib/agent/client';

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_MB = MAX_BYTES / (1024 * 1024);

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

/** The artist-facing reason a file can't be attached, or null when it can. */
function rejectionFor(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || (file.type === '' && /\.pdf$/i.test(file.name));
  if (isPdf) return "PDFs aren't supported yet. Export a PNG or JPG.";
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "That file type isn't supported. Use a PNG or JPG.";
  if (file.size > MAX_BYTES) return `That file is over ${MAX_MB} MB. Export a smaller PNG or JPG.`;
  return null;
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
      const id = makeId();
      const rejection = rejectionFor(file);
      if (rejection) {
        // Listed in the composer like a failed upload, so the artist sees why it was not added.
        setAttachments((prev) => [...prev, { id, name: file.name, previewUrl: '', progress: 0, status: 'error', error: rejection }]);
        return;
      }
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
          update(id, { status: 'error', error: "That upload didn't go through. Try again." });
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
