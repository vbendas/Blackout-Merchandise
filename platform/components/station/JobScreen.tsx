'use client';

// One job at a production station: the interactive job sheet. The stage as a stepper with one big button for the next step; the screens (every
// film in press order, each with a five-button status); the pieces by garment and colour (each size with its counter and a big keypad); the
// proofs, big, to zoom into; and the job sheet itself with its PDF. A change shows at once and is sent to the server; the server's numbers are
// what the screen shows once the answer comes back, and a change that fails goes back with a message. The numbers are asked for again every ten
// seconds (other iPads' counts), unless a change is still on its way.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { adjustPrintedAction, refreshJobAction, setHiddenAction, setPrintedAction, setScreenStatusAction, setStageAction } from '@/app/station/actions';
import type { JobPage } from '@/app/station/data';
import type { ProductionStage, ProgressLine, ScreenProgress, ScreenStatus, StationJobDetail } from '@/lib/services/production-progress';
import { matchFilms } from './films';
import { IconBack, IconCheck, IconNext } from './icons';
import { usePoll } from './hooks';
import { Dialog } from './Dialog';
import { Keypad } from './Keypad';
import { jobNumberLabel, nextStage, nextStageLabel, METHOD_LABEL, percent, POLL_MS, screensBlocking, stageRank, stageWarnings, STAGE_LABEL, type StationResult } from './model';
import { applyOps, type Op } from './ops';
import { PiecesPanel } from './PiecesPanel';
import { ProofsPanel } from './ProofsPanel';
import { ScreensPanel } from './ScreensPanel';
import { SheetPanel } from './SheetPanel';
import { StationBar } from './StationBar';
import { Stepper } from './Stepper';
import { Toasts, type Toast } from './Toasts';
import { UpdatedLine } from './UpdatedLine';
import { ScreenOnToggle } from './WakeLock';

type Tab = 'screens' | 'pieces' | 'proofs' | 'sheet';

/** The tab a job opens on: the screens while they are being made and after the press (to reclaim them), the pieces otherwise. */
function defaultTab(job: StationJobDetail): Tab {
  return job.method === 'screen' && (job.stage === 'queued' || job.stage === 'screens' || job.stage === 'curing') ? 'screens' : 'pieces';
}

/** A move the person is asked about first: Job done always (it packs the orders), and any move the service would hold up (so it can be forced). */
interface Move {
  target: ProductionStage;
  warnings: string[];
  finishing: boolean;
}

type OpInput = Op extends infer O ? (O extends { id: number } ? Omit<O, 'id'> : never) : never;

