import type { Metadata } from 'next';
import { PageCorners } from '@/components/PageCorners';
import { ContactCopy } from './ContactCopy';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Talk to MerchFrom — premium merchandise for artists, printed in-house in Barcelos, Portugal.',
};

export default function ContactPage() {
  return (
    <>
      <PageCorners current="contact" />
      <main
        className="flex min-h-screen flex-col justify-center"
        style={{
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          paddingTop: '96px',
          paddingBottom: '96px',
        }}
      >
        <ContactCopy />
      </main>
    </>
  );
}
