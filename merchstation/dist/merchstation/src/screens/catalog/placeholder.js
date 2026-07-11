import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export function CatalogPlaceholder({ maxHeight }) {
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCE6 Product Catalog" }), _jsx(Text, { dimColor: true, children: "Loading..." })] }));
}
