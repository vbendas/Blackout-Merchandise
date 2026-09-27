import type { Metadata } from 'next';
import { ContactCopy } from './ContactCopy';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Talk to MerchFrom — premium merchandise for artists, printed in-house in Barcelona, Spain.',
};

export default function ContactPage() {
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
      <ContactCopy />
    </main>
  );
}
