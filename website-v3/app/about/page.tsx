import type { Metadata } from 'next';
import { PageCorners } from '@/components/PageCorners';

export const metadata: Metadata = {
  title: 'About',
  description:
    'MerchFrom started in 2017 as a screen-print shop in Barcelos, Portugal. Premium merchandise for artists, designed, printed and shipped in-house.',
};

const display = {
  fontFamily: 'var(--font-display), sans-serif',
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
        <h1
          className="uppercase leading-[0.94]"
          style={{ ...display, fontSize: 'clamp(3rem, 8vw, 8rem)' }}
        >
          We&rsquo;re not for everyone.
        </h1>
        <p
          className="uppercase leading-[0.94]"
          style={{
            ...display,
            fontSize: 'clamp(3rem, 8vw, 8rem)',
            color: 'color-mix(in srgb, var(--signal) 38%, transparent)',
          }}
        >
          But mom always said you&rsquo;re not everyone else.
        </p>

        <div className="mt-16 grid gap-6 text-[15px] leading-[1.5] md:mt-24 md:grid-cols-12 md:gap-8">
          <p className="md:col-span-4">
            MerchFrom started in 2017 as a screen-print shop in Barcelos,
            Portugal, printing for touring bands and tattoo studios tired of
            merch that fell apart on the first wash.
          </p>
          <p className="md:col-span-4">
            The press is the same. What changed is that you no longer have to
            be in the room. Describe the piece, approve the proof, and we
            print, fold, tag and ship it. You keep the margin.
          </p>
          <dl className="grid grid-cols-3 gap-4 text-[13px] uppercase tracking-[0.08em] md:col-span-4 md:self-end">
            {[
              ['Est.', '2017'],
              ['Shop', 'Barcelos, PT'],
              ['Press', 'Anatol Volt-M'],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <dt style={{ color: 'color-mix(in srgb, var(--signal) 50%, transparent)' }}>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </>
  );
}
