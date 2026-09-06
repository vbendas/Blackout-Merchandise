import { listSupplierOrders } from '@/lib/services/supplier';
import { SupplierTable } from '@/components/admin/SupplierTable';
import { DraftFromQueuedButton } from '@/components/admin/DraftFromQueuedButton';

export default async function SupplierPage() {
  const orders = await listSupplierOrders();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="mf-label mf-dimmed">Supplier orders</h1>
        <DraftFromQueuedButton />
      </div>
      <SupplierTable orders={orders} />
    </div>
  );
}
