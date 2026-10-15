/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';

/** A print file shown on a page: a film, a proof, a true-size crop. A plain
 * <img>, not next/image: these are private files served through the print-files
 * route to staff with Pre-press access, already sized for the page (proofs about
 * 1000 px, films at their own size), and the image optimiser would only cache a
 * copy of a private file. When the service has no URL for it (the file is missing
 * or its link couldn't be made) a quiet box takes its place, so the page doesn't
 * show a broken image. */
export function PrintImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  /** '' when the text beside the image already says what it is */
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <span className={cn('pp-noimg', className)} role={alt ? 'img' : undefined} aria-label={alt ? `${alt} (not available)` : undefined} aria-hidden={alt ? undefined : true}>
        Not available
      </span>
    );
  }
  return <img src={src} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} decoding="async" />;
}
