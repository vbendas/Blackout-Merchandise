import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { listSupplierOrders } from '@/lib/services/supplier';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SupplierTable } from '@/components/admin/SupplierTable';
import { DraftFromQueuedButton } from '@/components/admin/DraftFromQueuedButton';

export default async function SupplierPage() {
  const { actor } = await requireStaffPage('production', 'view', { page: '/admin/supplier' });
  const orders = await listSupplierOrders();
  const canWork = can(actor, 'production', 'work');

  return (
    <>
      <AdminPageHeader title="Supplier orders" meta={`${orders.length} orders`}>
        {canWork ? <DraftFromQueuedButton /> : null}
      </AdminPageHeader>
      <div className="px-4 pt-6 pb-14 md:px-8">
        <SupplierTable orders={orders} canWork={canWork} />
      </div>
    </>
  );
}
