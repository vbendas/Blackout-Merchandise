'use client';

import { useEffect, useState } from 'react';

const SEEN_KEY = 'mf-intro-seen';

// Composed first load: an opaque paper cover holds the frame while the
// registration mark draws itself, then the cover lifts. Runs once per
// session; repeat visits skip it on the first client tick.
export function Intro() {
  const [phase, setPhase] = useState<'draw' | 'exit' | 'done'>('draw');

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) {
        setPhase('done');
        return;
      }
    } catch {
      // storage unavailable — play the intro, worst case it repeats
    }
    const toExit = setTimeout(() => setPhase('exit'), 1150);
    const toDone = setTimeout(() => {
      setPhase('done');
      // Mark seen only on completion — marking at start makes React's
      // dev-mode double-effect read it back instantly and skip the intro.
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {}
    }, 1750);
    return () => {
      clearTimeout(toExit);
      clearTimeout(toDone);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 200,
        background: 'var(--paper)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 600ms ease',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 56, height: 56, color: 'var(--signal)' }}>
        <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.2" pathLength={1} className="intro-stroke" />
        <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="1.2" pathLength={1} className="intro-stroke" style={{ animationDelay: '180ms' }} />
        <line x1="1" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="1.2" pathLength={1} className="intro-stroke" style={{ animationDelay: '360ms' }} />
      </svg>
    </div>
  );
}
