import type { Metadata } from 'next';
import { ContactCopy } from './ContactCopy';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Talk to MerchFrom — premium merchandise for artists, printed in-house in Barcelona, Spain.',
};

export default function ContactPage() {
  return (
    <ContactCopy />
  );
}
