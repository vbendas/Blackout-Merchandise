import Image from 'next/image';
import type { HTMLAttributes } from 'react';

interface HalftoneProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  src: string;
  /** Default '' (decorative). */
  alt?: string;
  /** next/image sizes. Default '100vw'. */
  sizes?: string;
  priority?: boolean;
  /** Class on the <img> (default 'object-cover'). */
  imgClassName?: string;
}

/**
 * B&W halftone plate: next/image (fill) inside a `.halftone` box —
 * grayscale + contrast on the image, fine dot screen overlaid (CSS in
 * globals.css). The box has NO intrinsic size: give it one through
 * className/style (height, aspect-ratio, or a grid cell). Extra props
 * (data-*, style, id) pass through to the wrapper div.
 */
export function Halftone({
  src,
  alt = '',
  sizes = '100vw',
  priority,
  imgClassName = 'object-cover',
  className,
  ...rest
}: HalftoneProps) {
  return (
    <div {...rest} className={`halftone${className ? ` ${className}` : ''}`}>
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={imgClassName} />
    </div>
  );
}
