import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { useAppStore } from '../lib/store';
export function StatusBar() {
    const dbConnected = useAppStore((s) => s.dbConnected);
    const statusMessage = useAppStore((s) => s.statusMessage);
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return (_jsxs(Box, { justifyContent: "space-between", paddingX: 1, children: [_jsxs(Text, { children: [_jsx(Text, { color: dbConnected ? 'green' : 'red', children: dbConnected ? '●' : '○' }), _jsxs(Text, { children: [" DB ", dbConnected ? 'Connected' : 'Disconnected'] })] }), _jsx(Text, { dimColor: true, children: statusMessage }), _jsx(Text, { dimColor: true, children: time })] }));
}
