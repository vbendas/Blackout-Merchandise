'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Chip as ChipType } from '@/lib/ui-cards/schemas';
import type { Greeting, ResumeTarget } from '@/components/chat/useConversation';
import type { StudioHomeData } from '@/lib/services/studio-home';
import { humanStatus } from '@/lib/format/status';

const BARE_HEADLINE = 'What are we making?';
const HEADLINE_CLASS =
  'mf-display text-[36px] leading-[1.04] tracking-[-0.035em] md:text-[56px] md:leading-[1.02]';
const MAX_CHIPS = 3;

/** The home headline. A first name ("What are we making, Nova?") stays only
 * while the whole line fits on one line; on a narrow screen or with a long
 * name it falls back to the plain question. A hidden copy of the long
 * version measures it, so nothing flashes. */
function Headline({ text }: { text: string }) {
  const named = text !== BARE_HEADLINE;
  const boxRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const probe = probeRef.current;
    if (!named || !box || !probe) return;
    const measure = () => setFits(probe.offsetWidth <= box.clientWidth);
    // Measured before paint, so the name never flashes in and out.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [named, text]);

  return (
    <div ref={boxRef} className="relative">
      <h1 className={HEADLINE_CLASS}>{named && !fits ? BARE_HEADLINE : text}</h1>
      {named ? (
        // Zero-size and clipped, so the long line never widens the page.
        <span aria-hidden className="pointer-events-none invisible absolute top-0 left-0 h-0 w-0 overflow-hidden">
          <span ref={probeRef} className={`${HEADLINE_CLASS} whitespace-nowrap`}>
            {text}
          </span>
        </span>
      ) : null}
    </div>
  );
}

/** "Copy link" for the shop address; says so when it worked, and shows the
 * address itself when the browser would not copy it. */
function CopyLink({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2400);
  }

  return (
    <>
      <button type="button" onClick={() => void copy()} className="mf-ulink ml-1.5 align-baseline">
        {state === 'copied' ? 'Link copied' : 'Copy link'}
      </button>
      {state === 'failed' ? <span className="ml-1.5 text-[color:var(--signal)]">{label}</span> : null}
      <span role="status" className="sr-only">
        {state === 'copied' ? 'Shop link copied' : ''}
      </span>
    </>
  );
}

/** The Studio home's opening: the question, then one line on the shop. A live
 * shop with no sales yet also gets a Copy link action, so the line says what
 * to do next. */
export function EmptyGreeting({ greeting, home }: { greeting: Greeting; home: StudioHomeData | null }) {
  const shop = home?.shop ?? null;
  const showCopy = Boolean(home && shop?.live && shop.productsLive > 0 && home.salesThisMonth.count === 0);

  return (
    <div className="mf-rise mf-rise-d1 w-full min-w-0">
      <Headline text={greeting.headline} />
      {greeting.line ? (
        <p className="mf-home-sub mt-2 text-[16px] leading-[1.4] tracking-[-0.01em] md:mt-2.5 md:text-[20px]">
          {greeting.line}
          {showCopy && shop ? <CopyLink url={shop.url} label={shop.urlLabel} /> : null}
        </p>
      ) : null}
    </div>
  );
}

function isUploadAction(label: string): boolean {
  const text = label.toLowerCase();
  return text.includes('upload') || text.includes('artwork');
}

/** Up to three text-only suggestions. On phones they sit in one row that
 * scrolls sideways and fades at the right edge while there is more to see. */
export function QuickActionsRow({
  actions,
  onSend,
  onUploadClick,
}: {
  actions: ChipType[];
  onSend: (text: string) => void;
  /** 'Upload artwork' opens the image picker instead of sending a prompt */
  onUploadClick: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [fadeEnd, setFadeEnd] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () => setFadeEnd(row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
    update();
    row.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [actions]);

  if (actions.length === 0) return null;
  return (
    <div
      ref={rowRef}
      role="group"
      aria-label="Suggestions"
      data-fade-end={fadeEnd}
      className="mf-chip-row mx-auto w-full max-w-[720px]"
    >
      {actions.slice(0, MAX_CHIPS).map((action, index) => (
        <button
          key={action.label}
          type="button"
          onClick={() => (isUploadAction(action.label) ? onUploadClick() : onSend(action.prompt ?? action.label))}
          className={`mf-chip mf-rise mf-rise-d${Math.min(index + 2, 6)}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

/** Under the composer on the Studio home: one line back into the previous
 * conversation (opens /studio/s/<id>), styled like the website's underlined
 * text links. */
export function ResumeLine({
  resume,
  onOpen,
  className = '',
}: {
  resume: ResumeTarget;
  onOpen: (conversationId: string) => void;
  className?: string;
}) {
  return (
    <div className={`mf-rise mf-rise-d3 flex w-full max-w-[720px] min-w-0 items-baseline gap-3 ${className}`}>
      <span className="mf-label mf-dimmed shrink-0">Continue</span>
      <button type="button" onClick={() => onOpen(resume.conversationId)} className="mf-ulink min-w-0 truncate">
        {resume.label}
        {resume.status ? <span className="mf-dimmed"> · {humanStatus(resume.status)}</span> : null}
      </button>
    </div>
  );
}
