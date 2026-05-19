import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
import { z } from 'zod';
import { sanitizeText } from '../../lib/sanitize';

interface CategoryOption {
  id: string;
  name: string;
}

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'price' | 'select' | 'number';
  required?: boolean;
}

const FORM_FIELDS: FormField[] = [
  { key: 'sku', label: 'SKU', type: 'text', required: true },
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'categoryId', label: 'Category', type: 'select', required: true },
  { key: 'brand', label: 'Brand', type: 'text', required: true },
  { key: 'material', label: 'Material', type: 'text' },
  { key: 'weightG', label: 'Weight (g)', type: 'number' },
  { key: 'costPriceEur', label: 'Cost Price €', type: 'price' },
  { key: 'baseCostEur', label: 'Base Cost €', type: 'price', required: true },
  { key: 'suggestedRetailEur', label: 'Sugg. Retail €', type: 'price' },
  { key: 'status', label: 'Status', type: 'select' },
];

const STATUS_OPTIONS = ['active', 'archived'];

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  material: z.string().optional(),
  weightG: z.number().int().positive().optional().nullable(),
  costPriceEur: z.number().int().min(0).optional().nullable(),
  baseCostEur: z.number().int().positive('Base cost must be positive'),
  suggestedRetailEur: z.number().int().min(0).optional().nullable(),
  status: z.string(),
});

type FormValues = Record<string, string>;

