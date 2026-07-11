import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
function pad(str, len) {
    const s = String(str);
    if (s.length >= len)
        return s.slice(0, len - 1) + '…';
    return s + ' '.repeat(len - s.length);
}
export function CategoriesScreen({ maxHeight }) {
    const { stdout } = useStdout();
    const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
    const setStatus = useAppStore((s) => s.setStatus);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRow, setSelectedRow] = useState(0);
    const [mode, setMode] = useState('list');
    const [inputValue, setInputValue] = useState('');
    const [editItem, setEditItem] = useState(null);
    const [pendingName, setPendingName] = useState('');
    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { getAllCategories } = await import('@db-root/catalog');
            const result = await getAllCategories();
            setItems(result);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load categories');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadCategories();
    }, [loadCategories]);
    useEffect(() => {
        setSelectedRow(0);
    }, [items]);
    const reload = useCallback(async () => {
        await loadCategories();
    }, [loadCategories]);
    useInput((input, key) => {
        if (mode !== 'list')
            return;
        if (key.upArrow) {
            setSelectedRow((r) => Math.max(0, r - 1));
        }
        else if (key.downArrow) {
            setSelectedRow((r) => Math.min(items.length - 1, r + 1));
        }
        else if (input === 'a') {
            setMode('add-name');
            setInputValue('');
        }
        else if (input === 'e' && items[selectedRow]) {
            setEditItem(items[selectedRow]);
            setInputValue(items[selectedRow].name);
            setMode('edit-name');
        }
        else if (input === 'd' && items[selectedRow]) {
            toggleActive(items[selectedRow]);
        }
        else if (input === 'r') {
            reload();
        }
    });
    const toggleActive = async (item) => {
        try {
            const { updateCategory } = await import('@db-root/catalog');
            await updateCategory(item.id, { isActive: !item.isActive });
            setStatus(`${item.isActive ? 'Deactivated' : 'Activated'}: ${item.name}`);
            await reload();
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
        setMode('add-desc');
    };
    const handleAddDesc = async () => {
        try {
            const { createCategory } = await import('@db-root/catalog');
            const slug = slugify(pendingName);
            await createCategory({
                name: pendingName,
                slug,
                description: inputValue.trim() || null,
            });
            setStatus(`Created category: ${pendingName}`);
            setMode('list');
            setInputValue('');
            setPendingName('');
            await reload();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
            setMode('list');
        }
    };
    const handleEditName = () => {
        if (!inputValue.trim() || !editItem)
            return;
        setPendingName(inputValue.trim());
        setInputValue(editItem.description || '');
        setMode('edit-desc');
    };
    const handleEditDesc = async () => {
        if (!editItem)
            return;
        try {
            const { updateCategory } = await import('@db-root/catalog');
            await updateCategory(editItem.id, {
                name: pendingName,
                description: inputValue.trim() || null,
            });
            setStatus(`Updated: ${pendingName}`);
            setMode('list');
            setInputValue('');
            setEditItem(null);
            setPendingName('');
            await reload();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
            setMode('list');
        }
    };
    const cancelForm = () => {
        setMode('list');
        setInputValue('');
        setEditItem(null);
        setPendingName('');
    };
    if (loading && items.length === 0) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading categories...'] }) }));
    }
    if (error && items.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, { dimColor: true, children: "Press R to retry" })] }));
    }
    // Dynamic column widths: Name gets all remaining space
    const SLUG_W = 16;
    const DESC_W = 30;
    const ORDER_W = 6;
    const STATUS_W = 8;
    const fixedTotal = SLUG_W + DESC_W + ORDER_W + STATUS_W;
    const separatorChars = 4 * 3; // 4 separators " │ "
    const prefixChars = 2;
    const indicatorChars = 2;
    const NAME_W = Math.max(20, contentWidth - fixedTotal - separatorChars - prefixChars - indicatorChars);
    const header = `  ${pad('Name', NAME_W)} │ ${pad('Slug', SLUG_W)} │ ${pad('Description', DESC_W)} │ ${pad('Order', ORDER_W)} │ ${pad('Status', STATUS_W)}`;
    const separator = `  ${'─'.repeat(NAME_W)}─┼─${'─'.repeat(SLUG_W)}─┼─${'─'.repeat(DESC_W)}─┼─${'─'.repeat(ORDER_W)}─┼─${'─'.repeat(STATUS_W)}`;
    const rows = items.map((item, idx) => {
        const isSel = idx === selectedRow;
        const row = `${pad(item.name, NAME_W)} │ ${pad(item.slug, SLUG_W)} │ ${pad(item.description || '—', DESC_W)} │ ${pad(String(item.displayOrder ?? 0), ORDER_W)} │ ${pad(item.isActive ? 'Active' : 'Inactive', STATUS_W)}`;
        return (_jsxs(Text, { color: isSel ? 'green' : 'white', bold: isSel, children: [isSel ? '▸ ' : '  ', row] }, item.id));
    });
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83C\uDFF7\uFE0F  Categories" }), _jsx(Text, { dimColor: true, children: ` · ${items.length} total` })] }), mode === 'list' && (_jsxs(_Fragment, { children: [_jsx(Text, { bold: true, color: "cyan", children: header }), _jsx(Text, { dimColor: true, children: separator }), rows.length > 0 ? rows : _jsx(Text, { dimColor: true, children: "  No categories found" }), _jsx(Text, { dimColor: true }), _jsx(Text, { dimColor: true, children: "A: Add \u00B7 E: Edit \u00B7 D: Toggle active \u00B7 R: Refresh \u00B7 Esc: Back" })] })), mode === 'add-name' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Add Category \u2014 Name" }), _jsxs(Box, { children: [_jsx(Text, { children: "Name: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAddName, placeholder: "e.g. T-Shirts", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to continue \u00B7 Esc to cancel" }), _jsx(Text, { dimColor: true, children: "Slug will be auto-generated" })] })), mode === 'add-desc' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Add Category \u2014 Description" }), _jsx(Text, { dimColor: true, children: `For: ${pendingName} (${slugify(pendingName)})` }), _jsxs(Box, { children: [_jsx(Text, { children: "Description: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAddDesc, placeholder: "Optional description...", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to create \u00B7 Esc to cancel" })] })), mode === 'edit-name' && editItem && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Edit Category \u2014 Name" }), _jsx(Text, { dimColor: true, children: `Editing: ${editItem.slug}` }), _jsxs(Box, { children: [_jsx(Text, { children: "Name: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleEditName, showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to continue \u00B7 Esc to cancel" })] })), mode === 'edit-desc' && editItem && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Edit Category \u2014 Description" }), _jsx(Text, { dimColor: true, children: `Name: ${pendingName}` }), _jsxs(Box, { children: [_jsx(Text, { children: "Description: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleEditDesc, showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to save \u00B7 Esc to cancel" })] })), error && _jsxs(Text, { color: "red", children: ["\u2717 ", error] })] }));
}
