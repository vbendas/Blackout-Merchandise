import { describeScreenEffect } from '@/lib/pricing/screen-print';
import type { ApprovalGarment, ApprovalScreenSet } from '@/lib/services/print-prep';

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

/** What the screen count does to a run's price: the count and its effect in one
 * line ("6 screens: no surcharge", "11 screens: +€3 per piece"), then the fixed
 * rule behind it. The count is the set's own, read from lib/pricing/screen-print.ts
 * like the quote is, so the page and the run's price cannot disagree. Over the
 * standard 8, it says how to bring the price down. */
function PriceLine({ screens }: { screens: number }) {
  const effect = describeScreenEffect(screens);
  return (
    <>
      <p className="ap-a8">
        <span className="font-semibold text-[var(--signal)]">{effect.line}.</span>
      </p>
      <p className="ap-a8">
        {effect.rule}
        {effect.over > 0 ? ' For fewer screens, ask in the chat: the look changes, and you approve the new proof again.' : ''}
      </p>
    </>
  );
}

/** Runs · screen print: the screen set that prints the chosen colour, with the
 * screen count against the standard 8, which colours share the screens, the
 * inks in press order by their plain names (never a Pantone code), what the
 * whites are for, and what the count does to the price of a run. */
export function ScreenPanel({ set, garment }: { set: ApprovalScreenSet | null; garment: ApprovalGarment | null }) {
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
      <PriceLine screens={set.screenCount} />
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