export function CatalogAddScreen({ maxHeight }: { maxHeight: number }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const config = useAppStore((s) => s.config);

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    brand: '',
    material: '',
    weightG: '',
    costPriceEur: '',
    baseCostEur: '',
    suggestedRetailEur: '',
    status: 'active',
  });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [awaitingImport, setAwaitingImport] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { getAllCategories } = await import('@db-root/catalog');
        const cats = await getAllCategories();
        setCategories(cats.map((c: any) => ({ id: c.id, name: c.name })));
      } catch {
        // categories will be empty
      }
    })();
  }, []);

  const currentField = FORM_FIELDS[step];

  const validateCurrentField = useCallback((val: string): string | null => {
    if (!currentField.required && val === '') return null;
    if (currentField.required && val.trim() === '') {
      return `${currentField.label} is required`;
    }
    if (currentField.type === 'price') {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) return 'Must be a valid number';
      if (parsed < 0) return 'Must be positive';
    }
    if (currentField.type === 'number') {
      if (val !== '' && (isNaN(parseInt(val)) || parseInt(val) < 0)) return 'Must be a positive integer';
    }
    return null;
  }, [currentField]);

  const advanceStep = useCallback(() => {
    const vErr = validateCurrentField(values[currentField.key]);
    if (vErr) {
      setValidationError(vErr);
      return;
    }
    setValidationError('');
    if (step < FORM_FIELDS.length - 1) {
      setStep((s) => s + 1);
    }
  }, [step, values, validateCurrentField, currentField.key]);

  const handleSave = useCallback(async () => {
    const baseCostCents = values.baseCostEur ? Math.round(parseFloat(values.baseCostEur) * 100) : 0;
    const costPriceCents = values.costPriceEur ? Math.round(parseFloat(values.costPriceEur) * 100) : null;
    const retailCents = values.suggestedRetailEur ? Math.round(parseFloat(values.suggestedRetailEur) * 100) : null;
    const weight = values.weightG ? parseInt(values.weightG) : null;

    const payload: Record<string, any> = {
      sku: sanitizeText(values.sku.trim()),
      name: sanitizeText(values.name.trim()),
      description: sanitizeText(values.description.trim()) || null,
      categoryId: values.categoryId,
      brand: sanitizeText(values.brand.trim()),
      material: sanitizeText(values.material.trim()) || null,
      weightG: weight,
      costPriceEur: costPriceCents,
      baseCostEur: baseCostCents,
      suggestedRetailEur: retailCents,
      status: values.status || 'active',
      currencyCode: 'EUR',
    };

    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(', '));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { createCatalogProduct } = await import('@db-root/catalog');
      const { pingReindex } = await import('../../lib/sync');

      const result = await createCatalogProduct(payload as any);
      const newProduct = Array.isArray(result) ? result[0] : result;

      if (config) {
        await pingReindex(config);
      }

      setCreated({ id: (newProduct as any).id, name: (newProduct as any).name });
      setAwaitingImport(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  }, [values, config]);

  useInput((input, key) => {
    if (saving || awaitingImport) {
      if (awaitingImport) {
        if (input === 'y' || input === 'Y' || key.return) {
          setScreen('catalog-images', { productId: created!.id });
        } else if (input === 'n' || input === 'N') {
          setScreen('catalog');
        }
      }
      return;
    }

    if (key.escape) {
      if (step === 0) {
        setScreen('catalog');
      } else {
        setStep((s) => s - 1);
        setValidationError('');
      }
      return;
    }

    if (key.return) {
      if (step === FORM_FIELDS.length - 1) {
        handleSave();
      } else {
        advanceStep();
      }
      return;
    }

    if (key.tab) {
      advanceStep();
      return;
    }

    if (currentField.type === 'select' && currentField.key === 'categoryId') {
      if (input === ' ' || key.return) {
        const currentIdx = categories.findIndex((c) => c.id === values.categoryId);
        const nextIdx = (currentIdx + 1) % categories.length;
        setValues((prev) => ({ ...prev, categoryId: categories[nextIdx].id }));
        setValidationError('');
      }
    } else if (currentField.type === 'select' && currentField.key === 'status') {
      if (input === ' ' || key.return) {
        const currentIdx = STATUS_OPTIONS.indexOf(values.status);
        const nextIdx = (currentIdx + 1) % STATUS_OPTIONS.length;
        setValues((prev) => ({ ...prev, status: STATUS_OPTIONS[nextIdx] }));
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Loading...'}</Text>
      </Box>
    );
  }

  if (awaitingImport && created) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="green">✓ Product created: {created.name}</Text>
        <Text></Text>
        <Text>Import images? (Y/n)</Text>
      </Box>
    );
  }

  if (saving) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Creating product...'}</Text>
      </Box>
    );
  }

  const fieldKey = currentField.key;
  const currentValue = values[fieldKey] ?? '';

  const selectDisplay = currentField.key === 'categoryId'
    ? categories.find((c) => c.id === currentValue)?.name ?? '—'
    : currentValue;

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text bold color="cyan">➕ Add Product</Text>
        <Text dimColor>  Step {step + 1}/{FORM_FIELDS.length}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {FORM_FIELDS.map((f, i) => {
          const val = values[f.key] ?? '';
          const display = f.type === 'price' && val
            ? `€${val}`
            : f.key === 'categoryId'
              ? (categories.find((c) => c.id === val)?.name ?? (val || '—'))
              : val || '—';

          return (
            <Box key={f.key}>
              <Box width={18}>
                <Text dimColor={i !== step} bold={i === step}>
                  {i === step ? '▸ ' : '  '}
                  {f.label}:
                </Text>
              </Box>
              {i === step ? (
                <Box>
                  {f.type === 'select' ? (
                    <Text bold color="cyan">{selectDisplay} <Text dimColor>(Space to cycle)</Text></Text>
                  ) : (
                    <TextInput
                      value={currentValue}
                      onChange={(v) => { setValues((prev) => ({ ...prev, [fieldKey]: v })); setValidationError(''); }}
                      onSubmit={() => {}}
                      showCursor={true}
                      placeholder={f.type === 'price' ? '0.00' : f.type === 'number' ? '0' : `Enter ${f.label}`}
                    />
                  )}
                </Box>
              ) : (
                <Text dimColor>{display}</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {validationError && (
        <Box marginBottom={1}>
          <Text color="red">✗ {validationError}</Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}

      <Text dimColor>
        Enter: next/save · Tab: skip · Esc: back · Space: cycle (selects)
      </Text>
    </Box>
  );
}
