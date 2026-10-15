'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Status {
  buildStatus: string;
  replaced: boolean;
}

/** Waits for a pack to change under the page: a pack still being built becomes
 * its films and checks, and a pack run again (or given a corrected PSD) is
 * replaced by the newer one. It asks a small status route every few seconds, not
 * the page (each page view by an employee goes in the staff activity log, and a
 * page costs far more to draw), and draws the page again once, when the answer
 * differs from where it started. `baseline` is what the page was drawn from; with
 * none, the first answer is the starting point (a run again has just been queued,
 * so the pack is as it was). It gives up after `limitSeconds`, so a stuck job
 * doesn't keep a tab asking. */
export function PackWatcher({
  packId,
  watching,
  baseline,
  seconds = 5,
  limitSeconds = 600,
}: {
  packId: string;
  watching: boolean;
  baseline?: Status;
  seconds?: number;
  limitSeconds?: number;
}) {
  const router = useRouter();
  const startBuild = baseline?.buildStatus;
  const startReplaced = baseline?.replaced;

  useEffect(() => {
    if (!watching) return;
    let stopped = false;
    let start: Status | null = startBuild === undefined || startReplaced === undefined ? null : { buildStatus: startBuild, replaced: startReplaced };

    async function check() {
      try {
        const response = await fetch(`/api/prepress/${encodeURIComponent(packId)}/status`, { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok || stopped) return;
        const now = (await response.json()) as Partial<Status>;
        if (typeof now.buildStatus !== 'string' || typeof now.replaced !== 'boolean') return;
        if (!start) {
          start = { buildStatus: now.buildStatus, replaced: now.replaced };
          return;
        }
        if (now.buildStatus !== start.buildStatus || now.replaced !== start.replaced) {
          stopped = true;
          window.clearInterval(timer);
          router.refresh();
        }
      } catch {
        // a dropped request: the next tick asks again
      }
    }

    const timer = window.setInterval(check, seconds * 1000);
    const giveUp = window.setTimeout(() => {
      stopped = true;
      window.clearInterval(timer);
    }, limitSeconds * 1000);
    void check();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.clearTimeout(giveUp);
    };
  }, [watching, packId, startBuild, startReplaced, seconds, limitSeconds, router]);

  return null;
}
