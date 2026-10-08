'use client';

import { Halftone } from '@/components/editorial/Halftone';
import { useT, type Key } from '@/lib/i18n';
import { MONO_LABEL } from './styles';

interface Step {
  titleKey: Key;
  bodyKey: Key;
  image: string;
}

const STEPS: Step[] = [
  { titleKey: 'home.setlist.step1.title', bodyKey: 'home.setlist.step1.body', image: '/gallery/5a.png' },
  { titleKey: 'home.setlist.step2.title', bodyKey: 'home.setlist.step2.body', image: '/gallery/8a.png' },
  { titleKey: 'home.setlist.step3.title', bodyKey: 'home.setlist.step3.body', image: '/gallery/4a.png' },
  { titleKey: 'home.setlist.step4.title', bodyKey: 'home.setlist.step4.body', image: '/gallery/10a.png' },
  { titleKey: 'home.setlist.step5.title', bodyKey: 'home.setlist.step5.body', image: '/gallery/3a.png' },
];

export function SetList() {
  const t = useT();

  return (
    <section
      id="setlist"
      data-scene="setlist"
      className="home-section"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: '1px solid var(--hairline)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3" style={{ borderBottom: '1px solid var(--signal)', paddingBottom: '16px' }}>
        <h2 className="home-setlist-heading" data-lines style={{ margin: 0 }}>
          {t('home.setlist.title')}
        </h2>
        <span className="flex items-baseline gap-5">
          <span style={MONO_LABEL}>{t('home.setlist.subtitle')}</span>
          <span data-counter className="home-setlist-counter" style={{ ...MONO_LABEL, color: 'var(--signal)' }}>
            01 / {String(STEPS.length).padStart(2, '0')}
          </span>
        </span>
      </div>

      <div className="home-setlist-layout">
        <div>
          {STEPS.map((step, i) => (
            <div key={step.titleKey} className="home-setlist-row" data-step={i + 1}>
              <span style={MONO_LABEL}>{String(i + 1).padStart(2, '0')}</span>
              <span className="home-setlist-title">{t(step.titleKey)}</span>
              <span className="home-setlist-body">{t(step.bodyKey)}</span>
            </div>
          ))}
        </div>

        {/* Desktop only (hidden by CSS below 1024px and under reduced
            motion): one halftone plate per step, crossfaded by ScrollScenes. */}
        <div className="home-setlist-frame" aria-hidden="true">
          {STEPS.map((step, i) => (
            <Halftone
              key={step.image}
              src={step.image}
              sizes="26vw"
              hoverTone={false}
              className="home-setlist-plate"
              data-step-img={i + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
