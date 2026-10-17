'use client';

// The job sheet itself, as read-only data beside the counters: the same words as the PDF (both are made from one view), so what the
// screen says and what the paper says never differ. The garments and the file to use for each, the files of a DTG or DTF job, every
// press setting of every screen set, the checks, the pieces waiting in open orders, and what pre-press has signed off. The PDF is one tap away.
import type { JobSheetView } from '@/lib/print/job-sheet-view';
import { IconDocument } from './icons';

export function SheetPanel({ view, problem, pdfUrl, adminHref, hidden, canWork, onHidden }: { view: JobSheetView | null; problem: string | null; pdfUrl: string; adminHref: string; hidden: boolean; canWork: boolean; onHidden: (hidden: boolean) => void }) {
  return (
    <div className="st-sheet">
      <div className="st-sheet-top">
        <a className="st-btn st-btn-primary" href={pdfUrl} target="_blank" rel="noopener">
          <IconDocument /> Open the job sheet (PDF)
        </a>
        {view ? <p className="st-mono st-dim">Made {view.generated}</p> : null}
      </div>

      {!view ? (
        <p className="st-note">{problem ?? 'The job sheet could not be loaded.'}</p>
      ) : (
        <>
          <dl className="st-facts st-facts-4">
            {view.facts.map(([label, value]) => (
              <div key={label}>
                <dt className="st-label">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <section className="st-sheet-section" aria-label="Garments">
            <h3 className="st-label">{view.garments.heading}</h3>
            {view.garments.empty ? <p className="st-dim">{view.garments.empty}</p> : null}
            <ul className="st-rows">
              {view.garments.rows.map((g, i) => (
                <li key={`${g.blankCode}|${g.colourCode}|${g.placement}|${g.methodLabel}|${i}`} className="st-row">
                  <span className="st-row-main">
                    {g.colourHex ? <span className="st-swatch" style={{ background: g.colourHex }} aria-hidden="true" /> : null}
                    <b>{g.colourName}</b>
                    <span className="st-dim">
                      {' '}
                      · {g.blankName} ({g.blankCode})
                    </span>
                  </span>
                  <span className="st-row-sub">{g.placement}</span>
                  <span className="st-row-sub">
                    {g.methodLabel}
                    {g.usedBy.length > 0 ? ` · ${g.usedBy.join(', ')}` : ''}
                  </span>
                  <span className="st-row-file">{g.file ?? g.note ?? '-'}</span>
                </li>
              ))}
            </ul>
            {view.garments.notes.map((note) => (
              <p key={note} className="st-small st-dim">
                {note}
              </p>
            ))}
          </section>

          {view.screenSets.map((set) => (
            <section key={`${set.packId ?? ''}|${set.setName}|${set.blankCode}|${set.placement}`} className="st-sheet-section" aria-label={`Settings, ${set.title}`}>
              <h3 className="st-label">{set.title}</h3>
              <p className="st-small st-dim">{set.where}</p>
              {set.nothingPrints ? <p>{set.nothingPrints}</p> : null}
              {set.settings.length > 0 ? (
                <dl className="st-facts st-facts-3">
                  {set.settings.map((s) => (
                    <div key={s.key}>
                      <dt className="st-label">{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          ))}

          {view.dtg.packs.map((pack) => (
            <section key={`${pack.blankCode}|${pack.placement}`} className="st-sheet-section" aria-label={`Files, ${pack.title}`}>
              <h3 className="st-label">DTG/DTF files</h3>
              <p>
                <b>{pack.title}</b>
              </p>
              <p className="st-small st-dim">{pack.where}</p>
              <ul className="st-rows">
                {pack.files.map((f) => (
                  <li key={f.colourCode} className="st-row">
                    <span className="st-row-main">
                      <b>{f.colourName}</b>
                    </span>
                    <span className="st-row-sub">
                      {f.pixels} · {f.size} · offset {f.offset}
                    </span>
                    <span className="st-row-sub">{f.notes}</span>
                    <span className="st-row-file">{f.file ?? '-'}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {view.dtg.footnote ? <p className="st-small st-dim">{view.dtg.footnote}</p> : null}

          <section className="st-sheet-section" aria-label="Checks">
            <h3 className="st-label">Checks</h3>
            {view.checks.length === 0 ? <p className="st-dim">No checks recorded.</p> : null}
            {view.checks.map((group) => (
              <div key={group.label} className="st-check-group">
                <p>
                  <b>{group.label}</b>
                </p>
                {group.empty ? <p className="st-dim">{group.empty}</p> : null}
                {group.passed.length > 0 ? (
                  <p className="st-check">
                    <span className="st-state">PASSED</span>
                    <span className="st-dim">{group.passed.join(', ')}</span>
                  </p>
                ) : null}
                {group.attention.map((c) => (
                  <p key={c.id} className="st-check" data-state={c.state}>
                    <span className="st-state">{c.stateWord}</span>
                    <span>
                      <b>{c.title}</b> · {c.detail}
                    </span>
                  </p>
                ))}
              </div>
            ))}
          </section>

          <section className="st-sheet-section" aria-label="Pieces waiting">
            <h3 className="st-label">Pieces waiting</h3>
            {view.pieces.empty ? <p className="st-dim">{view.pieces.empty}</p> : null}
            {view.pieces.line ? <p className="st-small st-dim">{view.pieces.line}</p> : null}
            {view.pieces.rows.length > 0 ? (
              <div className="st-table-wrap">
                <table className="st-table">
                  <thead>
                    <tr>
                      <th scope="col">Garment</th>
                      {view.pieces.sizes.map((size) => (
                        <th key={size} scope="col" className="st-num">
                          {size}
                        </th>
                      ))}
                      <th scope="col" className="st-num">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.pieces.rows.map((row, i) => (
                      <tr key={`${row.blankCode}|${row.colourCode}|${row.colourName}|${i}`}>
                        <th scope="row">
                          {row.colourName}
                          <span className="st-dim"> · {row.blankName}</span>
                        </th>
                        {view.pieces.sizes.map((size) => (
                          <td key={size} className="st-num">
                            {row.sizes[size] ? row.sizes[size] : '-'}
                          </td>
                        ))}
                        <td className="st-num">
                          <b>{row.total}</b>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">Total</th>
                      {view.pieces.sizes.map((size) => (
                        <td key={size} className="st-num">
                          {view.pieces.totals[size] ? view.pieces.totals[size] : '-'}
                        </td>
                      ))}
                      <td className="st-num">
                        <b>{view.pieces.total}</b>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="st-sheet-section" aria-label="Audit sign-off">
            <h3 className="st-label">Pre-press sign-off</h3>
            {view.auditsEmpty ? <p className="st-dim">{view.auditsEmpty}</p> : null}
            <ul className="st-rows">
              {view.audits.map((a) => (
                <li key={a.label} className="st-row st-row-2">
                  <span className="st-row-main">{a.label}</span>
                  <span className="st-row-sub">
                    <b>{a.stateWord}</b>
                    {a.by !== '-' ? ` · ${a.by}` : ''}
                    {a.date !== '-' ? ` · ${a.date}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="st-sheet-section" aria-label="Website board">
        <h3 className="st-label">On the press board of the website</h3>
        <p className="st-dim">
          The board shows this job&rsquo;s stage and how many pieces are printed, with the shop&rsquo;s name only if the shop chose that, never an order or an address.
        </p>
        <div className="st-sheet-board">
          <p>
            <b>{hidden ? 'Hidden from the board' : 'Shown on the board'}</b>
          </p>
          <button type="button" className="st-btn" disabled={!canWork} onClick={() => onHidden(!hidden)}>
            {hidden ? 'Show on the board' : 'Hide from the board'}
          </button>
        </div>
        <div className="st-sheet-board">
          <p>Shipping is done in Production, with the tracking.</p>
          <a className="st-btn" href={adminHref}>
            Open Production
          </a>
        </div>
      </section>
    </div>
  );
}
