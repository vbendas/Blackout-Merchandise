'use client';

// The queue at a production station: the jobs on the floor as cards (the proof, the job's number, the design and shop, the method, the stage, how many
// pieces are printed and how many screens are ready), in the order to read them, for this iPad's station. It asks the server for the
// jobs again every ten seconds (other iPads' counts included) and says how old what it shows is.
import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { refreshQueueAction } from '@/app/station/actions';
import type { QueueSnapshot } from '@/app/station/data';
import type { ProofThumbs } from '@/lib/services/job-sheets';
import type { StationJobSummary, StationKind } from '@/lib/services/production-progress';
import { IconRefresh } from './icons';
import { usePoll } from './hooks';
import { groupJobs, initialsOf, jobNumberLabel, jobsFor, METHOD_LABEL, percent, POLL_MS, STAGE_LABEL, STATION_COOKIE, STATIONS, type StationResult } from './model';
import { StationBar } from './StationBar';
import { UpdatedLine } from './UpdatedLine';
import { ScreenOnToggle } from './WakeLock';

/** This iPad is the screen-print station (or DTG, or DTF, or all): remembered on the device (a cookie the server reads for the next visit), and the
 * address follows, so a bookmark or a reload of it says the same station. */
function rememberStation(kind: StationKind): void {
  try {
    document.cookie = `${STATION_COOKIE}=${kind}; path=/station; max-age=31536000; samesite=lax`;
  } catch {
    // cookies blocked: the choice holds until the page is left
  }
  window.history.replaceState(null, '', kind === 'all' ? '/station' : `/station?s=${kind}`);
}

export function QueueScreen({ initial, station: first, canWork, adminHref }: { initial: StationResult<QueueSnapshot>; station: StationKind; canWork: boolean; adminHref: string }) {
  const [station, setStation] = useState<StationKind>(first);
  const [jobs, setJobs] = useState<StationJobSummary[]>(initial.ok ? initial.value.jobs : []);
  const [thumbs, setThumbs] = useState<ProofThumbs>(initial.ok ? initial.value.thumbs : {});
  const [problem, setProblem] = useState<string | null>(initial.ok ? null : initial.error);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const known = useRef<Set<string>>(new Set(Object.keys(initial.ok ? initial.value.thumbs : {})));

  const refresh = useCallback(async () => {
    try {
      const result = await refreshQueueAction([...known.current]);
      if (result.ok) {
        setJobs(result.value.jobs);
        for (const id of Object.keys(result.value.thumbs)) known.current.add(id);
        setThumbs((have) => ({ ...have, ...result.value.thumbs }));
        setProblem(null);
        setUpdatedAt(Date.now());
      } else {
        setProblem(result.error);
      }
    } catch {
      setProblem('No connection to the server.');
    }
  }, []);
  const refreshNow = usePoll(refresh, POLL_MS);

  const live = useMemo(() => jobs.filter((job) => job.stage !== 'shipped'), [jobs]);
  const shown = useMemo(() => groupJobs(jobsFor(live, station)), [live, station]);
  const count = (kind: StationKind) => jobsFor(live, kind).length;

  const choose = (kind: StationKind) => {
    setStation(kind);
    rememberStation(kind);
  };

  const stationLabel = STATIONS.find((s) => s.kind === station)?.label ?? 'All';

  return (
    <>
      <StationBar title={station === 'all' ? 'Queue' : `${stationLabel} queue`}>
        <UpdatedLine at={updatedAt} problem={problem !== null} />
        <button type="button" className="st-btn st-btn-icon" aria-label="Refresh the queue" onClick={() => void refreshNow()}>
          <IconRefresh />
        </button>
        <ScreenOnToggle />
        <a className="st-btn st-btn-quiet" href={adminHref}>
          Admin
        </a>
      </StationBar>

      <main className="st-main">
        <div className="st-picker" role="group" aria-label="Station">
          {STATIONS.map(({ kind, label }) => (
            <button key={kind} type="button" className="st-seg" aria-pressed={kind === station} onClick={() => choose(kind)}>
              <span>{label}</span>
              <span className="st-seg-count">{count(kind)}</span>
            </button>
          ))}
        </div>

        {!canWork ? <p className="st-note">View only. Counting pieces and moving jobs needs Production Work access.</p> : null}
        {problem ? (
          <p className="st-banner" role="alert">
            <span>{problem}</span>
            <button type="button" className="st-btn" onClick={() => void refreshNow()}>
              Try again
            </button>
          </p>
        ) : null}

        {shown.length === 0 ? (
          <p className="st-empty">
            {live.length === 0 ? 'No jobs on the floor. A job appears here once an order is paid and its print files are approved.' : `Nothing at ${stationLabel.toLowerCase()} right now.`}
          </p>
        ) : (
          shown.map((group) => (
            <section key={group.stage} className="st-group" aria-label={STAGE_LABEL[group.stage]}>
              <h2 className="st-label">
                {STAGE_LABEL[group.stage]} · {group.jobs.length}
              </h2>
              <ul className="st-cards">
                {group.jobs.map((job) => (
                  <li key={job.jobId}>
                    <JobCard job={job} thumbs={thumbs[job.designId]} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </>
  );
}

function JobCard({ job, thumbs }: { job: StationJobSummary; thumbs?: ProofThumbs[string] }) {
  // The proof of the way the job prints, else the other one; a job with neither has its initials on the plate.
  const own = (job as { thumbUrl?: string | null }).thumbUrl;
  const thumb = own ?? (job.method === 'screen' ? (thumbs?.screen ?? thumbs?.dtg_dtf) : (thumbs?.dtg_dtf ?? thumbs?.screen)) ?? null;
  const pct = percent(job.printed, job.total);
  const complete = job.total > 0 && job.printed >= job.total;
  const hasScreens = job.method === 'screen' && job.screensTotal !== undefined && job.screensTotal > 0;
  const flagged = job.flaggedLines ?? 0;
  const number = jobNumberLabel(job.runNumber);

  return (
    <Link href={`/station/job/${encodeURIComponent(job.jobId)}`} className="st-card" data-stage={job.stage}>
      <span className="st-plate" aria-hidden="true">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="st-plate-initials">{initialsOf(job.designTitle)}</span>
        )}
      </span>
      <span className="st-card-body">
        {number ? <span className="st-no st-card-no">{number}</span> : null}
        <span className="st-card-head">
          <span className="st-card-title">{job.designTitle}</span>
          <span className="st-tag st-tag-strong">{STAGE_LABEL[job.stage]}</span>
        </span>
        <span className="st-card-shop">{job.shopName}</span>
        <span className="st-card-facts">{[METHOD_LABEL[job.method], flagged > 0 ? (flagged === 1 ? '1 line flagged' : `${flagged} lines flagged`) : null, job.hiddenFromBoard ? 'Off the board' : null].filter(Boolean).join(' · ')}</span>
        <span className="st-card-progress">
          <span className="st-meter" role="progressbar" aria-label={`${job.printed} of ${job.total} printed`} aria-valuemin={0} aria-valuemax={job.total} aria-valuenow={job.printed}>
            <span style={{ width: `${pct}%` }} />
          </span>
          <span className="st-card-numbers">
            <span>
              <b>{job.printed}</b> / {job.total} printed{complete ? ' · all' : ''}
            </span>
            {hasScreens ? (
              <span>
                Screens ready <b>{job.screensReady ?? 0}</b> / {job.screensTotal}
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </Link>
  );
}
