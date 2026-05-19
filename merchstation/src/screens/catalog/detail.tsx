import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
import { sanitizeText } from '../../lib/sanitize';
import { formatDbError } from '../../lib/format-error';

interface VariantRow {
  sku: string;
  colorName: string;
  sizeName: string;
  status: string;
  quantityAvailable: number;
}

interface ImageRow {
  imageType: string;
  isPrimary: boolean;
  url: string;
}

interface PricingRow {
  fieldChanged: string;
  oldValue: number | null;
  newValue: number;
  effectiveDate: string;
  changeReason: string | null;
}

interface ProductData {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  brand: string;
  material: string | null;
  weightG: number | null;
  costPriceEur: number | null;
  baseCostEur: number;
  suggestedRetailEur: number | null;
  status: string;
  variants: VariantRow[];
  images: ImageRow[];
  pricingHistory: PricingRow[];
}

type EditField = 'name' | 'description' | 'baseCostEur' | 'suggestedRetailEur' | 'status';

const EDIT_FIELDS: { key: EditField; label: string; type: 'text' | 'price' | 'status' }[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'baseCostEur', label: 'Base Cost €', type: 'price' },
  { key: 'suggestedRetailEur', label: 'Retail €', type: 'price' },
  { key: 'status', label: 'Status', type: 'status' },
];

const STATUS_CYCLE = ['active', 'archived', 'discontinued'];

function eurCents(cents: number | null): string {
  if (cents === null) return '—';
  return `€${(cents / 100).toFixed(2)}`;
}

