import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
import { z } from 'zod';
const FORM_FIELDS = [
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
export function CatalogAddScreen({ maxHeight }) {
    const setScreen = useAppStore((s) => s.setScreen);
    const config = useAppStore((s) => s.config);
    const [step, setStep] = useState(0);
    const [values, setValues] = useState({
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
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [validationError, setValidationError] = useState('');
    const [created, setCreated] = useState(null);
    const [awaitingImport, setAwaitingImport] = useState(false);
    useEffect(() => {
        (async () => {
            try {
                const { getAllCategories } = await import('@db-root/catalog');
                const cats = await getAllCategories();
                setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
            }
            catch {
                // categories will be empty
            }
        })();
    }, []);
    const currentField = FORM_FIELDS[step];
    const validateCurrentField = useCallback((val) => {
        if (!currentField.required && val === '')
            return null;
        if (currentField.required && val.trim() === '') {
            return `${currentField.label} is required`;
        }
        if (currentField.type === 'price') {
            const parsed = parseFloat(val);
            if (isNaN(parsed))
                return 'Must be a valid number';
            if (parsed < 0)
                return 'Must be positive';
        }
        if (currentField.type === 'number') {
            if (val !== '' && (isNaN(parseInt(val)) || parseInt(val) < 0))
                return 'Must be a positive integer';
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
        const payload = {
            sku: values.sku.trim(),
            name: values.name.trim(),
            description: values.description.trim() || null,
            categoryId: values.categoryId,
            brand: values.brand.trim(),
            material: values.material.trim() || null,
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
            const result = await createCatalogProduct(payload);
            const newProduct = Array.isArray(result) ? result[0] : result;
            if (config) {
                await pingReindex(config);
            }
            setCreated({ id: newProduct.id, name: newProduct.name });
            setAwaitingImport(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create product');
        }
        finally {
            setSaving(false);
        }
    }, [values, config]);
    useInput((input, key) => {
        if (saving || awaitingImport) {
            if (awaitingImport) {
                if (input === 'y' || input === 'Y' || key.return) {
                    setScreen('catalog-images', { productId: created.id });
                }
                else if (input === 'n' || input === 'N') {
                    setScreen('catalog');
                }
            }
            return;
        }
        if (key.escape) {
            if (step === 0) {
                setScreen('catalog');
            }
            else {
                setStep((s) => s - 1);
                setValidationError('');
            }
            return;
        }
        if (key.return) {
            if (step === FORM_FIELDS.length - 1) {
                handleSave();
            }
            else {
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
        }
        else if (currentField.type === 'select' && currentField.key === 'status') {
            if (input === ' ' || key.return) {
                const currentIdx = STATUS_OPTIONS.indexOf(values.status);
                const nextIdx = (currentIdx + 1) % STATUS_OPTIONS.length;
                setValues((prev) => ({ ...prev, status: STATUS_OPTIONS[nextIdx] }));
            }
        }
    });
    if (loading) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading...'] }) }));
    }
    if (awaitingImport && created) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "green", children: ["\u2713 Product created: ", created.name] }), _jsx(Text, {}), _jsx(Text, { children: "Import images? (Y/n)" })] }));
    }
    if (saving) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Creating product...'] }) }));
    }
    const fieldKey = currentField.key;
    const currentValue = values[fieldKey] ?? '';
    const selectDisplay = currentField.key === 'categoryId'
        ? categories.find((c) => c.id === currentValue)?.name ?? '—'
        : currentValue;
    return (_jsxs(Box, { flexDirection: "column", width: "100%", children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\u2795 Add Product" }), _jsxs(Text, { dimColor: true, children: ["  Step ", step + 1, "/", FORM_FIELDS.length] })] }), _jsx(Box, { flexDirection: "column", marginBottom: 1, children: FORM_FIELDS.map((f, i) => {
                    const val = values[f.key] ?? '';
                    const display = f.type === 'price' && val
                        ? `€${val}`
                        : f.key === 'categoryId'
                            ? (categories.find((c) => c.id === val)?.name ?? (val || '—'))
                            : val || '—';
                    return (_jsxs(Box, { children: [_jsx(Box, { width: 18, children: _jsxs(Text, { dimColor: i !== step, bold: i === step, children: [i === step ? '▸ ' : '  ', f.label, ":"] }) }), i === step ? (_jsx(Box, { children: f.type === 'select' ? (_jsxs(Text, { bold: true, color: "cyan", children: [selectDisplay, " ", _jsx(Text, { dimColor: true, children: "(Space to cycle)" })] })) : (_jsx(TextInput, { value: currentValue, onChange: (v) => { setValues((prev) => ({ ...prev, [fieldKey]: v })); setValidationError(''); }, onSubmit: () => { }, showCursor: true, placeholder: f.type === 'price' ? '0.00' : f.type === 'number' ? '0' : `Enter ${f.label}` })) })) : (_jsx(Text, { dimColor: true, children: display }))] }, f.key));
                }) }), validationError && (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { color: "red", children: ["\u2717 ", validationError] }) })), error && (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { color: "red", children: ["\u2717 ", error] }) })), _jsx(Text, { dimColor: true, children: "Enter: next/save \u00B7 Tab: skip \u00B7 Esc: back \u00B7 Space: cycle (selects)" })] }));
}
