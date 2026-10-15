import { PageTopBar } from '@/components/studio/PageTopBar';
import { BackLink, ChatLink } from '@/components/studio/approve/ApproveLinks';
import '@/components/studio/approve/approve.css';

/** An address that is not a design of this shop: a mistyped link, an old one,
 * or another artist's. The page does not say which. */
export default function ApproveNotFound() {
  return (
    <main className="ap">
      <PageTopBar title="Approve artwork" lead={<BackLink />} />
      <section className="ap-wait">
        <h2 className="mf-label">Not found</h2>
        <p className="ap-headline">We could not find this artwork.</p>
        <p className="ap-a8">The link may be out of date. Go back to the conversation and open it from there.</p>
        <div className="ap-actions">
          <ChatLink className="ap-btn ap-btn-primary">Back to the chat</ChatLink>
        </div>
      </section>
    </main>
  );
}
