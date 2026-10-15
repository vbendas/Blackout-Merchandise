import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { listProduction } from '@/lib/services/production';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ProductionTable } from '@/components/admin/ProductionTable';

export default async function ProductionPage() {
  const { actor } = await requireStaffPage('production', 'view', { page: '/admin/production' });
  const rows = await listProduction({});

  return (
    <>
      <AdminPageHeader title="Production" meta={`${rows.length} in production`} />
      <div className="px-4 pt-6 pb-14 md:px-8">
        <ProductionTable rows={rows} canWork={can(actor, 'production', 'work')} />
      </div>
    </>
  );
}
