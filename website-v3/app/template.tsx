import { Cursor } from '@/components/Cursor';
import { PageTransition } from '@/components/motion/PageTransition';

// Re-mounts on every route change, giving each page a composed fade-in
// over the paper ground instead of a hard cut; PageTransition adds the
// ground-coloured sweep on client navigations (skipped for reduced motion).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cursor />
      <div className="route-fade">{children}</div>
      <PageTransition />
    </>
  );
}
