import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
export function SupplierOrderCreateScreen({ maxHeight }) {
    const setScreen = useAppStore((s) => s.setScreen);
    const setStatus = useAppStore((s) => s.setStatus);
    const [step, setStep] = useState('supplier');
    const [supplierName, setSupplierName] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([]);
    // Item selection state
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [selectedProductIdx, setSelectedProductIdx] = useState(0);
    const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemUnitCost, setItemUnitCost] = useState('');
    const [showProductList, setShowProductList] = useState(false);
    const [showVariantList, setShowVariantList] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // Load products for item selection
    useEffect(() => {
        (async () => {
            try {
                const { getAllCatalogProducts } = await import('@db-root/catalog');
                const prods = await getAllCatalogProducts();
                setProducts(prods);
            }
            catch {
                // Ignore
            }
        })();
    }, []);
    // Load variants when product selected
    useEffect(() => {
        if (!products[selectedProductIdx])
            return;
        (async () => {
            try {
                const { getVariantsByProduct } = await import('@db-root/catalog');
                const vars = await getVariantsByProduct(products[selectedProductIdx].id);
                setVariants(vars);
                setSelectedVariantIdx(0);
            }
            catch {
                setVariants([]);
            }
        })();
    }, [products, selectedProductIdx]);
    const addItem = () => {
        const variant = variants[selectedVariantIdx];
        if (!variant)
            return;
        const qty = parseInt(itemQuantity);
        const cost = parseFloat(itemUnitCost);
        if (!qty || qty <= 0 || !cost || cost <= 0)
            return;
        setItems((prev) => [
            ...prev,
            {
                variantId: variant.id,
                variantSku: variant.sku,
                productName: products[selectedProductIdx].name,
                colorName: variant.color?.name ?? '?',
                sizeName: variant.size?.name ?? '?',
                quantity: qty,
                unitCostEur: cost,
            },
        ]);
        setItemQuantity('');
        setItemUnitCost('');
    };
    const removeItem = (idx) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };
    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCostEur, 0);
    const handleSubmit = async () => {
        if (items.length === 0 || !supplierName)
            return;
        setStep('submitting');
        setError('');
        try {
            const { createSupplierOrder } = await import('@db-root/supplier-orders');
            const deliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined;
            await createSupplierOrder({
                supplierName,
                expectedDeliveryDate: deliveryDate,
                notes: notes || undefined,
                items: items.map(item => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitCostEur: Math.round(item.unitCostEur * 100), // Convert to cents
                })),
            });
            setSuccess('✓ Purchase order created successfully!');
            setStatus(`PO created: ${supplierName}, ${items.length} items`);
            setTimeout(() => {
                setScreen('supplier-orders');
            }, 1500);
        }
        catch (err) {
            setError(`✗ Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStep('review');
        }
    };
    useInput((input, key) => {
        if (step === 'submitting')
            return;
        if (key.escape) {
            setScreen('supplier-orders');
            return;
        }
        if (step === 'supplier') {
            if (key.return && supplierName.trim()) {
                setStep('add-items');
            }
            return;
        }
        if (step === 'add-items') {
            if (input === 'a' && itemQuantity && itemUnitCost) {
                addItem();
                return;
            }
            if (input === 'n' && items.length > 0) {
                setStep('review');
                return;
            }
            if (key.upArrow) {
                if (showProductList)
                    setSelectedProductIdx((i) => Math.max(0, i - 1));
                else if (showVariantList)
                    setSelectedVariantIdx((i) => Math.max(0, i - 1));
            }
            if (key.downArrow) {
                if (showProductList)
                    setSelectedProductIdx((i) => Math.min(products.length - 1, i + 1));
                else if (showVariantList)
                    setSelectedVariantIdx((i) => Math.min(variants.length - 1, i + 1));
            }
            if (key.return) {
                if (showProductList && products[selectedProductIdx]) {
                    setShowProductList(false);
                }
                else if (showVariantList && variants[selectedVariantIdx]) {
                    setShowVariantList(false);
                }
            }
            if (input === 'p')
                setShowProductList((v) => !v);
            if (input === 'v')
                setShowVariantList((v) => !v);
            return;
        }
        if (step === 'review') {
            if (input === 's') {
                handleSubmit();
                return;
            }
            if (input === 'b') {
                setStep('add-items');
                return;
            }
            // Remove item with number keys
            if (input >= '1' && input <= '9') {
                const idx = parseInt(input) - 1;
                if (idx < items.length)
                    removeItem(idx);
            }
        }
    });
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCE6 Create Purchase Order" }), _jsxs(Text, { dimColor: true, children: ["Step: ", step === 'supplier' ? '1/3' : step === 'add-items' ? '2/3' : '3/3'] })] }), step === 'supplier' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { children: "Supplier Name: " }), _jsx(TextInput, { value: supplierName, onChange: setSupplierName, onSubmit: () => { if (supplierName.trim())
                                    setStep('add-items'); }, placeholder: "e.g. Stanley Stella", showCursor: true })] }), _jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { children: "Expected Delivery (YYYY-MM-DD): " }), _jsx(TextInput, { value: expectedDeliveryDate, onChange: setExpectedDeliveryDate, onSubmit: () => { }, placeholder: "e.g. 2026-06-15", showCursor: true })] }), _jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { children: "Notes: " }), _jsx(TextInput, { value: notes, onChange: setNotes, onSubmit: () => { }, placeholder: "Optional notes...", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter: Continue \u00B7 Esc: Cancel" })] })), step === 'add-items' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Add Items (", items.length, " added)"] }), _jsxs(Box, { marginTop: 1, flexDirection: "column", children: [_jsxs(Text, { children: ["Product: ", _jsx(Text, { bold: true, children: products[selectedProductIdx]?.name ?? '—' }), _jsx(Text, { dimColor: true, children: " (P: toggle list)" })] }), showProductList && (_jsx(Box, { flexDirection: "column", paddingLeft: 2, height: 5, children: products.map((p, i) => (_jsxs(Text, { color: i === selectedProductIdx ? 'green' : 'white', bold: i === selectedProductIdx, children: [i === selectedProductIdx ? '▸ ' : '  ', p.sku, " ", p.name] }, p.id))) }))] }), _jsxs(Box, { marginTop: 1, flexDirection: "column", children: [_jsxs(Text, { children: ["Variant: ", _jsx(Text, { bold: true, children: variants[selectedVariantIdx] ? `${variants[selectedVariantIdx].color?.name} / ${variants[selectedVariantIdx].size?.name}` : '—' }), _jsx(Text, { dimColor: true, children: " (V: toggle list)" })] }), showVariantList && (_jsx(Box, { flexDirection: "column", paddingLeft: 2, height: 5, children: variants.map((v, i) => (_jsxs(Text, { color: i === selectedVariantIdx ? 'green' : 'white', bold: i === selectedVariantIdx, children: [i === selectedVariantIdx ? '▸ ' : '  ', v.sku, " ", v.color?.name, " / ", v.size?.name] }, v.id))) }))] }), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { children: "Qty: " }), _jsx(TextInput, { value: itemQuantity, onChange: setItemQuantity, onSubmit: () => { }, placeholder: "6", showCursor: true }), _jsx(Text, { children: "  Unit Cost \u20AC: " }), _jsx(TextInput, { value: itemUnitCost, onChange: setItemUnitCost, onSubmit: () => { }, placeholder: "4.50", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "A: Add Item \u00B7 N: Next (review) \u00B7 Esc: Cancel" }), items.length > 0 && (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, color: "yellow", children: "Items to order:" }), items.map((item, i) => (_jsxs(Text, { dimColor: true, children: [i + 1, ". ", item.productName, " - ", item.colorName, "/", item.sizeName, " \u00D7 ", item.quantity, " @ \u20AC", item.unitCostEur.toFixed(2), " = \u20AC", ((item.quantity * item.unitCostEur) / 100).toFixed(2)] }, i))), _jsxs(Text, { bold: true, children: ["Total: \u20AC", (totalCost / 100).toFixed(2)] })] }))] })), step === 'review' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Review Order" }), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { children: ["Supplier: ", _jsx(Text, { bold: true, children: supplierName })] }) }), expectedDeliveryDate && (_jsxs(Text, { children: ["ETA: ", _jsx(Text, { bold: true, children: expectedDeliveryDate })] })), notes && _jsxs(Text, { dimColor: true, children: ["Notes: ", notes] }), _jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, color: "yellow", children: "Items:" }), items.map((item, i) => (_jsxs(Text, { children: [_jsxs(Text, { dimColor: true, children: [i + 1, "."] }), " ", item.productName, " - ", item.colorName, "/", item.sizeName, ' ', "\u00D7 ", item.quantity, " @ \u20AC", item.unitCostEur.toFixed(2), ' ', "= ", _jsxs(Text, { bold: true, children: ["\u20AC", ((item.quantity * item.unitCostEur) / 100).toFixed(2)] })] }, i)))] }), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { bold: true, children: ["Total: \u20AC", (totalCost / 100).toFixed(2)] }) }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "S: Submit \u00B7 B: Back \u00B7 1-9: Remove item \u00B7 Esc: Cancel" }) })] })), step === 'submitting' && (_jsx(Box, { paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Creating purchase order...'] }) })), error && (_jsx(Box, { marginTop: 1, paddingLeft: 1, children: _jsx(Text, { color: "red", children: error }) })), success && (_jsx(Box, { marginTop: 1, paddingLeft: 1, children: _jsx(Text, { color: "green", children: success }) }))] }));
}
