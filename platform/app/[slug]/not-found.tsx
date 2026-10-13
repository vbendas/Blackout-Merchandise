export default function StoreNotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3"
      style={{ background: 'var(--paper)', color: 'var(--signal)' }}
    >
      <span className="mf-label mf-dim">MerchFrom</span>
      <h1 className="mf-display text-2xl">No such shop.</h1>
    </div>
  );
}
