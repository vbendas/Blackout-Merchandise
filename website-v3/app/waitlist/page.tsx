import type { Metadata } from 'next';
import { WaitlistForm } from './WaitlistForm';

export const metadata: Metadata = {
  title: 'Waitlist',
  description: 'Apply to work with MerchFrom — premium merchandise for artists, printed in-house in Barcelona.',
};

export default function WaitlistPage() {
  return (
    <WaitlistForm />
  );
}
