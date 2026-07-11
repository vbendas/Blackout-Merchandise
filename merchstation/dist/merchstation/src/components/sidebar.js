import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { useAppStore } from '../lib/store';
const NAV_ITEMS = [
    { key: 'catalog', label: 'Catalog', shortcut: '1' },
    { key: 'stock', label: 'Stock', shortcut: 'S' },
    { key: 'supplier-orders', label: 'Supplier', shortcut: 'U' },
    { key: 'orders', label: 'Orders', shortcut: 'O' },
    { key: 'categories', label: 'Categories', shortcut: '2' },
    { key: 'colors', label: 'Colors', shortcut: '3' },
    { key: 'sizes', label: 'Sizes', shortcut: '4' },
    { key: 'settings', label: 'Settings', shortcut: '5' },
];
export function Sidebar({ height }) {
    const currentScreen = useAppStore((s) => s.currentScreen);
    const sidebarFocusIndex = useAppStore((s) => s.sidebarFocusIndex);
    // Determine which nav item is active
    const activeNav = NAV_ITEMS.find((item) => {
        if (item.key === 'catalog') {
            return currentScreen === 'catalog' || currentScreen === 'catalog-detail'
                || currentScreen === 'catalog-add' || currentScreen === 'catalog-images';
        }
        if (item.key === 'stock') {
            return currentScreen === 'stock' || currentScreen === 'stock-detail';
        }
        if (item.key === 'supplier-orders') {
            return currentScreen === 'supplier-orders' || currentScreen === 'supplier-order-detail'
                || currentScreen === 'supplier-order-create';
        }
        if (item.key === 'orders') {
            return currentScreen === 'orders' || currentScreen === 'order-detail';
        }
        return item.key === currentScreen;
    })?.key ?? 'catalog';
    return (_jsxs(Box, { flexDirection: "column", width: 22, height: height, borderStyle: "single", borderColor: "gray", children: [_jsx(Box, { paddingX: 1, children: _jsx(Text, { bold: true, color: "cyan", children: "NAVIGATION" }) }), _jsx(Box, { paddingX: 1, children: _jsx(Text, { dimColor: true, children: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" }) }), _jsx(Box, { flexDirection: "column", flexGrow: 1, children: NAV_ITEMS.map((item, idx) => {
                    const isActive = activeNav === item.key;
                    const isFocused = idx === sidebarFocusIndex;
                    const prefix = isActive ? '▸ ' : isFocused ? '  ' : '  ';
                    const color = isActive ? 'green' : isFocused ? 'yellow' : 'white';
                    const bold = isActive || isFocused;
                    return (_jsxs(Box, { paddingX: 1, children: [_jsxs(Text, { color: color, bold: bold, children: [prefix, item.label] }), _jsxs(Text, { dimColor: true, children: [" ", item.shortcut] })] }, item.key));
                }) }), _jsx(Box, { paddingX: 1, children: _jsx(Text, { dimColor: true, children: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" }) }), _jsx(Box, { paddingX: 1, children: _jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate" }) }), _jsx(Box, { paddingX: 1, children: _jsx(Text, { dimColor: true, children: "Enter Open" }) }), _jsx(Box, { paddingX: 1, children: _jsx(Text, { dimColor: true, children: "Esc Back" }) }), _jsx(Box, { paddingX: 1, children: _jsx(Text, { dimColor: true, children: "Ctrl+Q Quit" }) })] }));
}