export function JobScreen({ job: first, view, sheetProblem, adminHref }: JobPage & { adminHref: string }) {
  const jobId = first.jobId;
  const [server, setServer] = useState(first);
  const [pending, setPending] = useState<Op[]>([]);
  const detail = useMemo(() => applyOps(server, pending), [server, pending]);
  const [tab, setTab] = useState<Tab>(() => defaultTab(first));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [keypadFor, setKeypadFor] = useState<string | null>(null);
  const [move, setMove] = useState<Move | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  const seq = useRef(0);
  const toastSeq = useRef(0);
  const pendingCount = useRef(0);
  useEffect(() => {
    pendingCount.current = pending.length;
  }, [pending]);

  const notify = useCallback((text: string) => setToasts((all) => [...all.slice(-2), { id: ++toastSeq.current, text }]), []);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  /** Shows a change at once and sends it. The answer carries the server's numbers (shown from then on); a failure takes the change off again and says why. */
  const send = useCallback(
    async (input: OpInput, call: () => Promise<StationResult<StationJobDetail>>): Promise<boolean> => {
      const op = { ...input, id: ++seq.current } as Op;
      setPending((all) => [...all, op]);
      let saved = false;
      try {
        const result = await call();
        if (result.ok) {
          saved = true;
          setServer(result.value);
          setUpdatedAt(Date.now());
          setProblem(null);
        } else {
          notify(result.error);
        }
      } catch {
        setProblem('No connection to the server.');
        notify('No connection. That change was not saved.');
      } finally {
        setPending((all) => all.filter((o) => o.id !== op.id));
      }
      return saved;
    },
    [notify],
  );

  const refresh = useCallback(async () => {
    // A change on its way is laid over whatever comes back, but a poll that left before it could answer from before it: wait for it.
    if (pendingCount.current > 0) return;
    try {
      const result = await refreshJobAction(jobId);
      if (pendingCount.current > 0) return;
      if (result.ok) {
        setServer(result.value);
        setUpdatedAt(Date.now());
        setProblem(null);
        setGone(false);
      } else if (/not found/i.test(result.error)) {
        setGone(true);
      } else {
        setProblem(result.error);
      }
    } catch {
      setProblem('No connection to the server.');
    }
  }, [jobId]);
  const refreshNow = usePoll(refresh, POLL_MS);

  // --- what the person can do
  const canWork = server.canWork === true && server.stage !== 'shipped' && !gone;
  const held = detail.method === 'screen' && stageRank(detail.stage) < stageRank('printing') ? screensBlocking(detail.screens) : null;
  const canCount = canWork && !held;

  const adjust = (line: ProgressLine, delta: number) => void send({ kind: 'adjust', lineKey: line.key, delta }, () => adjustPrintedAction(jobId, line.key, delta));
  const setCount = (line: ProgressLine, value: number) => void send({ kind: 'set', lineKey: line.key, value }, () => setPrintedAction(jobId, line.key, value));
  const setStatus = (screen: ScreenProgress, status: ScreenStatus) => void send({ kind: 'screen', screenKey: screen.key, status }, () => setScreenStatusAction(jobId, screen.key, status));
  const setHidden = (hidden: boolean) => void send({ kind: 'hidden', hidden }, () => setHiddenAction(jobId, hidden));
  const moveTo = (target: ProductionStage, force: boolean) => void send({ kind: 'stage', stage: target }, () => setStageAction(jobId, target, force));

  function requestStage(target: ProductionStage) {
    if (!canWork || target === detail.stage) return;
    const warnings = stageWarnings(detail, target);
    const finishing = target === 'folding' && stageRank(detail.stage) < stageRank('folding');
    if (warnings.length === 0 && !finishing) moveTo(target, false);
    else setMove({ target, warnings, finishing });
  }

  // --- what is drawn
  const swatches = useMemo(() => new Map((view?.garments.rows ?? []).filter((g) => g.colourHex).map((g) => [`${g.blankName}|${g.colourName}`, g.colourHex as string])), [view]);
  const films = useMemo(() => matchFilms(view, detail.screens), [view, detail.screens]);
  const hasScreens = detail.method === 'screen';
  const ready = detail.screensReady ?? 0;
  const next = nextStage(detail.method, detail.stage);
  const nextLabel = nextStageLabel(detail.method, detail.stage);
  const keypadLine = keypadFor ? detail.lines.find((l) => l.key === keypadFor) : undefined;
  const number = jobNumberLabel(detail.runNumber);

  const tabs: { id: Tab; label: string; count: string | null }[] = [
    ...(hasScreens ? [{ id: 'screens' as const, label: 'Screens', count: `${ready}/${detail.screensTotal ?? detail.screens.length}` }] : []),
    { id: 'pieces', label: 'Pieces', count: `${detail.printed}/${detail.total}` },
    { id: 'proofs', label: 'Proofs', count: view ? String(view.proofs.length) : null },
    { id: 'sheet', label: 'Job sheet', count: null },
  ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'pieces';

  return (
    <>
      <StationBar
        title={detail.designTitle}
        subtitle={
          <>
            {number ? (
              <>
                <b className="st-no">{number}</b>
                {' · '}
              </>
            ) : null}
            {`${detail.shopName} · ${METHOD_LABEL[detail.method]} · ${STAGE_LABEL[detail.stage]}`}
          </>
        }
        lead={
          <Link href="/station" className="st-btn st-btn-back" aria-label="Back to the queue">
            <IconBack />
            <span>Queue</span>
          </Link>
        }
      >
        <UpdatedLine at={updatedAt} saving={pending.length > 0} problem={problem !== null} />
        <ScreenOnToggle />
      </StationBar>

      <main className="st-main">
        {gone ? (
          <p className="st-banner" role="alert">
            <span>This job is not on the floor any more. It may have shipped or been cleared.</span>
            <Link href="/station" className="st-btn">
              Back to the queue
            </Link>
          </p>
        ) : null}
        {problem && !gone ? (
          <p className="st-banner" role="alert">
            <span>{problem}</span>
            <button type="button" className="st-btn" onClick={() => void refreshNow()}>
              Try again
            </button>
          </p>
        ) : null}
        {server.canWork !== true ? <p className="st-note">View only. Counting pieces, setting screens and moving the job needs Production Work access.</p> : null}

        <section className="st-overview" aria-label="Where the job is">
          <Stepper method={detail.method} stage={detail.stage} canWork={canWork} onPick={requestStage} />
          <div className="st-overview-row">
            <div className="st-progress-big">
              <p className="st-progress-line">
                <span>
                  <b>{detail.printed}</b> / {detail.total} printed
                </span>
                {hasScreens ? (
                  <span className="st-dim">
                    Screens ready <b>{ready}</b> / {detail.screensTotal ?? detail.screens.length}
                  </span>
                ) : null}
              </p>
              <div className="st-meter st-meter-big" role="progressbar" aria-label={`${detail.printed} of ${detail.total} printed`} aria-valuemin={0} aria-valuemax={detail.total} aria-valuenow={detail.printed}>
                <span style={{ width: `${percent(detail.printed, detail.total)}%` }} />
              </div>
            </div>
            <div className="st-next">
              {detail.stage === 'shipped' ? (
                <p className="st-done" role="status">
                  <IconCheck /> <span>Shipped.</span>
                </p>
              ) : detail.stage === 'folding' ? (
                <div className="st-done" role="status">
                  <IconCheck />
                  <p>
                    <b>Job done.</b> <span className="st-dim">It is with shipping: the tracking is added in Production.</span>
                  </p>
                  <a className="st-btn" href={adminHref}>
                    Open Production
                  </a>
                </div>
              ) : next && nextLabel ? (
                <button type="button" className="st-btn st-btn-primary st-btn-next" disabled={!canWork} onClick={() => requestStage(next)}>
                  <span>{nextLabel}</span>
                  <IconNext />
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="st-tabs-bar">
          <div className="st-tabs" role="tablist" aria-label="Job">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={activeTab === t.id} aria-controls={`panel-${t.id}`} className="st-tab" onClick={() => setTab(t.id)}>
                {t.label}
                {t.count ? <span className="st-tab-count">{t.count}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="st-panel">
          {activeTab === 'screens' ? <ScreensPanel groups={films} canWork={canWork} stage={detail.stage} onStatus={setStatus} /> : null}
          {activeTab === 'pieces' ? <PiecesPanel lines={detail.lines} swatches={swatches} canCount={canCount} held={held} onAdjust={adjust} onSet={setCount} onOpenKeypad={(line) => setKeypadFor(line.key)} /> : null}
          {activeTab === 'proofs' ? <ProofsPanel proofs={view?.proofs ?? []} problem={sheetProblem} /> : null}
          {activeTab === 'sheet' ? <SheetPanel view={view} problem={sheetProblem} pdfUrl={detail.jobSheetUrl} adminHref={adminHref} hidden={detail.hiddenFromBoard === true} canWork={canWork} onHidden={setHidden} /> : null}
        </div>
      </main>

      {keypadLine ? (
        <Keypad
          line={keypadLine}
          onClose={() => setKeypadFor(null)}
          onSet={(value) => {
            setKeypadFor(null);
            setCount(keypadLine, value);
          }}
        />
      ) : null}

      {move ? (
        <Dialog title={move.finishing ? 'Job done?' : `Move to ${STAGE_LABEL[move.target]}?`} onClose={() => setMove(null)}>
          {move.finishing ? <p className="st-dialog-sub">Orders whose pieces are all printed are packed now and go to Production, where each one ships with its tracking.</p> : null}
          {move.warnings.length > 0 ? (
            <ul className="st-warnings">
              {move.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <div className="st-dialog-actions">
            <button type="button" className="st-btn" onClick={() => setMove(null)}>
              {move.warnings.length > 0 ? 'Not yet' : 'Cancel'}
            </button>
            <button
              type="button"
              className="st-btn st-btn-primary"
              data-autofocus
              onClick={() => {
                moveTo(move.target, move.warnings.length > 0);
                setMove(null);
              }}
            >
              {move.finishing ? (move.warnings.length > 0 ? 'Job done anyway' : 'Job done') : 'Move anyway'}
            </button>
          </div>
        </Dialog>
      ) : null}

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
