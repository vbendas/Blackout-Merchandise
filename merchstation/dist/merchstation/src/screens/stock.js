import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Table } from '../../components/table';
import { useAppStore } from '../../lib/store';
const FILTER_OPTIONS = ['all', 'low', 'out'];
export function StockScreen({ maxHeight }) {
    const { stdout } = useStdout();
    const contentWidth = (stdout?.columns ?? 100) - 26;
    const setScreen = useAppStore((s) => s.setScreen);
    const setStatus = useAppStore((s) => s.setStatus);
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedRow, setSelectedRow] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filter, setFilter] = useState('all');
    const [summary, setSummary] = useState({ totalOnOrder: 0, openOrders: 0 });
    const PAGE_SIZE = 20;
    const loadStock = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { getStockOverview, getOnOrderSummary } = await import('@db-root/inventory-ops');
            const filters = {};
            if (filter === 'low')
                filters.lowStockOnly = true;
            if (filter === 'out')
                filters.outOfStockOnly = true;
            if (searchQuery)
                filters.search = searchQuery;
            const result = await getStockOverview(page, PAGE_SIZE, filters);
            setStock(result.data);
            setTotalItems(result.total);
            setTotalPages(result.totalPages);
            const summaryData = await getOnOrderSummary();
            setSummary(summaryData);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load stock');
        }
        finally {
            setLoading(false);
        }
    }, [page, filter, searchQuery]);
    useEffect(() => {
        loadStock();
    }, [loadStock]);
    useEffect(() => {
        setSelectedRow(0);
    }, [stock]);
    useInput((input, key) => {
        if (isSearching) {
            if (key.escape)
                setIsSearching(false);
            else if (key.return) {
                setIsSearching(false);
                setPage(1);
            }
            return;
        }
        if (key.upArrow)
            setSelectedRow((r) => Math.max(0, r - 1));
        else if (key.downArrow)
            setSelectedRow((r) => Math.min(stock.length - 1, r + 1));
        else if (key.leftArrow || input === 'p')
            setPage((p) => Math.max(1, p - 1));
        else if (key.rightArrow || input === 'n')
            setPage((p) => Math.min(totalPages, p + 1));
        else if (key.return && stock[selectedRow]) {
            setScreen('stock-detail', { productId: stock[selectedRow].productId });
        }
        else if (input === '/') {
            setIsSearching(true);
        }
        else if (input === 'f') {
            const idx = FILTER_OPTIONS.indexOf(filter);
            setFilter(FILTER_OPTIONS[(idx + 1) % FILTER_OPTIONS.length]);
            setPage(1);
        }
        else if (input === 'r') {
            loadStock();
        }
    });
    const columns = [
        { key: 'sku', label: 'SKU', width: 12, render: (r) => r.productSku },
        { key: 'name', label: 'Product', width: 28, render: (r) => r.productName },
        { key: 'category', label: 'Category', width: 12, render: (r) => r.categoryName },
        { key: 'variants', label: 'Vars', width: 6, render: (r) => String(r.variantCount) },
        { key: 'available', label: 'Avail', width: 7, render: (r) => {
                if (r.isOutOfStock)
                    return `0 🔴`;
                if (r.isLowStock)
                    return `${r.totalAvailable} 🟡`;
                return String(r.totalAvailable);
            } },
        { key: 'reserved', label: 'Resvd', width: 7, render: (r) => r.totalReserved > 0 ? String(r.totalReserved) : '—' },
        { key: 'onOrder', label: 'On Ord', width: 7, render: (r) => r.totalOnOrder > 0 ? `📦${r.totalOnOrder}` : '—' },
    ];
    const filterLabel = filter === 'all' ? 'All' : filter === 'low' ? 'Low Stock' : 'Out of Stock';
    if (loading && stock.length === 0) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading stock...'] }) }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, { dimColor: true, children: "Press R to retry" })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCCA Stock Control" }), _jsxs(Text, { dimColor: true, children: ["Filter: ", _jsx(Text, { bold: true, children: filterLabel }), ' · ', "On Order: ", _jsx(Text, { bold: true, color: "yellow", children: summary.totalOnOrder }), ' · ', "Open POs: ", _jsx(Text, { bold: true, children: summary.openOrders })] })] }), isSearching && (_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { children: "Search: " }), _jsx(TextInput, { value: searchQuery, onChange: setSearchQuery, onSubmit: () => { setIsSearching(false); setPage(1); }, placeholder: "name or SKU...", showCursor: true })] })), _jsx(Table, { columns: columns, data: stock, selectedRow: selectedRow, page: page, totalPages: totalPages, totalItems: totalItems, availableWidth: contentWidth, footerRight: "/ : Search \u00B7 F: Filter \u00B7 R: Refresh \u00B7 Esc: Back", maxHeight: maxHeight - 4 })] }));
}
