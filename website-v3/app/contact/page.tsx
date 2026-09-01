import type { Metadata } from 'next';
import { PageCorners } from '@/components/PageCorners';
import { SOCIALS } from '@/lib/socials';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Talk to MerchFrom — premium merchandise for artists, printed in-house in Barcelos, Portugal.',
};

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

// PLACEHOLDER — swap for the real address when the inbox exists.
const EMAIL = 'hello@merchfrom.com';

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
        <h1
          className="uppercase leading-[0.94]"
          style={{ ...display, fontSize: 'clamp(3rem, 8vw, 8rem)' }}
        >
          Say hello.
        </h1>
        <a
          href={`mailto:${EMAIL}`}
          className="uppercase leading-[0.94] transition-[filter] duration-200 hover:blur-[3px]"
          style={{
            ...display,
            fontSize: 'clamp(2rem, 5.5vw, 5.5rem)',
            color: 'color-mix(in srgb, var(--signal) 38%, transparent)',
          }}
        >
          {EMAIL}
        </a>

        <div className="mt-16 grid gap-6 text-[15px] leading-[1.5] md:mt-24 md:grid-cols-12 md:gap-8">
          <p className="md:col-span-4">
            For projects, bulk runs and everything print: write to us, or
            apply for a slot through the waitlist.
          </p>
          <div className="flex flex-col gap-1 text-[13px] uppercase tracking-[0.08em] md:col-span-4">
            <span style={{ color: 'color-mix(in srgb, var(--signal) 50%, transparent)' }}>Shop</span>
            <span>Barcelos, Portugal</span>
          </div>
          <div className="flex flex-col gap-1 text-[13px] uppercase tracking-[0.08em] md:col-span-4">
            <span style={{ color: 'color-mix(in srgb, var(--signal) 50%, transparent)' }}>Elsewhere</span>
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-1 underline-offset-4"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
