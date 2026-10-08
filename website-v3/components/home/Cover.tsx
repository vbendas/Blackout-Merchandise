'use client';

import { FittedWord } from '@/components/editorial/FittedWord';
import { Halftone } from '@/components/editorial/Halftone';
import Link from 'next/link';
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { getLenis } from '@/components/SmoothScroll';
import { LoadIntro } from '@/components/motion/LoadIntro';
import { useBriefPlaceholder } from '@/components/motion/useBriefPlaceholder';
import { useLang, useT, type TFunction } from '@/lib/i18n';
import { FOCUS_RING, MONO_LABEL, PRIMARY_BTN, SECONDARY_BTN } from './styles';

const COVER_IMAGE = '/gallery/7a.png';
const BRIEF_MAX = 500;

interface BriefCardProps {
  t: TFunction;
  brief: string;
  onEdit: () => void;
  onClose: () => void;
}

// Dark accent card over the cover photo — kept on the fixed --well/
// --bone pair (same rule as the vintage catalog's dark editorial tiles)
// regardless of the page's own theme, since it's a deliberate dark
// block floated over an image rather than page content.
function BriefCard({ t, brief, onEdit, onClose }: BriefCardProps) {
  const href = `/waitlist?brief=${encodeURIComponent(brief.slice(0, BRIEF_MAX))}`;
  const hairline = '1px solid rgba(237,228,221,.16)';
  return (
    <div
      style={
        {
          background: 'var(--well)',
          border: hairline,
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          // This card is a fixed dark block regardless of the page's
          // own theme (vintage ink on the rest of the home page) — redefining
          // --signal here keeps the global :focus-visible ring legible
          // (bone, not ink) for anything focused inside it.
          '--signal': 'var(--bone)',
        } as CSSProperties
      }
    >
      <div className="flex items-center justify-between">
        <span style={{ ...MONO_LABEL, color: 'var(--bone)' }}>{t('home.brief.label')}</span>
        <button
          type="button"
          onClick={onClose}
          className={FOCUS_RING}
          style={{ ...MONO_LABEL, color: 'var(--bone)', background: 'none', border: 'none', cursor: 'pointer', height: '32px' }}
        >
          {t('home.brief.close')}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.45, color: 'var(--bone)' }}>&ldquo;{brief}&rdquo;</p>
      <div className="flex flex-col gap-2">
        <span style={{ ...MONO_LABEL, color: 'var(--bone)' }}>{t('home.brief.next')}</span>
        <ol
          style={{
            margin: 0,
            paddingLeft: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '14px',
            lineHeight: 1.5,
            color: '#cfc6bf',
          }}
        >
          <li>{t('home.brief.step1')}</li>
          <li>{t('home.brief.step2')}</li>
          <li>{t('home.brief.step3')}</li>
        </ol>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className={FOCUS_RING}
          style={{ ...SECONDARY_BTN, color: 'var(--bone)', border: `1px solid rgba(237,228,221,.24)` }}
        >
          {t('home.brief.edit')}
        </button>
        <Link href={href} className={`flex-1 ${FOCUS_RING}`} style={{ ...PRIMARY_BTN, background: 'var(--bone)', color: 'var(--well)' }}>
          {t('home.brief.apply')}
        </Link>
      </div>
    </div>
  );
}

export function Cover() {
  const t = useT();
  const { lang } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');
  const [sent, setSent] = useState(false);
  const [brief, setBrief] = useState('');
  const briefRef = useRef<HTMLDivElement>(null);

  useBriefPlaceholder(inputRef, t('home.hero.placeholder'), lang === 'en', sent);

  function send() {
    const value = prompt.trim() || t('home.hero.placeholder');
    setBrief(value);
    setSent(true);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  // Hero action: glide to the brief input and focus it. Lenis owns the
  // scroll when it's running (it intercepts native smooth scrolling);
  // otherwise — reduced motion, or before mount — fall back to native.
  function startBrief() {
    const run = () => {
      const block = briefRef.current;
      if (!block) return;
      const input = document.getElementById('coverBrief');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lenis = getLenis();
      input?.focus({ preventScroll: true });
      if (lenis && !reduce) {
        const offset = -Math.max(96, (window.innerHeight - block.offsetHeight) / 2);
        lenis.scrollTo(block, { offset, duration: 1.4 });
      } else {
        block.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
    };
    if (sent) {
      // The brief card replaced the input; bring the input back first.
      setSent(false);
      requestAnimationFrame(run);
    } else {
      run();
    }
  }

  const facts = [
    t('home.cover.fact.organic'),
    t('home.hero.fact.printed'),
    t('home.hero.fact.zero'),
    t('home.cover.fact.application'),
  ];

  return (
    <section
      id="top"
      data-scene="cover"
      data-theme="ink"
      style={{ paddingTop: 'var(--header-h)', paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', paddingBottom: 'clamp(48px, 7vw, 96px)' }}
    >
      <LoadIntro />
      <FittedWord as="h1" text="MerchFrom" className="home-masthead" wrapClassName="home-masthead-wrap" />

      <div className="home-facts-row" style={{ ...MONO_LABEL }}>
        {facts.map((fact) => (
          <span key={fact}>{fact}</span>
        ))}
        <button type="button" onClick={startBrief} className="link-ink home-facts-cta">
          {t('home.hero.startBrief')}
        </button>
      </div>

      <Halftone
        src={COVER_IMAGE}
        priority
        sizes="100vw"
        className="home-cover-media"
        data-cover-media
      />

      <div className="home-cover-footer">
        <div className="flex flex-col gap-2" data-rise>
          <span style={MONO_LABEL}>{t('home.cover.caption')}</span>
          <p className="home-cover-tagline">{t('home.cover.tagline')}</p>
        </div>

        <div ref={briefRef} className="flex flex-col gap-2.5" data-rise>
          {sent ? (
            <BriefCard t={t} brief={brief} onEdit={() => setSent(false)} onClose={() => setSent(false)} />
          ) : (
            <>
              <span style={MONO_LABEL}>{t('home.brief.label')}</span>
              <div className="home-brief-input-row">
                <label htmlFor="coverBrief" className="sr-only">
                  {t('home.hero.promptLabel')}
                </label>
                <input
                  id="coverBrief"
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t('home.hero.placeholder')}
                  className={FOCUS_RING}
                />
                <button type="button" onClick={send} className={FOCUS_RING}>
                  {t('home.hero.start')} →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