export function CatalogDetailScreen({ maxHeight }: { maxHeight: number }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const screenParams = useAppStore((s) => s.screenParams);
  const config = useAppStore((s) => s.config);

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [editIdx, setEditIdx] = useState(0);
  const [editValues, setEditValues] = useState<Record<EditField, string>>({
    name: '',
    description: '',
    baseCostEur: '',
    suggestedRetailEur: '',
    status: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'variants' | 'images' | 'pricing'>('details');

  const productId = screenParams.productId;

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const { getFullProductById, getPricingHistory } = await import('@db-root/catalog');
      const full = await getFullProductById(productId);
      if (!full) {
        setError('Product not found');
        return;
      }

      const history = await getPricingHistory(productId);

      const data: ProductData = {
        id: (full as any).id,
        sku: (full as any).sku,
        name: (full as any).name,
        description: (full as any).description,
        categoryId: (full as any).categoryId,
        categoryName: (full as any).category?.name ?? '—',
        brand: (full as any).brand,
        material: (full as any).material,
        weightG: (full as any).weightG,
        costPriceEur: (full as any).costPriceEur,
        baseCostEur: (full as any).baseCostEur,
        suggestedRetailEur: (full as any).suggestedRetailEur,
        status: (full as any).status,
        variants: ((full as any).variants ?? []).map((v: any) => ({
          sku: v.sku,
          colorName: v.color?.name ?? '?',
          sizeName: v.size?.name ?? '?',
          status: v.status,
          quantityAvailable: v.inventory?.quantityAvailable ?? 0,
        })),
        images: ((full as any).images ?? []).map((img: any) => ({
          imageType: img.imageType,
          isPrimary: img.isPrimary,
          url: img.cloudinaryUrl ?? '',
        })),
        pricingHistory: (history ?? []).map((h: any) => ({
          fieldChanged: h.fieldChanged,
          oldValue: h.oldValue,
          newValue: h.newValue,
          effectiveDate: h.effectiveDate ? new Date(h.effectiveDate).toLocaleDateString() : '',
          changeReason: h.changeReason,
        })),
      };

      setProduct(data);
      setEditValues({
        name: data.name,
        description: data.description ?? '',
        baseCostEur: (data.baseCostEur / 100).toFixed(2),
        suggestedRetailEur: data.suggestedRetailEur ? (data.suggestedRetailEur / 100).toFixed(2) : '',
        status: data.status,
      });
    } catch (err) {
      setError(formatDbError(err, 'load product'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSave = useCallback(async () => {
    if (!product || !config) return;
    setSaving(true);
    setSaveResult(null);

    try {
      const { updateCatalogProduct, addPricingHistory } = await import('@db-root/catalog');
      const { pingReindex } = await import('../../lib/sync');

      const newBaseCost = Math.round(parseFloat(editValues.baseCostEur) * 100);
      const newRetail = editValues.suggestedRetailEur ? Math.round(parseFloat(editValues.suggestedRetailEur) * 100) : null;

      const updateData: Record<string, any> = {
        name: sanitizeText(editValues.name),
        description: sanitizeText(editValues.description) || null,
        baseCostEur: newBaseCost,
        suggestedRetailEur: newRetail,
        status: editValues.status,
      };

      await updateCatalogProduct(product.id, updateData);

      if (newBaseCost !== product.baseCostEur) {
        await addPricingHistory(product.id, 'base_cost_eur', product.baseCostEur, newBaseCost, 'merchstation_tui');
      }
      if (newRetail !== product.suggestedRetailEur) {
        await addPricingHistory(product.id, 'suggested_retail_eur', product.suggestedRetailEur, newRetail ?? 0, 'merchstation_tui');
      }

      const reindexResult = await pingReindex(config);

      if (reindexResult.ok) {
        setSaveResult('✓ Saved & reindexed');
      } else {
        setSaveResult('⚠ Saved but reindex failed');
      }

      setEditMode(false);
      await loadProduct();
    } catch (err) {
      setSaveResult(`✗ Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [product, config, editValues, loadProduct]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (loading || saving) return;

    if (editMode) {
      if (key.escape) {
        setEditMode(false);
        setSaveResult(null);
        return;
      }
      if (key.tab) {
        setEditIdx((i) => (i + 1) % EDIT_FIELDS.length);
        return;
      }
      if (input === 's' || input === 'S') {
        handleSave();
        return;
      }
      return;
    }

    if (key.escape) {
      setScreen('catalog');
      return;
    }

    if (input === 'e' || input === 'E') {
      setEditMode(true);
      setEditIdx(0);
      setSaveResult(null);
      return;
    }

    if (input === '1') setActiveTab('details');
    else if (input === '2') setActiveTab('variants');
    else if (input === '3') setActiveTab('images');
    else if (input === '4') setActiveTab('pricing');
    else if (input === 'r') loadProduct();
  });

  if (loading) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Loading product...'}
        </Text>
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="red">✗ {error || 'Product not found'}</Text>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  const currentField = EDIT_FIELDS[editIdx];

  const handleEditChange = (value: string) => {
    if (!editMode) return;
    if (currentField.type === 'status') {
      const idx = STATUS_CYCLE.indexOf(editValues.status);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      setEditValues((prev) => ({ ...prev, status: next }));
    } else {
      setEditValues((prev) => ({ ...prev, [currentField.key]: value }));
    }
  };

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">
          {editMode ? '✏️  Edit Product' : '📦 Product Detail'}
        </Text>
        <Text dimColor>{product.sku}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          [1] Details
          {'  '}
          [2] Variants ({product.variants.length})
          {'  '}
          [3] Images ({product.images.length})
          {'  '}
          [4] Pricing History ({product.pricingHistory.length})
        </Text>
      </Box>

      {activeTab === 'details' && (
        <Box flexDirection="column">
          <DetailRow label="SKU" value={product.sku} />
          <EditableRow
            label="Name"
            value={editMode ? undefined : product.name}
            editing={editMode && currentField.key === 'name'}
            editValue={editValues.name}
            onEdit={handleEditChange}
          />
          <EditableRow
            label="Description"
            value={editMode ? undefined : (product.description ?? '—')}
            editing={editMode && currentField.key === 'description'}
            editValue={editValues.description}
            onEdit={handleEditChange}
          />
          <DetailRow label="Category" value={product.categoryName} />
          <DetailRow label="Brand" value={product.brand} />
          <DetailRow label="Material" value={product.material ?? '—'} />
          <DetailRow label="Weight" value={product.weightG ? `${product.weightG}g` : '—'} />
          <DetailRow label="Cost Price" value={eurCents(product.costPriceEur)} />
          <EditableRow
            label="Base Cost"
            value={editMode ? undefined : eurCents(product.baseCostEur)}
            editing={editMode && currentField.key === 'baseCostEur'}
            editValue={editValues.baseCostEur}
            onEdit={handleEditChange}
            hint="EUR"
          />
          <EditableRow
            label="Sugg. Retail"
            value={editMode ? undefined : eurCents(product.suggestedRetailEur)}
            editing={editMode && currentField.key === 'suggestedRetailEur'}
            editValue={editValues.suggestedRetailEur}
            onEdit={handleEditChange}
            hint="EUR"
          />
          <EditableRow
            label="Status"
            value={editMode ? undefined : product.status}
            editing={editMode && currentField.key === 'status'}
            editValue={editValues.status}
            onEdit={handleEditChange}
            hint="Enter to cycle"
          />
        </Box>
      )}

      {activeTab === 'variants' && (
        <Box flexDirection="column">
          {product.variants.length === 0 ? (
            <Text dimColor>No variants</Text>
          ) : (
            product.variants.map((v, i) => (
              <Box key={i}>
                <Text>
                  <Text dimColor>{v.sku.padEnd(20)}</Text>
                  {' '}
                  <Text>{v.colorName.padEnd(12)}</Text>
                  {' '}
                  <Text>{v.sizeName.padEnd(6)}</Text>
                  {' '}
                  <Text color={v.status === 'in_stock' ? 'green' : v.status === 'out_of_stock' ? 'red' : 'yellow'}>
                    {v.status.padEnd(14)}
                  </Text>
                  {' '}
                  <Text>qty:{v.quantityAvailable}</Text>
                </Text>
              </Box>
            ))
          )}
        </Box>
      )}

      {activeTab === 'images' && (
        <Box flexDirection="column">
          {product.images.length === 0 ? (
            <Text dimColor>No images</Text>
          ) : (
            product.images.map((img, i) => (
              <Box key={i}>
                <Text>
                  {img.isPrimary ? <Text color="yellow">★</Text> : ' '}
                  {' '}
                  <Text>{img.imageType.padEnd(10)}</Text>
                  {' '}
                  <Text dimColor>{img.url.length > 50 ? img.url.slice(0, 50) + '…' : img.url}</Text>
                </Text>
              </Box>
            ))
          )}
        </Box>
      )}

      {activeTab === 'pricing' && (
        <Box flexDirection="column">
          {product.pricingHistory.length === 0 ? (
            <Text dimColor>No pricing history</Text>
          ) : (
            product.pricingHistory.map((p, i) => (
              <Box key={i}>
                <Text>
                  <Text dimColor>{p.effectiveDate}</Text>
                  {' '}
                  <Text>{p.fieldChanged}</Text>
                  {' '}
                  <Text color="red">{eurCents(p.oldValue)}</Text>
                  →
                  <Text color="green">{eurCents(p.newValue)}</Text>
                  {p.changeReason ? <Text dimColor> ({p.changeReason})</Text> : null}
                </Text>
              </Box>
            ))
          )}
        </Box>
      )}

      {saving && (
        <Box marginTop={1}>
          <Text>
            <Text color="cyan"><Spinner type="dots" /></Text>
            {' Saving...'}
          </Text>
        </Box>
      )}

      {saveResult && (
        <Box marginTop={1}>
          <Text color={saveResult.startsWith('✓') ? 'green' : saveResult.startsWith('⚠') ? 'yellow' : 'red'}>
            {saveResult}
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        {editMode ? (
          <Text dimColor>
            Tab: next field · S: save · Esc: cancel
            {'  '}
            [{currentField.label}]
          </Text>
        ) : (
          <Text dimColor>E: Edit · 1-4: Tabs · R: Refresh · Esc: Back</Text>
        )}
      </Box>
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Box width={16}>
        <Text dimColor>{label}:</Text>
      </Box>
      <Text>{value}</Text>
    </Box>
  );
}

function EditableRow({
  label,
  value,
  editing,
  editValue,
  onEdit,
  hint,
}: {
  label: string;
  value?: string;
  editing: boolean;
  editValue: string;
  onEdit: (val: string) => void;
  hint?: string;
}) {
  return (
    <Box>
      <Box width={16}>
        <Text dimColor>{label}:</Text>
      </Box>
      {editing ? (
        <Box>
          <TextInput
            value={editValue}
            onChange={onEdit}
            onSubmit={() => {}}
            showCursor={true}
            placeholder={hint ?? ''}
          />
          {hint && <Text dimColor> {hint}</Text>}
        </Box>
      ) : (
        <Text>{value ?? editValue}</Text>
      )}
    </Box>
  );
}
