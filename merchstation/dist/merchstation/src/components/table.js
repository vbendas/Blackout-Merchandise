import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text, useStdout } from 'ink';
export function Table({ columns, data, selectedRow, page, totalPages, totalItems, availableWidth, footerRight, maxHeight }) {
    const { stdout } = useStdout();
    const terminalWidth = availableWidth ?? stdout?.columns ?? 100;
    // Calculate dynamic widths: find the "name" (or first text-heavy) column and give it remaining space
    const fixedCols = columns.filter((c) => c.key !== 'name');
    const nameCol = columns.find((c) => c.key === 'name');
    const fixedTotal = fixedCols.reduce((sum, c) => sum + c.width, 0);
    const separatorChars = (columns.length - 1) * 3; // " │ " between columns
    const prefixChars = 2; // "  " prefix
    const indicatorChars = 2; // "▸ " or "  "
    const nameWidth = nameCol
        ? Math.max(20, terminalWidth - fixedTotal - separatorChars - prefixChars - indicatorChars)
        : 0;
    // Resolve columns with dynamic name width
    const resolvedColumns = columns.map((col) => col.key === 'name' ? { ...col, width: nameWidth } : col);
    // Header
    const header = resolvedColumns.map((col) => pad(col.label, col.width)).join(' │ ');
    const separator = resolvedColumns.map((col) => '─'.repeat(col.width)).join('─┼─');
    const rows = data.map((item, idx) => {
        const isSelected = idx === selectedRow;
        const row = resolvedColumns.map((col) => {
            const val = col.render(item);
            return pad(val, col.width);
        }).join(' │ ');
        return (_jsxs(Text, { color: isSelected ? 'green' : 'white', bold: isSelected, children: [isSelected ? '▸ ' : '  ', row] }, idx));
    });
    // Footer: left = pagination, right = shortcuts
    const pageInfo = `Page ${page}/${totalPages} · ${totalItems} items · ↑↓ Navigate · Enter: View · A: Add`;
    return (_jsxs(Box, { flexDirection: "column", width: "100%", height: maxHeight, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["  ", header] }), _jsxs(Text, { dimColor: true, children: ["  ", separator] }), rows.length > 0 ? rows : _jsx(Text, { dimColor: true, children: "  No data found" }), _jsx(Text, { dimColor: true }), _jsxs(Box, { width: "100%", justifyContent: "space-between", children: [_jsxs(Text, { dimColor: true, children: ['  ', pageInfo] }), footerRight && _jsx(Text, { dimColor: true, children: footerRight })] })] }));
}
function pad(str, len) {
    if (len <= 0)
        return '';
    if (str.length >= len)
        return str.slice(0, len - 1) + '…';
    return str + ' '.repeat(len - str.length);
}
