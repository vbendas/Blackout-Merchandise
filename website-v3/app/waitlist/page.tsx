import type { Metadata } from 'next';
import { WaitlistForm } from './WaitlistForm';

export const metadata: Metadata = {
  title: 'Waitlist',
  description: 'Apply to work with MerchFrom — premium merchandise for artists, printed in-house in Barcelona.',
};

export default function WaitlistPage() {
  return (
    <main
      className="flex min-h-screen flex-col justify-center"
      style={{
        paddingLeft: 'var(--gutter)',
        paddingRight: 'var(--gutter)',
        paddingTop: 'calc(var(--header-h) + 24px)',
        paddingBottom: '96px',
      }}
    >
      <WaitlistForm />
    </main>
  );
}
