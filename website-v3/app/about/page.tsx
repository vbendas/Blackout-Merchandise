import type { Metadata } from 'next';
import { AboutCopy } from './AboutCopy';

export const metadata: Metadata = {
  title: 'About',
  description:
    'MerchFrom started in 2017 as a screen-print shop in Barcelona, Spain. Premium merchandise for artists, designed, printed and shipped in-house.',
};

export default function AboutPage() {
  return (
    <AboutCopy />
  );
}
