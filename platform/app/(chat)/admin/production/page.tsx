import { listProduction } from '@/lib/services/production';
import { ProductionTable } from '@/components/admin/ProductionTable';

export default async function ProductionPage() {
  const rows = await listProduction({});

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mf-label mf-dimmed mb-4">Production queue</h1>
      <ProductionTable rows={rows} />
    </div>
  );
}
