'use client';

// DEV ONLY (WP3, gate G1). The face specimen board: candidate display and
// mono faces on real MerchFrom type treatments, both grounds, six locales.
// The real `FittedWord` and the real `.t-*` classes (design-tokens/type.css)
// are used; buttons, composer, card and spec rows are scoped sample markup
// (specimen.css) built to the plan's section 5 spec, so this judges FACES,
// not the production primitives.
import Image from 'next/image';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { FittedWord } from '@/components/editorial/FittedWord';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useLang, useT, type Key, type TFunction } from '@/lib/i18n';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { PRODUCTS } from '@/lib/products';
import {
  DISPLAY_FACES,
  DISPLAY_IDS,
  LANG_CODES,
  MONO_FACES,
  MONO_IDS,
  MORNSEY_FAMILY,
  boardVars,
  displayWeight,
  stateToQuery,
  type DisplayFace,
  type DisplayId,
  type Ground,
  type LangCode,
  type MonoFace,
  type MonoId,
  type SpecimenState,
} from './faces';
import { CLIP_PROBE, DIACRITIC_STRINGS, SAMPLES, type Samples } from './strings';
import './specimen.css';

// ── Canvas helpers (client only) ─────────────────────────────────────────

// Greek capital omega: in none of the loaded subsets (latin, latin-ext) nor in the local faces (one mono face
// carries it anyway), and the serif and monospace system fallbacks draw it differently, so it shows the
// detector can flag a real hole.
const SELF_TEST_CHAR = '\u03A9';
const PROBE_TEXT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ÃÕÑÇÄÖÜÉÈÀŒß¿?';

function canvas2d(): CanvasRenderingContext2D | null {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  return c.getContext('2d', { willReadFrequently: true });
}

async function loadFace(family: string, weight: number, text: string) {
  try {
    await document.fonts.load(`${weight} 64px ${family}`, text);
  } catch {
    // measurement still runs against whatever loaded
  }
}

/**
 * True when `family` has no glyph for `ch`: the same character drawn with a
 * serif fallback and a monospace fallback differs only if the first family
 * could not draw it. (`document.fonts.check` alone cannot tell, it reports
 * true for a loaded face that lacks the glyph.)
 */
function glyphMissing(family: string, weight: number, ch: string): boolean {
  const ctx = canvas2d();
  if (!ctx) return false;
  const draw = (fallback: string) => {
    ctx.clearRect(0, 0, 96, 96);
    ctx.font = `${weight} 64px ${family}, ${fallback}`;
    ctx.fillText(ch, 8, 72);
    return ctx.getImageData(0, 0, 96, 96).data;
  };
  const a = draw('serif');
  const b = draw('monospace');
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}

async function missingChars(family: string, weight: number, text: string): Promise<string[]> {
  const chars = [...new Set([...text].filter((c) => c.trim() !== ''))];
  await loadFace(family, weight, chars.join(''));
  const loaded = document.fonts.check(`${weight} 64px ${family}`, chars.join(''));
  if (!loaded) return chars;
  return chars.filter((c) => glyphMissing(family, weight, c));
}

interface DisplayMetrics {
  /** MERCHFROM width per character, em: the recommended --display-fit. */
  fit: number;
  meanCaps: number;
  capH: number;
  accentAsc: number;
  descBelow: number;
  /** Smallest line-height with no padding that clips no accent/tail. */
  minLhBare: number;
  /** Worst clip (em) at line-height .8 with no padding. */
  clipTight: number;
  /** Worst clip (em) at the face's line-height + .12em padding (plan default). */
  clipPlan: number;
}

interface MonoMetrics {
  advance: number;
  capH: number;
}

