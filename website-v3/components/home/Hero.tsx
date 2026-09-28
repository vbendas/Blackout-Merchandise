'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useT, type Key, type TFunction } from '@/lib/i18n';
import { FOCUS_RING, HAIRLINE, MONO_LABEL, PRIMARY_BTN, SECONDARY_BTN } from './styles';

const HERO_IMAGE = '/gallery/7a.png';

const CHIP_KEYS: Key[] = [
  'home.hero.chip.tour',
  'home.hero.chip.festival',
  'home.hero.chip.tattoo',
  'home.hero.chip.store',
];

const BRIEF_MAX = 500;

function chipStyle(): CSSProperties {
  return {
    background: 'rgba(237,228,221,.08)',
    border: '1px solid rgba(237,228,221,.16)',
    color: '#d8cfc8',
    borderRadius: '4px',
    height: '36px',
    padding: '0 14px',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

interface BriefCardProps {
  t: TFunction;
  brief: string;
  onEdit: () => void;
  onClose: () => void;
}

function BriefCard({ t, brief, onEdit, onClose }: BriefCardProps) {
  const href = `/waitlist?brief=${encodeURIComponent(brief.slice(0, BRIEF_MAX))}`;
  return (
    <div
      style={{
        background: 'rgba(20,20,20,.96)',
        border: HAIRLINE,
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div className="flex items-center justify-between">
        <span style={MONO_LABEL}>{t('home.brief.label')}</span>
        <button
          type="button"
          onClick={onClose}
          className={FOCUS_RING}
          style={{ ...MONO_LABEL, background: 'none', border: 'none', cursor: 'pointer', height: '32px' }}
        >
          {t('home.brief.close')}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.45, color: 'var(--soft)' }}>
        &ldquo;{brief}&rdquo;
      </p>
      <div className="flex flex-col gap-2">
        <span style={MONO_LABEL}>{t('home.brief.next')}</span>
        <ol
          style={{
            margin: 0,
            paddingLeft: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'var(--soft)',
          }}
        >
          <li>{t('home.brief.step1')}</li>
          <li>{t('home.brief.step2')}</li>
          <li>{t('home.brief.step3')}</li>
        </ol>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className={FOCUS_RING} style={SECONDARY_BTN}>
          {t('home.brief.edit')}
        </button>
        <Link href={href} className={`flex-1 ${FOCUS_RING}`} style={PRIMARY_BTN}>
          {t('home.brief.apply')}
        </Link>
      </div>
    </div>
  );
}

export function Hero() {
  const t = useT();
  const [prompt, setPrompt] = useState('');
  const [sent, setSent] = useState(false);
  const [brief, setBrief] = useState('');

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

  const facts = [
    t('home.hero.fact.zero'),
    t('home.hero.fact.blanks', { n: CATALOG_STATS.total }),
    t('home.hero.fact.weight', { gsm: CATALOG_STATS.heaviestGsm }),
    t('home.hero.fact.printed'),
  ];

  const copyClassName = `flex-col gap-7 ${sent ? 'hidden md:flex' : 'flex'} md:order-1`;

  return (
    <section id="top" className="relative" style={{ paddingTop: 'var(--header-h)' }}>
      <div className="md:grid md:grid-cols-2 md:items-stretch" style={{ minHeight: 'calc(100vh - var(--header-h))' }}>
        {/* Photo — mobile: fixed band on top. Desktop: right half, full height. */}
        <div
          aria-hidden="true"
          className="relative h-[340px] overflow-hidden md:order-2 md:h-full"
          style={{ background: 'var(--raised)' }}
        >
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="hero-photo-img object-cover"
          />
          {sent && (
            <div className="absolute inset-x-6 bottom-6 hidden max-w-[460px] md:right-16 md:left-auto md:bottom-24 md:block">
              <BriefCard t={t} brief={brief} onEdit={() => setSent(false)} onClose={() => setSent(false)} />
            </div>
          )}
        </div>

        {/* Copy + prompt — desktop: bottom-aligned left column. Mobile:
            flows below the photo, replaced by the brief card once sent. */}
        <div
          className={copyClassName}
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            paddingTop: '32px',
            paddingBottom: '48px',
          }}
        >
          <div className="flex flex-1 flex-col justify-end gap-7 md:pb-16">
            <h1
              className="m-0 text-[40px] leading-[1.02] font-semibold tracking-[-0.02em] md:text-[80px] md:leading-[1]"
            >
              {t('home.hero.title')}
            </h1>
            <p
              className="m-0 max-w-[600px] text-[16px] leading-[1.45] md:text-[20px]"
              style={{ color: 'var(--soft)' }}
            >
              {t('home.hero.subline')}
            </p>
            <div
              className="flex flex-col gap-2 md:flex-row md:gap-2 md:p-[6px]"
              style={{
                background: 'rgba(237,228,221,.08)',
                border: '1px solid rgba(237,228,221,.2)',
                borderRadius: '6px',
                boxSizing: 'border-box',
              }}
            >
              <label htmlFor="heroPrompt" className="sr-only">
                {t('home.hero.promptLabel')}
              </label>
              <input
                id="heroPrompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('home.hero.placeholder')}
                className={`h-[52px] flex-none bg-transparent md:flex-1 placeholder:text-[color-mix(in_srgb,var(--signal)_50%,transparent)] md:h-[48px] ${FOCUS_RING}`}
                style={{
                  border: 'none',
                  outline: 'none',
                  color: 'var(--signal)',
                  fontSize: '16px',
                  padding: '0 14px',
                }}
              />
              <button type="button" onClick={send} className={FOCUS_RING} style={{ ...PRIMARY_BTN, height: '52px' }}>
                {t('home.hero.start')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CHIP_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPrompt(t(key))}
                  className={FOCUS_RING}
                  style={chipStyle()}
                >
                  {t(key)}
                </button>
              ))}
            </div>
            <div style={{ ...MONO_LABEL, color: 'var(--muted)' }} className="flex flex-wrap gap-x-4 gap-y-1">
              <span>{facts.join(' · ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only brief card: replaces the copy block in flow. */}
      {sent && (
        <div
          className="md:hidden"
          style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', paddingTop: '32px', paddingBottom: '48px' }}
        >
          <BriefCard t={t} brief={brief} onEdit={() => setSent(false)} onClose={() => setSent(false)} />
        </div>
      )}

      <style>{`
        @keyframes home-hero-push-in {
          from { transform: scale(1); }
          to { transform: scale(1.06); }
        }
        .hero-photo-img {
          animation: home-hero-push-in 26s ease-in-out infinite alternate;
          transform-origin: 62% 42%;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-photo-img { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
