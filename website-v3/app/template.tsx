// Re-mounts on every route change, giving each page a composed fade-in
// over the paper ground instead of a hard cut.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
