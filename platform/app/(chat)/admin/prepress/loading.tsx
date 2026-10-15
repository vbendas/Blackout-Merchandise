import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import '@/components/admin/prepress/prepress.css';

/** Shown while the queue or a pack loads: the top bar, then quiet lines where the content will be. */
export default function PrepressLoading() {
  return (
    <>
      <AdminPageHeader title="Pre-press" />
      <div className="pp-page" aria-busy="true">
        <div className="pp">
          <div className="mf-skel pp-skel pp-skel-wide" />
          <div className="mf-skel pp-skel" />
          <div className="mf-skel pp-skel" />
          <div className="mf-skel pp-skel pp-skel-short" />
        </div>
      </div>
    </>
  );
}
