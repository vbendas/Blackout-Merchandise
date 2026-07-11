import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
function pad(str, len) {
    const s = String(str);
    if (s.length >= len)
        return s.slice(0, len - 1) + '…';
    return s + ' '.repeat(len - s.length);
}
export function SizesScreen({ maxHeight }) {
    const { stdout } = useStdout();
    const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
    const setStatus = useAppStore((s) => s.setStatus);
    const [categories, setCategories] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRow, setSelectedRow] = useState(0);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [mode, setMode] = useState('list');
    const [inputValue, setInputValue] = useState('');
    const [pendingName, setPendingName] = useState('');
    const [pendingCategory, setPendingCategory] = useState('');
    const getCategoryName = useCallback((id) => {
        return categories.find((c) => c.id === id)?.name ?? '—';
    }, [categories]);
    const loadSizes = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { db, sql } = await import('@db-root/index');
            const { sizes } = await import('@db-root/schema');
            const result = await db.select().from(sizes).orderBy(sql `${sizes.displayOrder} asc nulls last`);
            setSizes(result);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sizes');
        }
        finally {
            setLoading(false);
        }
    }, []);
    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const { getAllCategories } = await import('@db-root/catalog');
            const cats = await getAllCategories();
            setCategories(cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug })));
            await loadSizes();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
            setLoading(false);
        }
    }, [loadSizes]);
    useEffect(() => {
        loadAll();
    }, [loadAll]);
    const filteredSizes = categoryFilter === 'all'
        ? sizes
        : sizes.filter((s) => s.categoryId === categoryFilter);
    useEffect(() => {
        setSelectedRow(0);
    }, [filteredSizes.length]);
    const getMaxOrder = useCallback((catId) => {
        let max = 0;
        for (const s of sizes) {
            if (s.categoryId === catId && s.displayOrder != null && s.displayOrder > max)
                max = s.displayOrder;
        }
        return max + 1;
    }, [sizes]);
    useInput((input, key) => {
        if (mode !== 'list')
            return;
        if (key.upArrow) {
            setSelectedRow((r) => Math.max(0, r - 1));
        }
        else if (key.downArrow) {
            setSelectedRow((r) => Math.min(filteredSizes.length - 1, r + 1));
        }
        else if (input === 'a') {
            setMode('add-name');
            setInputValue('');
        }
        else if (input === 'd' && filteredSizes[selectedRow]) {
            toggleActive(filteredSizes[selectedRow]);
        }
        else if (input === 'c' && categories.length > 0) {
            if (categoryFilter === 'all') {
                setCategoryFilter(categories[0].id);
            }
            else {
                const idx = categories.findIndex((c) => c.id === categoryFilter);
                if (idx >= categories.length - 1) {
                    setCategoryFilter('all');
                }
                else {
                    setCategoryFilter(categories[idx + 1].id);
                }
            }
        }
        else if (input === 'r') {
            loadAll();
        }
    });
    const toggleActive = async (item) => {
        try {
            const { db, eq } = await import('@db-root/index');
            const { sizes } = await import('@db-root/schema');
            await db.update(sizes).set({ isActive: !item.isActive }).where(eq(sizes.id, item.id));
            setStatus(`${item.isActive ? 'Deactivated' : 'Activated'}: ${item.name}`);
            await loadAll();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Toggle failed');
        }
    };
    const handleAddName = () => {
        if (!inputValue.trim())
            return;
        setPendingName(inputValue.trim());
        setInputValue('');
        setMode('add-category');
    };
    const handleAddCategory = () => {
        const cat = categories[parseInt(inputValue) - 1];
        if (!cat)
            return;
        setPendingCategory(cat.id);
        setInputValue('');
        setMode('add-measurements');
    };
    const handleAddMeasurements = async () => {
        let measurements = null;
        if (inputValue.trim()) {
            try {
                const parsed = JSON.parse(inputValue);
                if (typeof parsed === 'object' && parsed !== null) {
                    measurements = parsed;
                }
            }
            catch {
                setError('Invalid JSON. Use {"chest": "50cm"} format or leave empty.');
                return;
            }
        }
        try {
            const { db } = await import('@db-root/index');
            const { sizes } = await import('@db-root/schema');
            await db.insert(sizes).values({
                name: pendingName,
                categoryId: pendingCategory,
                displayOrder: getMaxOrder(pendingCategory),
                measurements,
            });
            setStatus(`Created size: ${pendingName}`);
            setMode('list');
            setInputValue('');
            setPendingName('');
            setPendingCategory('');
            await loadAll();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
            setMode('list');
        }
    };
    const cancelForm = () => {
        setMode('list');
        setInputValue('');
        setPendingName('');
        setPendingCategory('');
    };
    if (loading && sizes.length === 0) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading sizes...'] }) }));
    }
    if (error && sizes.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, { dimColor: true, children: "Press R to retry" })] }));
    }
    // Dynamic column widths: Measurements gets all remaining space
    const NAME_W = 8;
    const CAT_W = 16;
    const ORDER_W = 8;
    const STATUS_W = 8;
    const fixedTotal = NAME_W + CAT_W + ORDER_W + STATUS_W;
    const separatorChars = 4 * 3; // 4 separators " │ "
    const prefixChars = 2;
    const indicatorChars = 2;
    const MEAS_W = Math.max(20, contentWidth - fixedTotal - separatorChars - prefixChars - indicatorChars);
    const header = `  ${pad('Size', NAME_W)} │ ${pad('Category', CAT_W)} │ ${pad('Order', ORDER_W)} │ ${pad('Measurements', MEAS_W)} │ ${pad('Status', STATUS_W)}`;
    const separator = `  ${'─'.repeat(NAME_W)}─┼─${'─'.repeat(CAT_W)}─┼─${'─'.repeat(ORDER_W)}─┼─${'─'.repeat(MEAS_W)}─┼─${'─'.repeat(STATUS_W)}`;
    const rows = filteredSizes.map((item, idx) => {
        const isSel = idx === selectedRow;
        const measStr = item.measurements ? JSON.stringify(item.measurements) : '—';
        const row = `${pad(item.name, NAME_W)} │ ${pad(getCategoryName(item.categoryId), CAT_W)} │ ${pad(String(item.displayOrder ?? 0), ORDER_W)} │ ${pad(measStr, MEAS_W)} │ ${pad(item.isActive ? 'Active' : 'Inactive', STATUS_W)}`;
        return (_jsxs(Text, { color: isSel ? 'green' : 'white', bold: isSel, children: [isSel ? '▸ ' : '  ', row] }, item.id));
    });
    const currentCat = categoryFilter === 'all' ? 'All' : getCategoryName(categoryFilter);
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { marginBottom: 1, justifyContent: "space-between", children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCCF Sizes" }), _jsxs(Text, { dimColor: true, children: ["Category: ", _jsx(Text, { bold: true, children: currentCat }), ` · ${filteredSizes.length} shown`] })] }), mode === 'list' && (_jsxs(_Fragment, { children: [_jsx(Text, { bold: true, color: "cyan", children: header }), _jsx(Text, { dimColor: true, children: separator }), rows.length > 0 ? rows : _jsx(Text, { dimColor: true, children: "  No sizes found" }), _jsx(Text, { dimColor: true }), _jsx(Text, { dimColor: true, children: "A: Add \u00B7 D: Toggle active \u00B7 C: Filter category \u00B7 R: Refresh \u00B7 Esc: Back" })] })), mode === 'add-name' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Add Size \u2014 Name" }), _jsxs(Box, { children: [_jsx(Text, { children: "Name: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAddName, placeholder: "e.g. M, XL, 3XL", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to continue \u00B7 Esc to cancel" })] })), mode === 'add-category' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Add Size \u2014 Select Category" }), _jsx(Text, { dimColor: true, children: `For size: ${pendingName}` }), categories.map((cat, idx) => (_jsx(Text, { children: `  ${idx + 1}. ${cat.name} (${cat.slug})` }, cat.id))), _jsxs(Box, { children: [_jsx(Text, { children: "Category #: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAddCategory, placeholder: "1", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter number to select \u00B7 Esc to cancel" })] })), mode === 'add-measurements' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Add Size \u2014 Measurements" }), _jsx(Text, { dimColor: true, children: `${pendingName} → ${getCategoryName(pendingCategory)}` }), _jsxs(Box, { children: [_jsx(Text, { children: "JSON: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAddMeasurements, placeholder: '{"chest":"50cm","length":"70cm"}', showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to create (empty = skip) \u00B7 Esc to cancel" })] })), error && _jsxs(Text, { color: "red", children: ["\u2717 ", error] })] }));
}
