import type { Metadata } from 'next';
import { AboutCopy } from './AboutCopy';

export const metadata: Metadata = {
  title: 'About',
  description:
    'MerchFrom started in 2017 as a screen-print shop in Barcelona, Spain. Premium merchandise for artists, designed, printed and shipped in-house.',
};

export default function AboutPage() {
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
      <AboutCopy />
    </main>
  );
}
