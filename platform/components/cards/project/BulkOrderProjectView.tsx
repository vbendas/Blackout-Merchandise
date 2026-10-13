import { humanStatus } from '@/lib/format/status';
import { runLabel } from '@/lib/format/runs';
import { ActionRow, CardHead, RowSub, SpecRows, formatMoney, type ActionItem, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, runStatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';
import type { BulkOrderProjectState } from '@/components/cards/project/types';

/** The next step for a run at this stage, as a message to the assistant. */
function nextSteps(status: string, label: string, ctx: CardActionContext): ActionItem[] {
  const send = (text: string) => () => ctx.onPrompt(text);
  switch (status) {
    case 'quoted':
      return [{ key: 'proof', label: 'Send the proof', primary: true, onClick: send(`Send the proof for ${label}`) }];
    case 'proof_pending':
      return [
        { key: 'approve', label: 'Approve the proof', primary: true, onClick: send(`Approve the proof for ${label}`) },
        { key: 'changes', label: 'Ask for changes', onClick: send(`Ask for changes to the proof for ${label}`) },
      ];
    case 'awaiting_payment':
      return [{ key: 'pay', label: `Pay for ${label}`, primary: true, onClick: send(`Pay for ${label}`) }];
    default:
      return [];
  }
}

export function BulkOrderProjectView({ state, ctx }: { state: BulkOrderProjectState; ctx: CardActionContext }) {
  const lines = state.lines ?? [];
  const label = state.runNumber ? runLabel(state.runNumber) : 'this run';
  const pieces = lines.reduce((sum, line) => sum + line.qty, 0);

  const rows: SpecRowData[] = [
    ...lines.map((line, index) => ({
      key: `line-${index}`,
      label: (
        <>
          {line.label}
          {line.colour ? ` · ${line.colour}` : ''}
          <RowSub>
            {line.qty} {line.qty === 1 ? 'piece' : 'pieces'}
            {line.sizes ? ` · ${line.sizes}` : ''}
          </RowSub>
        </>
      ),
      value: line.totalCents !== undefined ? formatMoney(line.totalCents) : undefined,
    })),
    ...(lines.length > 0 && typeof state.totalCents === 'number' ? [{ key: 'total', label: 'Total', value: formatMoney(state.totalCents), strong: true }] : []),
    ...(state.shipTo ? [{ key: 'shipTo', label: 'Ships to', value: state.shipTo }] : []),
  ];

  return (
    <div className="mfc-stack">
      <CardHead
        title={lines.length === 0 ? 'No pieces yet' : `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`}
        aside={state.status ? <StatusPill label={humanStatus(state.status)} tone={runStatusTone(state.status)} /> : undefined}
      />
      <SpecRows rows={rows} variant="plain" />
      <ActionRow actions={nextSteps(state.status, label, ctx)} />
    </div>
  );
}
