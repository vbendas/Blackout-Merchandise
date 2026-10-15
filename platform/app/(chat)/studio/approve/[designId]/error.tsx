'use client';

import { useEffect } from 'react';
import { PageTopBar } from '@/components/studio/PageTopBar';
import { BackLink, ChatLink } from '@/components/studio/approve/ApproveLinks';
import '@/components/studio/approve/approve.css';

/** When the approval view cannot be loaded (the service or the proofs'
 * storage is down). Nothing was approved; the artist can try again or go back
 * to the conversation. Server errors arrive here without their message, only
 * a digest that matches the server log. */
export default function ApproveError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="ap">
      <PageTopBar title="Approve artwork" lead={<BackLink />} />
      <section className="ap-wait" role="alert">
        <h2 className="mf-label">Something went wrong</h2>
        <p className="ap-headline">We could not open this artwork.</p>
        <p className="ap-a8">Nothing was approved. Try again in a moment, or go back to the conversation.</p>
        <div className="ap-actions">
          <button type="button" className="ap-btn ap-btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <ChatLink className="ap-btn">Back to the chat</ChatLink>
        </div>
      </section>
    </main>
  );
}
