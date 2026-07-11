import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
export function StockDetailScreen({ maxHeight }) {
    const setScreen = useAppStore((s) => s.setScreen);
    const screenParams = useAppStore((s) => s.screenParams);
    const productId = screenParams.productId;
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedColors, setExpandedColors] = useState(new Set());
    const [cursorPos, setCursorPos] = useState(0); // Position in flattened list
    const loadDetail = useCallback(async () => {
        if (!productId)
            return;
        setLoading(true);
        setError('');
        try {
            const { getStockByProduct } = await import('@db-root/inventory-ops');
            const result = await getStockByProduct(productId);
            if (!result) {
                setError('Product not found');
                return;
            }
            setDetail(result);
            // Expand all colors by default
            setExpandedColors(new Set(result.colorGroups.map(g => g.colorId)));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load stock detail');
        }
        finally {
            setLoading(false);
        }
    }, [productId]);
    useEffect(() => {
        loadDetail();
    }, [loadDetail]);
    // Build flattened list of navigable items for cursor
    const flatItems = [];
    if (detail) {
        for (const group of detail.colorGroups) {
            flatItems.push({ type: 'color', colorId: group.colorId });
            if (expandedColors.has(group.colorId)) {
                for (let i = 0; i < group.sizes.length; i++) {
                    flatItems.push({ type: 'size', colorId: group.colorId, sizeIdx: i });
                }
            }
        }
    }
    useInput((input, key) => {
        if (loading)
            return;
        if (key.upArrow) {
            setCursorPos((p) => Math.max(0, p - 1));
        }
        else if (key.downArrow) {
            setCursorPos((p) => Math.min(flatItems.length - 1, p + 1));
        }
        else if (key.return) {
            const item = flatItems[cursorPos];
            if (item && item.type === 'color') {
                setExpandedColors((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.colorId))
                        next.delete(item.colorId);
                    else
                        next.add(item.colorId);
                    return next;
                });
            }
        }
        else if (input === 'e') {
            // Expand/collapse all
            if (expandedColors.size === detail?.colorGroups.length) {
                setExpandedColors(new Set());
            }
            else {
                setExpandedColors(new Set(detail?.colorGroups.map(g => g.colorId) ?? []));
            }
        }
        else if (key.escape) {
            setScreen('stock');
        }
        else if (input === 'r') {
            loadDetail();
        }
    });
    if (loading) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading stock detail...'] }) }));
    }
    if (error || !detail) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error || 'Not found'] }), _jsx(Text, { dimColor: true, children: "Press Esc to go back" })] }));
    }
    const statusIcon = (avail, onOrder) => {
        if (avail === 0 && onOrder === 0)
            return '🔴';
        if (avail === 0 && onOrder > 0)
            return '🟡';
        if (avail <= 5)
            return '🟡';
        return '🟢';
    };
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCE6 Stock Detail" }), _jsx(Text, { dimColor: true, children: detail.product.sku })] }), _jsx(Box, { marginBottom: 1, paddingX: 1, borderStyle: "single", borderColor: "gray", children: _jsxs(Text, { children: [_jsx(Text, { bold: true, children: detail.product.name }), ' · ', _jsxs(Text, { color: "green", children: ["Avail: ", detail.summary.totalAvailable] }), ' · ', _jsxs(Text, { color: "yellow", children: ["Reserved: ", detail.summary.totalReserved] }), ' · ', _jsxs(Text, { color: "cyan", children: ["On Order: ", detail.summary.totalOnOrder] }), ' · ', _jsxs(Text, { dimColor: true, children: [detail.summary.variantCount, " variants"] })] }) }), _jsx(Box, { flexDirection: "column", paddingLeft: 1, children: detail.colorGroups.map((group) => {
                    const isExpanded = expandedColors.has(group.colorId);
                    const cursorOnColor = flatItems[cursorPos]?.type === 'color' && flatItems[cursorPos]?.colorId === group.colorId;
                    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { children: [_jsxs(Text, { bold: cursorOnColor, color: cursorOnColor ? 'green' : 'white', children: [cursorOnColor ? '▸ ' : '  ', isExpanded ? '▼' : '▶', " ", group.colorName] }), group.colorHex && _jsxs(Text, { dimColor: true, children: [" ", group.colorHex] }), _jsxs(Text, { dimColor: true, children: [" (", group.totalAvailable, " avail"] }), group.totalOnOrder > 0 && _jsxs(Text, { color: "cyan", children: [", ", group.totalOnOrder, " on order"] }), _jsx(Text, { dimColor: true, children: ")" })] }), isExpanded && group.sizes.map((size, idx) => {
                                const sizeFlatIdx = flatItems.findIndex((item) => item.type === 'size' && item.colorId === group.colorId && item.sizeIdx === idx);
                                const cursorOnSize = sizeFlatIdx === cursorPos;
                                return (_jsxs(Box, { paddingLeft: 4, children: [_jsxs(Text, { bold: cursorOnSize, color: cursorOnSize ? 'green' : 'white', children: [cursorOnSize ? '▸ ' : '  ', size.sizeName.padEnd(5)] }), _jsxs(Text, { children: [' ', statusIcon(size.quantityAvailable, size.quantityOnOrder), ' ', _jsx(Text, { dimColor: true, children: "Avail:" }), _jsxs(Text, { color: size.quantityAvailable === 0 ? 'red' : size.quantityAvailable <= 5 ? 'yellow' : 'green', children: [' ', size.quantityAvailable] }), ' ', _jsx(Text, { dimColor: true, children: "Resvd:" }), _jsxs(Text, { children: [" ", size.quantityReserved] }), ' ', _jsx(Text, { dimColor: true, children: "OnOrd:" }), _jsxs(Text, { color: "cyan", children: [" ", size.quantityOnOrder > 0 ? size.quantityOnOrder : '—'] }), size.eta && (_jsxs(Text, { dimColor: true, children: [" \u00B7 ETA: ", size.eta] })), ' ', _jsxs(Text, { dimColor: true, children: ["(", size.variantSku, ")"] })] })] }, size.variantId));
                            })] }, group.colorId));
                }) }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u00B7 Enter: Expand/Collapse \u00B7 E: Toggle All \u00B7 R: Refresh \u00B7 Esc: Back" }) })] }));
}