function measureDisplay(face: DisplayFace, weight: number): DisplayMetrics | null {
  const ctx = canvas2d();
  if (!ctx) return null;
  const S = 100;
  ctx.font = `${weight} ${S}px ${face.family}`;
  const w = (t: string) => ctx.measureText(t).width / S;
  let sum = 0;
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') sum += w(ch);
  const h = ctx.measureText('H');
  const fa = h.fontBoundingBoxAscent / S;
  const fd = h.fontBoundingBoxDescent / S;
  if (!(fa + fd > 0)) return null;
  const capH = h.actualBoundingBoxAscent / S;
  const accentAsc = Math.max(...[...'ÃÕÑÂÊÔÄÖÜÀÉÈŒ'].map((c) => ctx.measureText(c).actualBoundingBoxAscent / S));
  const descBelow = Math.max(...[...'ÇQĄ'].map((c) => ctx.measureText(c).actualBoundingBoxDescent / S));
  const clipAt = (lh: number, pad: number) => {
    const top = pad + (lh - (fa + fd)) / 2 + fa; // baseline to top of the clipping box
    const bottom = lh + 2 * pad - top;
    return Math.max(0, accentAsc - top, descBelow - bottom);
  };
  let minLhBare = 1.3;
  for (let L = 0.7; L <= 1.3; L += 0.01) {
    if (clipAt(L, 0) < 0.002) {
      minLhBare = Math.round(L * 100) / 100;
      break;
    }
  }
  return {
    fit: w('MERCHFROM') / 9,
    meanCaps: sum / 26,
    capH,
    accentAsc,
    descBelow,
    minLhBare,
    clipTight: clipAt(0.8, 0),
    clipPlan: clipAt(face.lh, 0.12),
  };
}

function measureMono(face: MonoFace): MonoMetrics | null {
  const ctx = canvas2d();
  if (!ctx) return null;
  const S = 100;
  ctx.font = `400 ${S}px ${face.family}`;
  return { advance: ctx.measureText('0').width / S, capH: ctx.measureText('H').actualBoundingBoxAscent / S };
}

type MetricsResult = {
  display: Partial<Record<DisplayId, DisplayMetrics>>;
  mono: Partial<Record<MonoId, MonoMetrics>>;
};

declare global {
  interface Window {
    __specimenMetrics?: unknown;
  }
}

// ── Treatments ───────────────────────────────────────────────────────────

interface Ctx {
  lang: LangCode;
  t: TFunction;
  s: Samples;
  face: DisplayFace;
  mono: MonoFace;
  weight: number;
  ground: 'ink' | 'paper';
}

interface Treatment {
  id: string;
  title: string;
  render: (c: Ctx) => ReactNode;
}

const TEE = PRODUCTS.find((p) => p.code === 'STTU078') ?? PRODUCTS.find((p) => p.name === 'T-shirt') ?? PRODUCTS[0];

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10h13M11 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

function Marked({ text, missing }: { text: string; missing: string[] }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className={missing.includes(ch) ? 'sp-miss' : undefined}>
          {ch}
        </span>
      ))}
    </>
  );
}

