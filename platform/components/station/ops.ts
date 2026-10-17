// Changes on their way to the server, laid over the numbers the server last gave. The station draws
// the server's job with the pending changes applied, so a tap shows at once; when an answer comes
// back the change is taken off the list and the server's own numbers (which include it) are drawn,
// and when it fails it is taken off and the screen goes back to what the server has. Because the
// list is applied again over every fresh set of server numbers, a poll that lands while a tap is
// still on its way does not flick the screen back. Pure and client-safe.
import type { ProductionStage, ScreenStatus, StationJobDetail } from '@/lib/services/production-progress';
import { applyDelta, clampCount } from './counter';
import { screenIsReady } from './model';

export type Op =
  | { id: number; kind: 'adjust'; lineKey: string; delta: number }
  | { id: number; kind: 'set'; lineKey: string; value: number }
  | { id: number; kind: 'screen'; screenKey: string; status: ScreenStatus }
  | { id: number; kind: 'stage'; stage: ProductionStage }
  | { id: number; kind: 'hidden'; hidden: boolean };

/** What a job looks like with its pending changes applied, in the order they were made. The totals are the server's own plus what the changes moved, so a number the server counts differently (what "ready" means) stays its. */
export function applyOps(server: StationJobDetail, ops: readonly Op[]): StationJobDetail {
  if (ops.length === 0) return server;

  const printed = new Map(server.lines.map((l) => [l.key, l.printed]));
  const totals = new Map(server.lines.map((l) => [l.key, l.total]));
  const status = new Map(server.screens.map((s) => [s.key, s.status]));
  let stage = server.stage;
  let hidden = server.hiddenFromBoard;
  for (const op of ops) {
    if (op.kind === 'adjust' && printed.has(op.lineKey)) printed.set(op.lineKey, applyDelta(printed.get(op.lineKey)!, op.delta, totals.get(op.lineKey)!));
    else if (op.kind === 'set' && printed.has(op.lineKey)) printed.set(op.lineKey, clampCount(op.value, totals.get(op.lineKey)!));
    else if (op.kind === 'screen' && status.has(op.screenKey)) status.set(op.screenKey, op.status);
    else if (op.kind === 'stage') stage = op.stage;
    else if (op.kind === 'hidden') hidden = op.hidden;
  }

  // What the changes did not touch stays the very same array and objects, so a screen that draws only what changed can tell.
  const linesChanged = server.lines.some((l) => printed.get(l.key) !== l.printed);
  const screensChanged = server.screens.some((s) => status.get(s.key) !== s.status);
  const lines = linesChanged ? server.lines.map((l) => (printed.get(l.key) === l.printed ? l : { ...l, printed: printed.get(l.key)! })) : server.lines;
  const screens = screensChanged ? server.screens.map((s) => (status.get(s.key) === s.status ? s : { ...s, status: status.get(s.key)! })) : server.screens;

  const printedDelta = lines.reduce((n, l) => n + l.printed, 0) - server.lines.reduce((n, l) => n + l.printed, 0);
  const readyBefore = server.screens.filter((s) => screenIsReady(s.status)).length;
  const readyDelta = screens.filter((s) => screenIsReady(s.status)).length - readyBefore;

  return {
    ...server,
    stage,
    hiddenFromBoard: hidden,
    lines,
    screens,
    printed: server.printed + printedDelta,
    ...(server.screens.length > 0 ? { screensReady: (server.screensReady ?? readyBefore) + readyDelta, screensTotal: server.screensTotal ?? server.screens.length } : {}),
  };
}
