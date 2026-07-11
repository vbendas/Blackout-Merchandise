import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
const EDIT_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'baseCostEur', label: 'Base Cost €', type: 'price' },
    { key: 'suggestedRetailEur', label: 'Retail €', type: 'price' },
    { key: 'status', label: 'Status', type: 'status' },
];
const STATUS_CYCLE = ['active', 'archived', 'discontinued'];
function eurCents(cents) {
    if (cents === null)
        return '—';
    return `€${(cents / 100).toFixed(2)}`;
}
export function CatalogDetailScreen({ maxHeight }) {
    const setScreen = useAppStore((s) => s.setScreen);
    const screenParams = useAppStore((s) => s.screenParams);
    const config = useAppStore((s) => s.config);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editIdx, setEditIdx] = useState(0);
    const [editValues, setEditValues] = useState({
        name: '',
        description: '',
        baseCostEur: '',
        suggestedRetailEur: '',
        status: '',
    });
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const productId = screenParams.productId;
    const loadProduct = useCallback(async () => {
        if (!productId)
            return;
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
            const data = {
                id: full.id,
                sku: full.sku,
                name: full.name,
                description: full.description,
                categoryId: full.categoryId,
                categoryName: full.category?.name ?? '—',
                brand: full.brand,
                material: full.material,
                weightG: full.weightG,
                costPriceEur: full.costPriceEur,
                baseCostEur: full.baseCostEur,
                suggestedRetailEur: full.suggestedRetailEur,
                status: full.status,
                variants: (full.variants ?? []).map((v) => ({
                    sku: v.sku,
                    colorName: v.color?.name ?? '?',
                    sizeName: v.size?.name ?? '?',
                    status: v.status,
                    quantityAvailable: v.inventory?.quantityAvailable ?? 0,
                })),
                images: (full.images ?? []).map((img) => ({
                    imageType: img.imageType,
                    isPrimary: img.isPrimary,
                    url: img.cloudinaryUrl ?? '',
                })),
                pricingHistory: (history ?? []).map((h) => ({
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load product');
        }
        finally {
            setLoading(false);
        }
    }, [productId]);
    useEffect(() => {
        loadProduct();
    }, [loadProduct]);
    const handleSave = useCallback(async () => {
        if (!product || !config)
            return;
        setSaving(true);
        setSaveResult(null);
        try {
            const { updateCatalogProduct, addPricingHistory } = await import('@db-root/catalog');
            const { pingReindex } = await import('../../lib/sync');
            const newBaseCost = Math.round(parseFloat(editValues.baseCostEur) * 100);
            const newRetail = editValues.suggestedRetailEur ? Math.round(parseFloat(editValues.suggestedRetailEur) * 100) : null;
            const updateData = {
                name: editValues.name,
                description: editValues.description || null,
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
            }
            else {
                setSaveResult('⚠ Saved but reindex failed');
            }
            setEditMode(false);
            await loadProduct();
        }
        catch (err) {
            setSaveResult(`✗ Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
            setSaving(false);
        }
    }, [product, config, editValues, loadProduct]);
    useInput((input, key) => {
        if (loading || saving)
            return;
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
        if (input === '1')
            setActiveTab('details');
        else if (input === '2')
            setActiveTab('variants');
        else if (input === '3')
            setActiveTab('images');
        else if (input === '4')
            setActiveTab('pricing');
        else if (input === 'r')
            loadProduct();
    });
    if (loading) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading product...'] }) }));
    }
    if (error || !product) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error || 'Product not found'] }), _jsx(Text, { dimColor: true, children: "Press Esc to go back" })] }));
    }
    const currentField = EDIT_FIELDS[editIdx];
    const handleEditChange = (value) => {
        if (!editMode)
            return;
        if (currentField.type === 'status') {
            const idx = STATUS_CYCLE.indexOf(editValues.status);
            const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
            setEditValues((prev) => ({ ...prev, status: next }));
        }
        else {
            setEditValues((prev) => ({ ...prev, [currentField.key]: value }));
        }
    };
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: editMode ? '✏️  Edit Product' : '📦 Product Detail' }), _jsx(Text, { dimColor: true, children: product.sku })] }), _jsx(Box, { marginBottom: 1, children: _jsxs(Text, { dimColor: true, children: ["[1] Details", '  ', "[2] Variants (", product.variants.length, ")", '  ', "[3] Images (", product.images.length, ")", '  ', "[4] Pricing History (", product.pricingHistory.length, ")"] }) }), activeTab === 'details' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(DetailRow, { label: "SKU", value: product.sku }), _jsx(EditableRow, { label: "Name", value: editMode ? undefined : product.name, editing: editMode && currentField.key === 'name', editValue: editValues.name, onEdit: handleEditChange }), _jsx(EditableRow, { label: "Description", value: editMode ? undefined : (product.description ?? '—'), editing: editMode && currentField.key === 'description', editValue: editValues.description, onEdit: handleEditChange }), _jsx(DetailRow, { label: "Category", value: product.categoryName }), _jsx(DetailRow, { label: "Brand", value: product.brand }), _jsx(DetailRow, { label: "Material", value: product.material ?? '—' }), _jsx(DetailRow, { label: "Weight", value: product.weightG ? `${product.weightG}g` : '—' }), _jsx(DetailRow, { label: "Cost Price", value: eurCents(product.costPriceEur) }), _jsx(EditableRow, { label: "Base Cost", value: editMode ? undefined : eurCents(product.baseCostEur), editing: editMode && currentField.key === 'baseCostEur', editValue: editValues.baseCostEur, onEdit: handleEditChange, hint: "EUR" }), _jsx(EditableRow, { label: "Sugg. Retail", value: editMode ? undefined : eurCents(product.suggestedRetailEur), editing: editMode && currentField.key === 'suggestedRetailEur', editValue: editValues.suggestedRetailEur, onEdit: handleEditChange, hint: "EUR" }), _jsx(EditableRow, { label: "Status", value: editMode ? undefined : product.status, editing: editMode && currentField.key === 'status', editValue: editValues.status, onEdit: handleEditChange, hint: "Enter to cycle" })] })), activeTab === 'variants' && (_jsx(Box, { flexDirection: "column", children: product.variants.length === 0 ? (_jsx(Text, { dimColor: true, children: "No variants" })) : (product.variants.map((v, i) => (_jsx(Box, { children: _jsxs(Text, { children: [_jsx(Text, { dimColor: true, children: v.sku.padEnd(20) }), ' ', _jsx(Text, { children: v.colorName.padEnd(12) }), ' ', _jsx(Text, { children: v.sizeName.padEnd(6) }), ' ', _jsx(Text, { color: v.status === 'in_stock' ? 'green' : v.status === 'out_of_stock' ? 'red' : 'yellow', children: v.status.padEnd(14) }), ' ', _jsxs(Text, { children: ["qty:", v.quantityAvailable] })] }) }, i)))) })), activeTab === 'images' && (_jsx(Box, { flexDirection: "column", children: product.images.length === 0 ? (_jsx(Text, { dimColor: true, children: "No images" })) : (product.images.map((img, i) => (_jsx(Box, { children: _jsxs(Text, { children: [img.isPrimary ? _jsx(Text, { color: "yellow", children: "\u2605" }) : ' ', ' ', _jsx(Text, { children: img.imageType.padEnd(10) }), ' ', _jsx(Text, { dimColor: true, children: img.url.length > 50 ? img.url.slice(0, 50) + '…' : img.url })] }) }, i)))) })), activeTab === 'pricing' && (_jsx(Box, { flexDirection: "column", children: product.pricingHistory.length === 0 ? (_jsx(Text, { dimColor: true, children: "No pricing history" })) : (product.pricingHistory.map((p, i) => (_jsx(Box, { children: _jsxs(Text, { children: [_jsx(Text, { dimColor: true, children: p.effectiveDate }), ' ', _jsx(Text, { children: p.fieldChanged }), ' ', _jsx(Text, { color: "red", children: eurCents(p.oldValue) }), "\u2192", _jsx(Text, { color: "green", children: eurCents(p.newValue) }), p.changeReason ? _jsxs(Text, { dimColor: true, children: [" (", p.changeReason, ")"] }) : null] }) }, i)))) })), saving && (_jsx(Box, { marginTop: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Saving...'] }) })), saveResult && (_jsx(Box, { marginTop: 1, children: _jsx(Text, { color: saveResult.startsWith('✓') ? 'green' : saveResult.startsWith('⚠') ? 'yellow' : 'red', children: saveResult }) })), _jsx(Box, { marginTop: 1, children: editMode ? (_jsxs(Text, { dimColor: true, children: ["Tab: next field \u00B7 S: save \u00B7 Esc: cancel", '  ', "[", currentField.label, "]"] })) : (_jsx(Text, { dimColor: true, children: "E: Edit \u00B7 1-4: Tabs \u00B7 R: Refresh \u00B7 Esc: Back" })) })] }));
}
function DetailRow({ label, value }) {
    return (_jsxs(Box, { children: [_jsx(Box, { width: 16, children: _jsxs(Text, { dimColor: true, children: [label, ":"] }) }), _jsx(Text, { children: value })] }));
}
function EditableRow({ label, value, editing, editValue, onEdit, hint, }) {
    return (_jsxs(Box, { children: [_jsx(Box, { width: 16, children: _jsxs(Text, { dimColor: true, children: [label, ":"] }) }), editing ? (_jsxs(Box, { children: [_jsx(TextInput, { value: editValue, onChange: onEdit, onSubmit: () => { }, showCursor: true, placeholder: hint ?? '' }), hint && _jsxs(Text, { dimColor: true, children: [" ", hint] })] })) : (_jsx(Text, { children: value ?? editValue }))] }));
}
