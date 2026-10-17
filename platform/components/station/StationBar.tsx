import type { ReactNode } from 'react';

/** The bar at the top of every station screen: the way back, what this screen is, and the screen's own state and controls at
 * the right. It stays at the top while the page scrolls under it. */
export function StationBar({ lead, title, subtitle, children }: { lead?: ReactNode; title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="st-bar">
      <div className="st-bar-left">
        {lead}
        <div className="st-bar-titles">
          <p className="st-eyebrow">MerchFrom · Station</p>
          <h1 className="st-title">{title}</h1>
          {subtitle ? <p className="st-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {children ? <div className="st-bar-right">{children}</div> : null}
    </header>
  );
}
