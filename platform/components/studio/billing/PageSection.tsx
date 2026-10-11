import type { ReactNode } from 'react';

export function PageSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mf-hairline-t" style={{ padding: '28px 0' }}>
      <h2 className="mf-label mf-dimmed" style={{ margin: '0 0 18px' }}>
        {label}
      </h2>
      {children}
    </section>
  );
}
