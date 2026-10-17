'use client';

// The screens of a screen-print job, set by set: every film in press order with its ink (the Pantone code and the base: staff only, so
// the codes are fine here), its mesh, ruling and cover, and the status of its screen as five buttons the thumb can hit: Waiting, Film printed,
// Screen ready, On press, Reclaimed. Under each set the press settings the operator reads at the press: the flash and the cure.
import type { ProductionStage, ScreenProgress, ScreenStatus } from '@/lib/services/production-progress';
import type { FilmGroup } from './films';
import { SCREEN_STATUSES, screenIsReady, stageRank } from './model';

/** The settings an operator reads at the press, by the key the job sheet gives each. */
const AT_THE_PRESS = ['underbase', 'cure', 'off_contact', 'squeegee'] as const;

export function ScreensPanel({ groups, canWork, stage, onStatus }: { groups: FilmGroup[]; canWork: boolean; stage: ProductionStage; onStatus: (screen: ScreenProgress, status: ScreenStatus) => void }) {
  if (groups.length === 0) {
    return <p className="st-empty">No screens yet. They appear here once pre-press has approved this design&rsquo;s screen files.</p>;
  }
  const offPress = stageRank(stage) >= stageRank('curing');
  return (
    <div className="st-sets">
      {!offPress ? <p className="st-note">A screen is reclaimed once the job is off the press. Set it back to Waiting to burn it again.</p> : null}
      {groups.map((group) => {
        const ready = group.rows.filter((r) => screenIsReady(r.screen.status)).length;
        const set = group.set;
        return (
          <section key={group.key} className="st-set" aria-label={set?.title ?? group.setName}>
            <header className="st-set-head">
              <h3 className="st-set-title">{set?.title ?? `${group.setName} · ${group.rows.length} ${group.rows.length === 1 ? 'screen' : 'screens'}`}</h3>
              <p className="st-set-ready st-mono">
                <b>{ready}</b> / {group.rows.length} ready
              </p>
              {set ? <p className="st-set-where">{set.where}</p> : <span />}
              {set?.file ? <p className="st-set-file st-mono st-dim">{set.file}</p> : null}
            </header>
            {set?.nothingPrints ? <p className="st-note">{set.nothingPrints}</p> : null}

            <ol className="st-films">
              {group.rows.map(({ screen, film }) => (
                <li key={screen.key} className="st-film" data-status={screen.status}>
                  <span className="st-film-pos">{film?.position ?? screen.position}</span>
                  <div className="st-film-info">
                    <p className="st-film-name">
                      {film ? <span className="st-swatch" style={{ background: film.hex }} aria-hidden="true" /> : null}
                      <span>{film?.label ?? screen.inkName}</span>
                      {film?.clientName ? <span className="st-dim"> · {film.clientName}</span> : null}
                    </p>
                    {film ? (
                      <p className="st-film-spec">
                        {film.base} · mesh {film.meshText} · {film.ruling} · cover {film.cover}
                      </p>
                    ) : (
                      <p className="st-film-spec">{screen.inkName}</p>
                    )}
                    {film?.flash ? <p className="st-film-flash">{film.flash}</p> : null}
                  </div>
                  <div className="st-status" role="group" aria-label={`Status of screen ${film?.position ?? screen.position}, ${film?.label ?? screen.inkName}`}>
                    {SCREEN_STATUSES.map(({ status, label }) => (
                      <button
                        key={status}
                        type="button"
                        className="st-status-btn"
                        aria-pressed={screen.status === status}
                        disabled={!canWork || (status === 'reclaimed' && !offPress) || stage === 'shipped'}
                        onClick={() => screen.status !== status && onStatus(screen, status)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>

            {set && set.settings.length > 0 ? (
              <dl className="st-press">
                {AT_THE_PRESS.map((key) => set.settings.find((s) => s.key === key)).filter((s): s is NonNullable<typeof s> => Boolean(s)).map((s) => (
                  <div key={s.key}>
                    <dt className="st-label">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
