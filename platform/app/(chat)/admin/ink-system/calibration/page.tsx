import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { DEFAULT_RECIPE } from '@/lib/print/defaults';
import { scanMaxBytes } from '@/lib/print/calibration/scan-upload';
import { getActiveInkSystem } from '@/lib/services/ink-system';
import { formatStamp } from '@/components/admin/prepress/format';
import { CalibrationPanel } from '@/components/admin/ink-system/calibration/CalibrationPanel';
// AdminPageHeader's name line is drawn with .mf-meta, which lives in studio.css.
import '@/components/studio/studio.css';
import '@/components/admin/prepress/prepress.css';
import '@/components/admin/ink-system/ink-system.css';
import '@/components/admin/ink-system/calibration/calibration.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dot gain calibration' };

/** Dot-gain calibration (Plan section 4.3 step 7): halftone dots print bigger than they are on the film, so the
 * engine puts smaller dots on every new film, by a curve measured from a printed test chart. The chart is
 * read from a scan, from typed values or from a spectrophotometer's. Pre-press "View" reads the page and
 * downloads the chart; "Manage" reads a chart, saves the calibration and resets it. */
export default async function CalibrationPage() {
  const { actor } = await requireStaffPage('prepress', 'view', { page: '/admin/ink-system/calibration' });

  const active = await getActiveInkSystem();
  const canManage = can(actor, 'prepress', 'manage');
  const current = active.profile.dotGain ?? null;
  // The next chart starts at the screen the last one was printed with, or at the house screen.
  const screen = {
    lpi: current?.lpi ?? DEFAULT_RECIPE.halftone.lpi,
    angleDeg: current?.angleDeg ?? DEFAULT_RECIPE.halftone.angleDeg,
    mesh: current?.mesh ?? active.profile.mesh.halftone,
    ppi: DEFAULT_RECIPE.screenPpi,
  };

  return (
    <>
      <AdminPageHeader
        title="Dot gain calibration"
        meta={active.profile.name}
        lead={
          <Link href="/admin/ink-system" aria-label="Back to the ink system" className="pp-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        }
      />
      <div className="pp-page">
        <div className="pp pp-stack isy">
          <p className="pp-lede">
            Halftone dots print bigger than they are on the film. Print the test chart, read it, and the engine puts smaller dots on every new film so a 50% tint prints as 50%.
          </p>
          <CalibrationPanel
            canManage={canManage}
            current={current}
            currentLabel={current ? formatStamp(current.measuredAt) : null}
            screen={screen}
            jobScreen={{ lpi: DEFAULT_RECIPE.halftone.lpi, angleDeg: DEFAULT_RECIPE.halftone.angleDeg, mesh: active.profile.mesh.halftone }}
            maxScanBytes={scanMaxBytes(process.env)}
          />
        </div>
      </div>
    </>
  );
}
