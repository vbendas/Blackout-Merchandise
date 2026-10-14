import Image from 'next/image';

interface LogoProps {
  /** rendered height in px; the width follows the mark's 360:271 shape */
  height: number;
  className?: string;
  priority?: boolean;
}

/** The MerchFrom logo: the white brush mark (public/logo.png, cut from
 * Assets/Logo/MerchFrom logo v2.png), the same file as the website's header. */
export function Logo({ height, className, priority }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="MerchFrom"
      width={Math.round((height * 360) / 271)}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
