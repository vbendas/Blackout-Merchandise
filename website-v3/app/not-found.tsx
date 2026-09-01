import { PageCorners } from '@/components/PageCorners';

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

export default function NotFound() {
  return (
    <>
      <PageCorners />
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
          Off registration.
        </h1>
        <p
          className="mt-6 text-[15px] leading-[1.5] opacity-60"
        >
          This page does not exist — the plates never lined up.
        </p>
        <a
          href="/"
          className="mt-8 inline-block w-fit text-[15px] underline decoration-1 underline-offset-4"
        >
          Back to the front
        </a>
      </main>
    </>
  );
}
