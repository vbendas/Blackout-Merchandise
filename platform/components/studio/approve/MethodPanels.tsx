import Link from 'next/link';
import { SCREEN_RULE, describePositionEffect, describeScreenEffect, eurosFixed } from '@/lib/pricing/screen-print';
import type { ApprovalArea, ApprovalGarment, ApprovalRelatedDesign, ApprovalScreenSet } from '@/lib/services/print-prep';
import { joinNames } from './approve-logic';

/** A screen set as the runs tab reads it: the view's set, and the print area it prints when the view says so (`areaKey` is the
 * area's own key, ApprovalArea.key). A design printed on the front and the back has a set of screens for each. */
export type AreaScreenSet = ApprovalScreenSet & { areaKey?: string };

/** Shop products · DTG/DTF: how every product in the shop prints, with the
 * facts for the chosen garment colour (what is left out, how fades and whites
 * print). */
export function ShopPanel({ facts }: { facts: readonly string[] }) {
  return (
    <section className="ap-block">
      <h2 className="mf-label">Shop products · DTG/DTF</h2>
      <p className="ap-headline">Every product in your shop prints this way: full colour with a white base, one piece at a time.</p>
      <ul className="ap-facts">
        {facts.map((fact, index) => (
          <li key={`${index}-${fact}`}>{fact}</li>
        ))}
      </ul>
    </section>
  );
}

/** One print position of this artwork on the chosen garment colour, with the colours its own design prints there. `position` is
 * left out when the page can't say which one it is. */
interface PricedPosition {
  position: string | null;
  screens: number;
}

/** The screen sets of the artwork on this garment colour, one for each print area that has one. Sets that name no area (a view
 * with one) belong to its only area; with several areas and no names the one set on show stands alone, without a position. */
function positionsOf(set: ApprovalScreenSet, garment: ApprovalGarment | null, sets: readonly AreaScreenSet[], areas: readonly ApprovalArea[]): PricedPosition[] {
  const named: PricedPosition[] = [];
  for (const area of areas) {
    const own = sets.find((candidate) => candidate.areaKey === area.key && (!garment || candidate.garmentCodes.includes(garment.code)));
    if (own) named.push({ position: area.position, screens: own.screenCount });
  }
  if (named.length > 0) return named;
  return [{ position: areas.length === 1 ? areas[0].position : null, screens: set.screenCount }];
}

/** What the colours do to a run's price, print position by print position (owner, 16 Oct 2026: the colours above 8 are a euro a
 * piece on each position, on its own design): 'Front chest · 10 colours: +€2.00 per piece', 'Back · 6 colours: no surcharge', and
 * what they add together, then the fixed rule behind it. Each count is the set's own, read from lib/pricing/screen-print.ts like
 * the quote is, so the page and the run's price cannot disagree. Over the standard 8, it says how to bring the price down. Colour
 * words only: the inks are named elsewhere on the page, never by a code. */
function PriceLines({ positions }: { positions: readonly PricedPosition[] }) {
  const rows = positions.map((p) => {
    if (p.position === null) {
      const effect = describeScreenEffect(p.screens);
      return { line: effect.line, over: effect.over, cents: effect.surchargeCents };
    }
    const effect = describePositionEffect({ position: p.position, screens: p.screens });
    return { line: `${effect.line}${effect.surchargeCents > 0 ? ' per piece' : ''}`, over: effect.over, cents: effect.surchargeCents };
  });
  const together = rows.reduce((sum, row) => sum + row.cents, 0);
  const charged = rows.filter((row) => row.cents > 0).length;
  return (
    <>
      {rows.length === 1 ? (
        <p className="ap-a8">
          <span className="font-semibold text-[var(--signal)]">{rows[0].line}.</span>
        </p>
      ) : (
        <ul className="ap-facts">
          {rows.map((row, index) => (
            <li key={`${index}-${row.line}`}>
              <span className="font-semibold text-[var(--signal)]">{row.line}.</span>
            </li>
          ))}
        </ul>
      )}
      {charged > 1 ? <p className="ap-a8">Together these add {eurosFixed(together)} to each piece.</p> : null}
      <p className="ap-a8">
        {SCREEN_RULE}
        {rows.some((row) => row.over > 0) ? ' For fewer colours, ask in the chat: the look changes, and you approve the new proof again.' : ''}
      </p>
    </>
  );
}

/** Runs · screen print: the screen set that prints the chosen colour, with the
 * screen count against the standard 8, which colours share the screens, the
 * inks in press order by their plain names (never a Pantone code), what the
 * whites are for, and what the colours do to the price of a run, for each print
 * position of the artwork. `sets` and `areas` (the view's) let it name every
 * position; without them it prices the one set on show. */
export function ScreenPanel({
  set,
  garment,
  sets = [],
  areas = [],
}: {
  set: ApprovalScreenSet | null;
  garment: ApprovalGarment | null;
  sets?: readonly AreaScreenSet[];
  areas?: readonly ApprovalArea[];
}) {
  if (!set) {
    return (
      <section className="ap-block">
        <h2 className="mf-label">Runs · screen print</h2>
        <p className="ap-headline">{garment ? `The screen print version for ${garment.name} is not ready yet.` : 'The screen print version is not ready yet.'}</p>
        <p className="ap-a8">Runs print from their own set of screens. Check again in a moment, or ask in the chat.</p>
      </section>
    );
  }

  return (
    <section className="ap-block">
      <h2 className="mf-label">Runs · screen print · {set.name}</h2>
      <p className="ap-headline">{set.headline}</p>
      <p className="ap-a8">{set.shared}</p>
      <ol className="ap-inks" role="list">
        {set.inks.map((ink) => (
          <li key={ink.n} className="ap-ink">
            <span className="ap-ink-n">{ink.n}</span>
            <span className="ap-ink-sw" aria-hidden style={{ background: ink.hex }} />
            <span className="ap-ink-name">
              <span>{ink.name}</span>
              {ink.detail ? <span className="ap-ink-detail">{ink.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <PriceLines positions={positionsOf(set, garment, sets, areas)} />
    </section>
  );
}

/** The other artwork printed on the same products (a different back, a sleeve
 * logo): each has its own approval page, which these products need too before
 * they go live. Nothing is drawn when the products print this design alone. */
export function RelatedPanel({ related, sessionId }: { related: readonly ApprovalRelatedDesign[]; sessionId: string | null }) {
  if (related.length === 0) return null;
  return (
    <section className="ap-block ap-block-tight">
      <h2 className="mf-label">Other artwork on these products</h2>
      <ul className="ap-facts">
        {related.map((item) => (
          <li key={item.designId}>
            {joinNames(item.areas)}: {item.approved ? 'approved' : 'needs its own approval'}.{' '}
            <Link className="ap-inline-link" href={`/studio/approve/${item.designId}${sessionId ? `?from=${encodeURIComponent(sessionId)}` : ''}`}>
              Open its proofs
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Worth a look: what the engine noticed, in plain words. Nothing is drawn
 * when there is nothing to say. */
export function WarningsPanel({ warnings }: { warnings: readonly string[] }) {
  if (warnings.length === 0) return null;
  return (
    <section className="ap-block ap-block-tight">
      <h2 className="mf-label">Worth a look</h2>
      <ul className="ap-facts">
        {warnings.map((warning, index) => (
          <li key={`${index}-${warning}`}>{warning}</li>
        ))}
      </ul>
    </section>
  );
}
