import type { Metadata } from 'next';
import { PageCorners } from '@/components/PageCorners';
import { AboutCopy } from './AboutCopy';

export const metadata: Metadata = {
  title: 'About',
  description:
    'MerchFrom started in 2017 as a screen-print shop in Barcelos, Portugal. Premium merchandise for artists, designed, printed and shipped in-house.',
};

export default function AboutPage() {
  return (
    <>
      <PageCorners current="about" />
      <main
        className="flex min-h-screen flex-col justify-center"
        style={{
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          paddingTop: '96px',
          paddingBottom: '96px',
        }}
      >
        <AboutCopy />
      </main>
    </>
  );
}