function Diacritics({ c }: { c: Ctx }) {
  const [missing, setMissing] = useState<{ display: string[]; mono: string[]; selfTest: boolean } | null>(null);
  const all = useMemo(() => DIACRITIC_STRINGS.map((d) => d.text).join(' '), []);
  const { family: dFam } = c.face;
  const { family: mFam } = c.mono;
  const { weight } = c;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [display, mono] = await Promise.all([
        missingChars(dFam, weight, `${all}${SELF_TEST_CHAR}`),
        missingChars(mFam, 400, `${all}${SELF_TEST_CHAR}`),
      ]);
      const selfTest = display.includes(SELF_TEST_CHAR) || mono.includes(SELF_TEST_CHAR);
      if (!cancelled) {
        setMissing({
          display: display.filter((ch) => ch !== SELF_TEST_CHAR),
          mono: mono.filter((ch) => ch !== SELF_TEST_CHAR),
          selfTest,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dFam, mFam, weight, all]);

  return (
    <div>
      {DIACRITIC_STRINGS.map((d) => (
        <div className="sp-dia" key={d.lang} data-active={d.lang === c.lang}>
          <span className="t-label">
            {d.lang}
            {d.lang === c.lang ? ' / active locale' : ''}
          </span>
          <p className="sp-dia-big">
            <Marked text={d.text} missing={missing?.display ?? []} />
          </p>
          <p className="sp-dia-small t-label">
            <Marked text={d.text} missing={missing?.mono ?? []} />
          </p>
        </div>
      ))}
      <p className="sp-note t-label">
        {missing === null
          ? 'checking glyph coverage...'
          : `missing in ${c.face.label}: ${missing.display.length ? missing.display.join(' ') : 'none'} / missing in ${c.mono.label}: ${missing.mono.length ? missing.mono.join(' ') : 'none'} / detector control (U+03A9) ${missing.selfTest ? 'flagged ok' : 'not flagged'}`}
      </p>
    </div>
  );
}

const TREATMENTS: Treatment[] = [
  {
    id: 'masthead',
    title: 'a / fitted MERCHFROM (real FittedWord, .t-poster)',
    render: () => <FittedWord text="MERCHFROM" className="t-poster mf-misreg" decorative />,
  },
  {
    id: 'apply',
    title: 'b / outlined APPLY, 2.5px stroke + 2px brand misregistration',
    render: (c) => {
      const word = c.t('nav.apply').toLocaleUpperCase(c.lang);
      // Two identically fitted layers: the brand outline sits 2px down-right behind the
      // fg outline (the .mf-misreg-outline effect, built from the real FittedWord so long
      // locale words such as BEWERBEN fit exactly like the production APPLY will).
      return (
        <div className="sp-apply-stack" aria-hidden="true">
          <div className="sp-apply-back">
            <FittedWord text={word} className="t-poster sp-outline-brand" decorative />
          </div>
          <FittedWord text={word} className="t-poster mf-outline" decorative />
        </div>
      );
    },
  },
  {
    id: 'setlist',
    title: 'c / set list rows (.t-display-m, .t-body, .t-label)',
    render: (c) => (
      <ol className="sp-setlist">
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n}>
            <span className="t-label">{String(n).padStart(2, '0')}</span>
            <h4 className="t-display-m sp-setlist-title">{c.t(`home.setlist.step${n}.title` as Key)}</h4>
            <p className="t-body sp-setlist-body">{c.t(`home.setlist.step${n}.body` as Key)}</p>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: 'stats',
    title: 'd / stats at --t-stat, tabular, mono unit (values from CATALOG_STATS)',
    render: (c) => {
      const stats = [
        { v: CATALOG_STATS.total, unit: c.s.blanks, label: '' },
        { v: CATALOG_STATS.gots, unit: `/ ${CATALOG_STATS.total}`, label: c.t('catalog.stat.gots') },
        { v: CATALOG_STATS.heaviestGsm, unit: 'gsm', label: c.t('home.cloth.stat.heaviest') },
        { v: CATALOG_STATS.methods, unit: '', label: c.t('catalog.stat.methods') },
      ];
      return (
        <div className="sp-stats">
          {stats.map((st, i) => (
            <div className="sp-stat" key={i}>
              <div className="sp-stat-num">
                <span className="t-stat">{st.v}</span>
                {st.unit ? <span className="t-label sp-stat-unit">{st.unit}</span> : null}
              </div>
              {st.label ? <p className="t-label sp-stat-label">{st.label}</p> : null}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'nav',
    title: 'e / nav, six real labels, display face at +0.04em (.t-ui-caps)',
    render: (c) => {
      const keys: Key[] = ['nav.catalog', 'nav.gallery', 'nav.about', 'nav.contact', 'nav.waitlist', 'nav.apply'];
      return (
        <nav className="sp-nav" aria-label="Specimen nav">
          {keys.map((k) => (
            <a key={k} href="#sp-nav" className="t-ui-caps" onClick={(e) => e.preventDefault()}>
              {c.t(k)}
            </a>
          ))}
        </nav>
      );
    },
  },
  {
    id: 'buttons',
    title: 'f / buttons: primary, ink, secondary (48 and 40), disabled',
    render: (c) => (
      <>
        <div className="sp-row">
          <button type="button" className="sp-btn sp-btn--primary t-ui-caps">
            {c.s.btnPrimary}
          </button>
          <button type="button" className="sp-btn sp-btn--ink t-ui-caps">
            {c.s.btnInk}
          </button>
          <button type="button" className="sp-btn sp-btn--secondary t-ui-caps">
            {c.t('nav.apply')}
          </button>
        </div>
        <div className="sp-row">
          <button type="button" className="sp-btn sp-btn--40 sp-btn--primary t-ui-caps">
            {c.s.btnPrimary}
          </button>
          <button type="button" className="sp-btn sp-btn--40 sp-btn--secondary t-ui-caps">
            {c.t('nav.apply')}
          </button>
          <button type="button" className="sp-btn sp-btn--40 sp-btn--disabled t-ui-caps" aria-disabled="true">
            {c.t('nav.waitlist')}
          </button>
        </div>
      </>
    ),
  },
  {
    id: 'composer',
    title: 'g / composer: 2 lines, long mono placeholder, chips, square send',
    render: (c) => (
      <div className="sp-composer mf-glass">
        <textarea
          rows={2}
          className="t-mono"
          placeholder={c.t('home.hero.placeholder')}
          aria-label={c.t('home.hero.promptLabel')}
        />
        <div className="sp-composer-bar">
          {c.s.chips.map((chip, i) => (
            <button type="button" key={chip} className="sp-chip t-label" aria-pressed={i === 0}>
              {i === 0 ? <CheckIcon /> : <i>{i + 1}</i>}
              {chip}
            </button>
          ))}
          <button type="button" className="sp-send" aria-label={c.t('home.hero.start')}>
            <SendIcon />
          </button>
        </div>
      </div>
    ),
  },
  {
    id: 'card',
    title: 'h / catalog card: packshot on a paper tile, SKU, mono spec line',
    render: (c) => {
      const d = PRODUCT_DETAILS[TEE.code];
      const spec = [d ? `${d.weightGsm} gsm` : null, d?.fit, d?.certifications.slice(0, 2).join(' + ')]
        .filter(Boolean)
        .join(' / ');
      return (
        <article className="sp-card">
          <div className="sp-card-img" data-theme="paper">
            <Image src={TEE.src} alt="" fill sizes="360px" />
          </div>
          <div className="sp-card-cap">
            <span className="t-label">{TEE.code}</span>
            <h4 className="t-display-m">{d?.name ?? TEE.name}</h4>
            <p className="t-mono sp-card-meta">{spec}</p>
            <p className="t-mono">
              {c.s.cardFrom} 18.00 EUR
              <span className="sp-sample t-label">{c.s.cardSample}</span>
            </p>
          </div>
        </article>
      );
    },
  },
  {
    id: 'specrows',
    title: 'i / SpecRow list and mono agent tool-status table',
    render: (c) => (
      <div className="sp-specgrid">
        <dl className="sp-specrows t-mono">
          {c.s.spec.map((r) => (
            <div key={r.label}>
              <dt className="t-label">{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        <div className="sp-scroll">
        <table className="sp-tools t-mono">
          <tbody>
            {c.s.tools.map((r) => (
              <tr key={r.name}>
                <td>
                  <span className={r.state === 'live' ? 'sp-dot sp-dot--live' : 'sp-dot'} />
                  {r.name}
                </td>
                <td>{r.arg}</td>
                <td>{r.state}</td>
                <td>{r.ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    ),
  },
  {
    id: 'diacritics',
    title: 'j / diacritic stress, display at up to 120px and mono label at 12.5px',
    render: (c) => <Diacritics c={c} />,
  },
];

// Treatments that show the mono face, for the mono side-by-side section.
const MONO_TREATMENTS = TREATMENTS.filter((tr) => tr.id === 'composer' || tr.id === 'specrows');

// ── Controls ─────────────────────────────────────────────────────────────

interface SegOption {
  value: string;
  label: string;
  note?: string;
}

function Seg({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="sp-fieldset">
      <legend>{legend}</legend>
      <div className="sp-seg">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
            {o.note ? <small>{o.note}</small> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function Specimen({ initial }: { initial: SpecimenState }) {
  const { lang, setLang } = useLang();
  const t = useT();
  const [s, setS] = useState<SpecimenState>(initial);
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [copied, setCopied] = useState(false);

  const initialLang = initial.l;
  useEffect(() => {
    if (initialLang) setLang(initialLang);
  }, [initialLang, setLang]);

  const update = (patch: Partial<SpecimenState>) => {
    const next = { ...s, ...patch };
    setS(next);
    try {
      window.history.replaceState(null, '', `?${stateToQuery(next)}`);
    } catch {
      // URL state is a convenience only
    }
  };

  const activeLang = (s.l ?? lang) as LangCode;
  const samples = SAMPLES[lang as LangCode] ?? SAMPLES.en;
  const grounds: ('ink' | 'paper')[] = s.g === 'both' ? ['ink', 'paper'] : [s.g];
  const treatments = s.only.length ? TREATMENTS.filter((tr) => s.only.includes(tr.id)) : TREATMENTS;
  const sheetMode = s.only.length > 0;
  const bsWeight = s.w;
  const compareIds = s.f.length ? s.f : DISPLAY_IDS;

  // Metrics: measured with canvas after every candidate has loaded.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        ...DISPLAY_IDS.map((id) => loadFace(DISPLAY_FACES[id].family, displayWeight(id, bsWeight), PROBE_TEXT)),
        ...MONO_IDS.map((id) => loadFace(MONO_FACES[id].family, 400, PROBE_TEXT)),
      ]);
      await document.fonts.ready;
      if (cancelled) return;
      const out: MetricsResult = { display: {}, mono: {} };
      for (const id of DISPLAY_IDS) {
        const m = measureDisplay(DISPLAY_FACES[id], displayWeight(id, bsWeight));
        if (m) out.display[id] = m;
      }
      for (const id of MONO_IDS) {
        const m = measureMono(MONO_FACES[id]);
        if (m) out.mono[id] = m;
      }
      window.__specimenMetrics = out;
      setMetrics(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [bsWeight]);

  const faceCtx = (id: DisplayId, ground: 'ink' | 'paper'): Ctx => ({
    lang: lang as LangCode,
    t,
    s: samples,
    face: DISPLAY_FACES[id],
    mono: MONO_FACES[s.m],
    weight: displayWeight(id, bsWeight),
    ground,
  });

  const selMetrics = metrics?.display[s.d];
  const decision = {
    display: DISPLAY_FACES[s.d].label,
    displayWeight: displayWeight(s.d, bsWeight),
    mono: MONO_FACES[s.m].label,
    fit: selMetrics ? Math.round(selMetrics.fit * 1000) / 1000 : DISPLAY_FACES[s.d].fit,
    lh: DISPLAY_FACES[s.d].lh,
    tracking: DISPLAY_FACES[s.d].tracking,
    ...(DISPLAY_FACES[s.d].licence === 'UNCONFIRMED' ? { licence: 'GC Grind licence unconfirmed' } : {}),
  };

  const copyDecision = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(decision));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="sp-root">
      <div className="sp-banner">DEV ONLY. Not shipped. Round 9 gate G1: pick the display and mono faces.</div>

      <div className="sp-bar" role="group" aria-label="Specimen controls">
        <Seg
          legend="Display"
          name="sp-display"
          value={s.d}
          onChange={(v) => update({ d: v as DisplayId })}
          options={DISPLAY_IDS.map((id) => ({
            value: id,
            label: DISPLAY_FACES[id].label,
            note: DISPLAY_FACES[id].flag,
          }))}
        />
        <Seg
          legend="Mono"
          name="sp-mono"
          value={s.m}
          onChange={(v) => update({ m: v as MonoId })}
          options={MONO_IDS.map((id) => ({
            value: id,
            label: MONO_FACES[id].label,
            note: MONO_FACES[id].control ? 'control' : undefined,
          }))}
        />
        <Seg
          legend="Ground"
          name="sp-ground"
          value={s.g}
          onChange={(v) => update({ g: v as Ground })}
          options={[
            { value: 'ink', label: 'Ink' },
            { value: 'paper', label: 'Paper' },
            { value: 'both', label: 'Both' },
          ]}
        />
        <Seg
          legend="Locale"
          name="sp-locale"
          value={activeLang}
          onChange={(v) => {
            setLang(v as LangCode);
            update({ l: v as LangCode });
          }}
          options={LANG_CODES.map((code) => ({ value: code, label: code }))}
        />
        {s.d === 'bigshoulders' || s.c ? (
          <Seg
            legend="Big Shoulders weight"
            name="sp-bsw"
            value={String(s.w)}
            onChange={(v) => update({ w: v === '900' ? 900 : 800 })}
            options={[
              { value: '800', label: '800' },
              { value: '900', label: '900' },
            ]}
          />
        ) : null}
        <label className="sp-check">
          <input type="checkbox" checked={s.c} onChange={(e) => update({ c: e.target.checked })} />
          Compare all
        </label>
      </div>

      <main className="sp-main">
        {s.c
          ? grounds.map((g) => (
              <section className="sp-compare" data-theme={g} key={g} aria-label={`Compare, ${g}`}>
                <h2 className="t-label sp-compare-title">
                  Compare all display faces / {g} / mono {MONO_FACES[s.m].label} / {activeLang}
                </h2>
                {treatments.map((tr) => (
                  <div className="sp-trow" key={tr.id}>
                    <h3 className="t-label sp-tlabel">{tr.title}</h3>
                    <div className="sp-trow-grid">
                      {compareIds.map((id) => (
                        <div
                          className="sp-board sp-cell"
                          data-theme={g}
                          style={boardVars(id, s.m, bsWeight)}
                          key={id}
                        >
                          <div className="sp-cell-head t-label">
                            <span>{DISPLAY_FACES[id].label}</span>
                            {DISPLAY_FACES[id].flag ? <span>{DISPLAY_FACES[id].flag}</span> : null}
                          </div>
                          {tr.render(faceCtx(id, g))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))
          : grounds.map((g) => (
              <section
                className="sp-board"
                data-theme={g}
                style={boardVars(s.d, s.m, bsWeight)}
                key={g}
                aria-label={`${DISPLAY_FACES[s.d].label} on ${g}`}
              >
                <div className="sp-board-head t-label">
                  <span>
                    {DISPLAY_FACES[s.d].label} {displayWeight(s.d, bsWeight)} + {MONO_FACES[s.m].label} / {g} /{' '}
                    {activeLang}
                    {DISPLAY_FACES[s.d].flag ? <span className="sp-flag">{DISPLAY_FACES[s.d].flag}</span> : null}
                  </span>
                  <span>licence: {DISPLAY_FACES[s.d].licence}</span>
                </div>
                {treatments.map((tr) => (
                  <div className="sp-t" key={tr.id}>
                    <h3 className="t-label sp-tlabel">{tr.title}</h3>
                    {tr.render(faceCtx(s.d, g))}
                  </div>
                ))}
              </section>
            ))}

        {sheetMode && !s.only.includes('mono') ? null : (
          <div className="sp-sections">
            <section className="sp-section" aria-label="Mono candidates">
              <h2 className="t-label">Mono candidates side by side (display face: {DISPLAY_FACES[s.d].label})</h2>
              {grounds.map((g) => (
                <div className="sp-trow-grid sp-mono-grid" key={g}>
                  {MONO_IDS.map((id) => (
                    <div
                      className="sp-board sp-cell"
                      data-theme={g}
                      style={boardVars(s.d, id, bsWeight)}
                      key={id}
                    >
                      <div className="sp-cell-head t-label">
                        <span>{MONO_FACES[id].label}</span>
                        {MONO_FACES[id].control ? <span>control</span> : null}
                      </div>
                      {MONO_TREATMENTS.map((tr) => (
                        <div className="sp-t" key={tr.id}>
                          {tr.render({ ...faceCtx(s.d, g), mono: MONO_FACES[id] })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <section className="sp-section" aria-label="Mornsey stamp samples">
              <h2 className="t-label">k / Mornsey stamp layer (dev-only WOFF2 copy), -4deg, 64 / 96 / 160px</h2>
              <StampBoards grounds={grounds} samples={samples} />
            </section>

            <section className="sp-section" aria-label="Metrics">
              <h2 className="t-label">Metrics (canvas measureText, adopt into the type.css metric block)</h2>
              <MetricsPanel
                metrics={metrics}
                bsWeight={bsWeight}
                selected={s.d}
                selectedMono={s.m}
                vars={boardVars(s.d, s.m, bsWeight)}
              />
            </section>

            <section className="sp-section sp-decision" aria-label="Decision">
              <h2 className="t-label">Decision</h2>
              <pre className="t-mono">{JSON.stringify(decision, null, 2)}</pre>
              <button type="button" className="sp-copy t-ui-caps" onClick={copyDecision}>
                Copy decision
              </button>
              <p className="sp-note t-label" role="status">
                {copied ? 'copied. Reply with display=<face> mono=<face>, and the GC Grind licence if chosen.' : ''}
              </p>
            </section>
          </div>
        )}
      </main>

      <p className="sp-footer-note t-label">
        Faces swap through --ff-display / --ff-mono and the metric block only (plan 4.2). Missing glyphs are
        highlighted. Dev route: app/dev/specimen, not a route in a production build.
      </p>
    </div>
  );
}

// ── Stamps ───────────────────────────────────────────────────────────────

function StampBoards({ grounds, samples }: { grounds: ('ink' | 'paper')[]; samples: Samples }) {
  const [cover, setCover] = useState<{ lang: LangCode; words: string[]; missing: string[] }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: { lang: LangCode; words: string[]; missing: string[] }[] = [];
      for (const code of LANG_CODES) {
        const words = Object.values(SAMPLES[code].stamps);
        out.push({ lang: code, words, missing: await missingChars(MORNSEY_FAMILY, 400, words.join('')) });
      }
      if (!cancelled) setCover(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const words = [samples.stamps.approved, samples.stamps.proof, samples.stamps.void];
  const en = Object.values(SAMPLES.en.stamps);
  return (
    <>
      {grounds.map((g) => (
        <div className="sp-board" data-theme={g} key={g} style={{ borderTop: '1px solid var(--rule)' }}>
          <p className="t-label sp-tlabel">{g}</p>
          <div className="sp-stamps">
            {en.map((w) =>
              [64, 96, 160].map((size) => (
                <span
                  key={`${w}-${size}`}
                  className={`sp-stamp ${g === 'ink' ? 'sp-stamp-tone-brand' : 'sp-stamp-tone-fg'}`}
                  style={{ '--sz': `${size}px` } as CSSProperties}
                  aria-hidden="true"
                >
                  {w}
                </span>
              ))
            )}
          </div>
          <p className="sp-note t-label">
            Active locale strings: {words.join(' / ')}. Coverage note: Mornsey has no Latin Extended-A and no inverted
            ? or !; capped at 1 per viewport, 2 per page, never in sentences.
          </p>
        </div>
      ))}
      <div className="sp-scroll">
        <table className="sp-table t-mono">
          <thead>
            <tr>
              <th>locale</th>
              <th>approved / proof / void</th>
              <th>glyphs missing</th>
            </tr>
          </thead>
          <tbody>
            {(cover ?? []).map((r) => (
              <tr key={r.lang}>
                <td>{r.lang}</td>
                <td>{r.words.join(' / ')}</td>
                <td>{r.missing.length ? `MISSING: ${r.missing.join(' ')}` : 'none'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Metrics panel ────────────────────────────────────────────────────────

const f2 = (n: number | undefined) => (n === undefined ? '...' : n.toFixed(3));

function MetricsPanel({
  metrics,
  bsWeight,
  selected,
  selectedMono,
  vars,
}: {
  metrics: MetricsResult | null;
  bsWeight: 800 | 900;
  selected: DisplayId;
  selectedMono: MonoId;
  vars: CSSProperties;
}) {
  return (
    <>
      <div className="sp-scroll">
        <table className="sp-table t-mono">
          <thead>
            <tr>
              <th>display</th>
              <th>wt</th>
              <th>fit em/char</th>
              <th>caps adv em</th>
              <th>cap h</th>
              <th>accent up</th>
              <th>tail down</th>
              <th>lh</th>
              <th>min lh bare</th>
              <th>clip @.8</th>
              <th>clip @lh+.12em</th>
              <th>licence</th>
            </tr>
          </thead>
          <tbody>
            {DISPLAY_IDS.map((id) => {
              const m = metrics?.display[id];
              const face = DISPLAY_FACES[id];
              return (
                <tr key={id} data-selected={id === selected}>
                  <td>{face.label}</td>
                  <td>{displayWeight(id, bsWeight)}</td>
                  <td>{f2(m?.fit)}</td>
                  <td>{f2(m?.meanCaps)}</td>
                  <td>{f2(m?.capH)}</td>
                  <td>{f2(m?.accentAsc)}</td>
                  <td>{f2(m?.descBelow)}</td>
                  <td>{face.lh}</td>
                  <td>{m ? m.minLhBare.toFixed(2) : '...'}</td>
                  <td>{m ? (m.clipTight > 0.002 ? `CLIPS ${m.clipTight.toFixed(3)}` : 'ok') : '...'}</td>
                  <td>{m ? (m.clipPlan > 0.002 ? `CLIPS ${m.clipPlan.toFixed(3)}` : 'ok') : '...'}</td>
                  <td>{face.licence}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sp-scroll" style={{ marginTop: 24 }}>
        <table className="sp-table t-mono">
          <thead>
            <tr>
              <th>mono</th>
              <th>advance (em)</th>
              <th>cap height</th>
              <th>--mono-track</th>
            </tr>
          </thead>
          <tbody>
            {MONO_IDS.map((id) => (
              <tr key={id} data-selected={id === selectedMono}>
                <td>{MONO_FACES[id].label}</td>
                <td>{f2(metrics?.mono[id]?.advance)}</td>
                <td>{f2(metrics?.mono[id]?.capH)}</td>
                <td>{MONO_FACES[id].track}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="t-label sp-tlabel" style={{ marginTop: 32 }}>
        Clipping test (selected face): line-height .8 and overflow hidden, versus the plan default
      </h3>
      <div className="sp-board sp-clip" style={{ ...vars, padding: 0, border: 0 }} data-theme="ink">
        <div className="sp-clip-box" data-variant="tight" aria-label="line-height 0.8, no padding">
          {CLIP_PROBE}
        </div>
        <div className="sp-clip-box" data-variant="plan" aria-label="line-height 0.9 with 0.12em padding">
          {CLIP_PROBE}
        </div>
      </div>
    </>
  );
}
