import type { ReactNode } from 'react';
import { DEV_BYPASS } from '@/lib/auth';
import { DoorFooter } from '@/components/auth/DoorFooter';
import { DoorSlogan } from '@/components/auth/DoorSlogan';
import { siteHref } from '@/components/auth/door-links';
import '@/components/auth/door.css';

/** The door, drawn like the website's (mainpage/index.html): full-bleed black,
 * MERCHFROM at the top left, the statement centred with its verb on flap
 * tiles, and the gate at the bottom left (each page draws its own gate). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="door">
      <header className="door-bar">
        <a href={siteHref('/')} className="door-label door-wm">
          MerchFrom
        </a>
        {/* AUTH_DEV_BYPASS only, which lib/auth.ts refuses in production. */}
        {DEV_BYPASS ? <span className="mf-mono-note">Local preview</span> : null}
      </header>
      <main className="door-view">
        <div className="door-top">
          <DoorSlogan />
          <div className="door-act">
            {children}
            <DoorFooter className="door-foot-in" />
          </div>
        </div>
        <DoorFooter className="door-foot-out" />
      </main>
    </div>
  );
}
