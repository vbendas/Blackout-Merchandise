import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import '@/components/admin/prepress/prepress.css';

export default function PackNotFound() {
  return (
    <>
      <AdminPageHeader title="Pack not found" />
      <div className="pp-page">
        <div className="pp">
          <p className="pp-lede">This pack doesn’t exist.</p>
          <div>
            <Link href="/admin/prepress" className="pp-link">
              Back to the queue
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
