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
function relativeTime(date) {
    if (!date)
        return '—';
    const now = Date.now();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)
        return 'just now';
    if (diffMin < 60)
        return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
        return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30)
        return `${diffDay}d ago`;
    return new Date(date).toISOString().slice(0, 10);
}
function truncateMiddle(str, maxLen) {
    if (str.length <= maxLen)
        return str;
    const half = Math.floor((maxLen - 3) / 2);
    return str.slice(0, half) + '...' + str.slice(str.length - half);
}
const PAGE_SIZE = 20;
export function SettingsPlaceholder({ maxHeight }) {
    const { stdout } = useStdout();
    const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
    const setStatus = useAppStore((s) => s.setStatus);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selectedRow, setSelectedRow] = useState(0);
    const [page, setPage] = useState(0);
    const [mode, setMode] = useState('list');
    const [inputValue, setInputValue] = useState('');
    const [editItem, setEditItem] = useState(null);
    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { getAllSettings } = await import('@db-root/knowledge');
            const result = await getAllSettings();
            setItems(result);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load settings');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    useEffect(() => {
        setSelectedRow(0);
    }, [pageItems.length]);
    useEffect(() => {
        setPage(0);
    }, [items.length]);
    const reload = useCallback(async () => {
        await loadSettings();
        setStatus('Settings refreshed');
    }, [loadSettings, setStatus]);
    const handleSave = useCallback(async (key, newValue, newJsonValue) => {
        setSaving(true);
        setError('');
        try {
            const { updateSetting, clearKnowledgeCache } = await import('@db-root/knowledge');
            if (newJsonValue !== undefined) {
                await updateSetting(key, 'json', newJsonValue);
            }
            else {
                await updateSetting(key, newValue);
            }
            clearKnowledgeCache();
            setStatus(`Updated: ${key}`);
            setMode('list');
            setInputValue('');
            setEditItem(null);
            await loadSettings();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        }
        finally {
            setSaving(false);
        }
    }, [loadSettings, setStatus]);
    const handleDelete = useCallback(async (item) => {
        setSaving(true);
        setError('');
        try {
            const { updateSetting, clearKnowledgeCache } = await import('@db-root/knowledge');
            await updateSetting(item.key, '');
            clearKnowledgeCache();
            setStatus(`Cleared: ${item.key}`);
            await loadSettings();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
        finally {
            setSaving(false);
        }
    }, [loadSettings, setStatus]);
    useInput((input, key) => {
        if (mode === 'edit-json-prompt') {
            if (key.escape) {
                cancelForm();
            }
            else if (input === 'y' || input === 'Y') {
                handleJsonPromptYes();
            }
            else if (input === 'n' || input === 'N') {
                handleJsonPromptNo();
            }
            return;
        }
        if (mode === 'seed-msg') {
            setMode('list');
            return;
        }
        if (mode !== 'list')
            return;
        if (key.escape) {
            return;
        }
        if (key.upArrow) {
            setSelectedRow((r) => Math.max(0, r - 1));
        }
        else if (key.downArrow) {
            setSelectedRow((r) => Math.min(pageItems.length - 1, r + 1));
        }
        else if (key.leftArrow && page > 0) {
            setPage((p) => p - 1);
        }
        else if (key.rightArrow && page < totalPages - 1) {
            setPage((p) => p + 1);
        }
        else if (input === 'e' && pageItems[selectedRow]) {
            const item = pageItems[selectedRow];
            setEditItem(item);
            if (item.valueJson != null) {
                setMode('edit-json-prompt');
                setInputValue('');
            }
            else {
                setInputValue(item.value);
                setMode('edit-value');
            }
        }
        else if (input === 'd' && pageItems[selectedRow]) {
            handleDelete(pageItems[selectedRow]);
        }
        else if (input === 'r') {
            reload();
        }
        else if (input === 's') {
            setMode('seed-msg');
        }
    });
    const handleEditValueSubmit = () => {
        if (!editItem)
            return;
        handleSave(editItem.key, inputValue.trim());
    };
    const handleJsonPromptYes = () => {
        if (!editItem)
            return;
        setInputValue(JSON.stringify(editItem.valueJson, null, 2));
        setMode('edit-json');
    };
    const handleJsonPromptNo = () => {
        if (!editItem)
            return;
        setInputValue(editItem.value);
        setMode('edit-value');
    };
    const handleEditJsonSubmit = () => {
        if (!editItem)
            return;
        try {
            const parsed = JSON.parse(inputValue);
            handleSave(editItem.key, 'json', parsed);
        }
        catch {
            setError('Invalid JSON. Fix syntax or press Esc to cancel.');
        }
    };
    const cancelForm = () => {
        setMode('list');
        setInputValue('');
        setEditItem(null);
        setError('');
    };
    if (loading && items.length === 0) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading settings...'] }) }));
    }
    if (error && items.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, { dimColor: true, children: "Press R to retry" })] }));
    }
    // Dynamic column widths: Value gets all remaining space
    const KEY_W = 20;
    const TYPE_W = 6;
    const DESC_W = 25;
    const TIME_W = 10;
    const fixedTotal = KEY_W + TYPE_W + DESC_W + TIME_W;
    const separatorChars = 4 * 3; // 4 separators " │ "
    const prefixChars = 2;
    const indicatorChars = 2;
    const VAL_W = Math.max(20, contentWidth - fixedTotal - separatorChars - prefixChars - indicatorChars);
    const header = `  ${pad('Key', KEY_W)} │ ${pad('Value', VAL_W)} │ ${pad('Type', TYPE_W)} │ ${pad('Description', DESC_W)} │ ${pad('Updated', TIME_W)}`;
    const separator = `  ${'─'.repeat(KEY_W)}─┼─${'─'.repeat(VAL_W)}─┼─${'─'.repeat(TYPE_W)}─┼─${'─'.repeat(DESC_W)}─┼─${'─'.repeat(TIME_W)}`;
    const rows = pageItems.map((item, idx) => {
        const isSel = idx === selectedRow;
        const displayValue = item.valueJson != null
            ? truncateMiddle(JSON.stringify(item.valueJson), VAL_W)
            : truncateMiddle(item.value, VAL_W);
        const type = item.valueJson != null ? 'json' : 'text';
        const row = `${pad(item.key, KEY_W)} │ ${pad(displayValue, VAL_W)} │ ${pad(type, TYPE_W)} │ ${pad(item.description || '—', DESC_W)} │ ${pad(relativeTime(item.updatedAt), TIME_W)}`;
        return (_jsxs(Text, { color: isSel ? 'green' : 'white', bold: isSel, children: [isSel ? '▸ ' : '  ', row] }, item.id));
    });
    const pageInfo = totalPages > 1
        ? ` · Page ${page + 1}/${totalPages} (←/→)`
        : '';
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\u2699\uFE0F  Settings / Knowledge Base" }), _jsx(Text, { dimColor: true, children: ` · ${items.length} total${pageInfo}` })] }), mode === 'list' && (_jsxs(_Fragment, { children: [_jsx(Text, { bold: true, color: "cyan", children: header }), _jsx(Text, { dimColor: true, children: separator }), rows.length > 0 ? rows : _jsx(Text, { dimColor: true, children: "  No settings found" }), _jsx(Text, { dimColor: true }), _jsx(Text, { dimColor: true, children: "E: Edit \u00B7 D: Delete \u00B7 R: Refresh \u00B7 S: Run Seed \u00B7 Esc: Back" }), saving && (_jsxs(Text, { children: [_jsx(Text, { color: "yellow", children: _jsx(Spinner, { type: "dots" }) }), ' Saving...'] }))] })), mode === 'edit-value' && editItem && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Edit Setting" }), _jsx(Text, { dimColor: true, children: `Key: ${editItem.key}` }), _jsx(Text, { dimColor: true, children: `Current: ${editItem.valueJson != null ? JSON.stringify(editItem.valueJson) : editItem.value}` }), _jsx(Text, { dimColor: true }), _jsxs(Box, { children: [_jsx(Text, { children: "New value: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleEditValueSubmit, placeholder: "Enter new value...", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to save \u00B7 Esc to cancel" }), saving && (_jsxs(Text, { children: [_jsx(Text, { color: "yellow", children: _jsx(Spinner, { type: "dots" }) }), ' Saving...'] }))] })), mode === 'edit-json-prompt' && editItem && (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Edit Setting \u2014 ", editItem.key] }), _jsx(Text, { dimColor: true, children: `This setting has JSON data (valueJson).` }), _jsx(Text, { dimColor: true, children: `Current text value: ${editItem.value}` }), _jsx(Text, { dimColor: true, children: `Current JSON: ${JSON.stringify(editItem.valueJson)}` }), _jsx(Text, { dimColor: true }), _jsx(Text, { children: "Edit JSON? (Y/n)" }), _jsx(Text, { dimColor: true, children: "Y: Edit JSON \u00B7 N: Edit text value \u00B7 Esc: Cancel" })] })), mode === 'edit-json' && editItem && (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Edit JSON \u2014 ", editItem.key] }), _jsx(Text, { dimColor: true, children: "Current JSON:" }), _jsx(Box, { flexDirection: "column", marginLeft: 2, children: JSON.stringify(editItem.valueJson, null, 2).split('\n').map((line, i) => (_jsx(Text, { dimColor: true, children: line }, i))) }), _jsx(Text, { dimColor: true }), _jsxs(Box, { children: [_jsx(Text, { children: "New JSON: " }), _jsx(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleEditJsonSubmit, placeholder: "{}", showCursor: true })] }), _jsx(Text, { dimColor: true, children: "Enter to save \u00B7 Esc to cancel" }), saving && (_jsxs(Text, { children: [_jsx(Text, { color: "yellow", children: _jsx(Spinner, { type: "dots" }) }), ' Saving...'] }))] })), mode === 'seed-msg' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Seed Knowledge Base" }), _jsx(Text, { dimColor: true }), _jsx(Text, { children: "To reset settings to defaults, run from the repo root:" }), _jsx(Text, { bold: true, color: "green", children: "  bun run src/db/seed-knowledge.ts" }), _jsx(Text, { dimColor: true }), _jsx(Text, { dimColor: true, children: "Press any key to go back" })] })), error && _jsxs(Text, { color: "red", children: ["\u2717 ", error] })] }));
}
