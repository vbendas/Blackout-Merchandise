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
export function ColorsScreen({ maxHeight }) {
    const { stdout } = useStdout();
    const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
    const setStatus = useAppStore((s) => s.setStatus);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRow, setSelectedRow] = useState(0);
    const [mode, setMode] = useState('list');
    const [inputValue, setInputValue] = useState('');
    const [pendingName, setPendingName] = useState('');
    const loadColors = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { getAllColors } = await import('@db-root/catalog');
            const result = await getAllColors();
            setItems(result);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load colors');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadColors();
    }, [loadColors]);
    useEffect(() => {
        setSelectedRow(0);
    }, [items]);
    const reload = useCallback(async () => {
        await loadColors();
    }, [loadColors]);
    const getMaxOrder = useCallback(() => {
        let max = 0;
        for (const item of items) {
            if (item.displayOrder != null && item.displayOrder > max)
                max = item.displayOrder;
        }
        return max + 1;
    }, [items]);
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
        else if (input === 'd' && items[selectedRow]) {
            toggleActive(items[selectedRow]);
        }
        else if (input === 'r') {
            reload();
        }
    });
    const toggleActive = async (item) => {
        try {
            const { db, eq } = await import('@db-root/index');
            const { colors } = await import('@db-root/schema');
            await db.update(colors).set({ isActive: !item.isActive }).where(eq(colors.id, item.id));
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
        setInputValue('#');
        setMode('add-hex');
    };
    const handleAddHex = async () => {
        const hexMatch = inputValue.match(/^#?([0-9a-fA-F]{6})$/);
        if (!hexMatch) {
            setError('Invalid hex code. Use #RRGGBB format.');
            return;
        }
        const hex = hexMatch[1].toUpperCase();
        try {
            const { db } = await import('@db-root/index');
            const { colors } = await import('@db-root/schema');
            await db.insert(colors).values({
                name: pendingName,
                hexCode: `#${hex}`,
                displayOrder: getMaxOrder(),
            });
            setStatus(`Created color: ${pendingName}`);
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
    const cancelForm = () => {
        setMode('list');
        setInputValue('');
        setPendingName('');
    };
    if (loading && items.length === 0) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading colors...'] }) }));
    }
    if (error && items.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, { dimColor: true, children: "Press R to retry" })] }));
    }
    // Dynamic column widths: Name gets all remaining space
    const HEX_W = 10;
    const ORDER_W = 8;
    const STATUS_W = 8;
    const fixedTotal = HEX_W + ORDER_W + STATUS_W;
    const separatorChars = 3 * 3; // 3 separators " │ "
    const prefixChars = 2;
    const indicatorChars = 2;
    const NAME_W = Math.max(20, contentWidth - fixedTotal - separatorChars - prefixChars - indicatorChars);
    const header = `  ${pad('Name', NAME_W)} │ ${pad('Hex Code', HEX_W)} │ ${pad('Order', ORDER_W)} │ ${pad('Status', STATUS_W)}`;
    const separator = `  ${'─'.repeat(NAME_W)}─┼─${'─'.repeat(HEX_W)}─┼─${'─'.repeat(ORDER_W)}─┼─${'─'.repeat(STATUS_W)}`;
    const rows = items.map((item, idx) => {
        const isSel = idx === selectedRow;
        const row = `${pad(item.name, NAME_W)} │ ${pad(item.hexCode || '—', HEX_W)} │ ${pad(String(item.displayOrder ?? 0), ORDER_W)} │ ${pad(item.isActive ? 'Active' : 'Inactive', STATUS_W)}`;
        return (_jsxs(Text, { color: isSel ? 'green' : 'white', bold: isSel, children: [isSel ? '▸ ' : '  ', row] }, item.id));
    });
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83C\uDFA8 Colors" }), _jsx(Text, { dimColor: true, children: ` · ${items.length} total` })] }), mode === 'list' && (_jsxs(_Fragment, { children: [_jsx(Text, { bold: true, color: "cyan", children: header }), _jsx(Text, { dimColor: true, children: separator }), rows.length > 0 ? rows : _jsx(Text, { dimColor: true, children: "  No colors found" }), _jsx(Text, { dimColor: true }), _jsx(Text, { dimColor: true, children: "A: Add \u00B7 D: Toggle active \u00B7 R: Refresh \u00B7 Esc: Back" })] })), mode === 'add-name' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Add Color \u2014 Name" }), _jsxs(Box, { children: [_jsx(Text, { children: "Name: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAddName, placeholder: "e.g. Navy", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to continue \u00B7 Esc to cancel" })] })), mode === 'add-hex' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Add Color \u2014 Hex Code" }), _jsx(Text, { dimColor: true, children: `For: ${pendingName}` }), _jsxs(Box, { children: [_jsx(Text, { children: "Hex (#RRGGBB): " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleAddHex, placeholder: "#000000", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to create \u00B7 Esc to cancel" })] })), error && _jsxs(Text, { color: "red", children: ["\u2717 ", error] })] }));
}
