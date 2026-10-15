/** The approval page while its view loads: the tab row, the colour buttons,
 * the plate and the lines of the right column as quiet blocks (.mf-skel), in
 * the same places the page puts them so nothing jumps. */
export function ApproveSkeleton() {
  return (
    <>
      <div className="ap-tabsrow" aria-hidden>
        <div className="ap-tabs">
          <span className="mf-skel ap-skel-tab" />
          <span className="mf-skel ap-skel-tab" />
        </div>
      </div>
      <div className="ap-body" role="status" aria-label="Loading the proofs">
        <div className="ap-proof">
          <div className="ap-colours" aria-hidden>
            <span className="mf-skel ap-skel-colour" />
            <span className="mf-skel ap-skel-colour" />
            <span className="mf-skel ap-skel-colour" />
          </div>
          <div className="ap-stage" aria-hidden>
            <div className="mf-skel ap-skel-plate" />
          </div>
        </div>
        <div className="ap-aside" aria-hidden>
          <div className="ap-block">
            <span className="mf-skel ap-skel-line" style={{ width: '38%' }} />
            <span className="mf-skel ap-skel-title" />
            <span className="mf-skel ap-skel-line" style={{ width: '88%' }} />
            <span className="mf-skel ap-skel-line" style={{ width: '72%' }} />
          </div>
          <div className="mf-skel ap-skel-box" />
        </div>
      </div>
    </>
  );
}
