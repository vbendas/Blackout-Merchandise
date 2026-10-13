import type { ReactNode } from 'react';

/** A titled block of the Billing page. `id` doubles as the anchor
 * (billing#runs) and names the section for screen readers. */
export function PageSection({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-label`} className="bl-sec">
      <h2 id={`${id}-label`} className="mf-label mf-dimmed">
        {label}
      </h2>
      {children}
    </section>
  );
}
