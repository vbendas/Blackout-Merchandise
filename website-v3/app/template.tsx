import { Cursor } from '@/components/Cursor';

// Re-mounts on every route change, giving each page a composed fade-in
// over the paper ground instead of a hard cut.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cursor />
      <div className="route-fade">{children}</div>
    </>
  );
}
