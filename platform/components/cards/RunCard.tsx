'use client';

import type { Card } from '@/lib/ui-cards/schemas';
import { runLabel } from '@/lib/format/runs';
import { ActionRow, CardFrame, CardHead, SpecRows, type ActionItem, type SpecRowData } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type RunCardType = Extract<Card, { kind: 'run' }>;

const DEFAULT_VALUE = { done: 'Done', current: 'Now', next: 'Next' } as const;

/** One run as the website's run page shows it: the piece on the plate, the
 * run's number, what it is, one plain sentence, and its stages as rows with
 * the state on the right (a dot marks where it is now). */
export function RunCard({ card, ctx }: { card: RunCardType; ctx: CardActionContext }) {
  const label = runLabel(card.runNumber);

  const rows: SpecRowData[] = card.steps.map((step, index) => ({
    key: `${step.label}-${index}`,
    label: step.label,
    state: step.state,
    value: step.value ?? DEFAULT_VALUE[step.state],
  }));

  const actions: ActionItem[] = (card.actions ?? []).map((chip, index) => ({
    key: `${chip.label}-${index}`,
    label: chip.label,
    primary: chip.primary,
    onClick: () => ctx.onPrompt(chip.prompt ?? chip.label),
  }));

  return (
    <CardFrame media={card.imageUrl} role="group" aria-label={`${label}, ${card.status}`}>
      <CardHead label={label} title={card.title} sentence={card.description} />
      <SpecRows rows={rows} />
      <ActionRow actions={actions} />
    </CardFrame>
  );
}
