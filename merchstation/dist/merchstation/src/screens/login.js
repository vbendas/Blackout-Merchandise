import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { hasPassphrase, verifyPassphrase, setPassphrase } from '../lib/auth';
import { configExists, loadConfig, saveConfig } from '../lib/config';
import { initDatabase, testConnection } from '../lib/db';
import { useAppStore } from '../lib/store';
const SETUP_FIELDS = [
    { key: 'databaseUrl', label: 'Neon PostgreSQL URL' },
    { key: 'cloudinaryCloudName', label: 'Cloudinary Cloud Name' },
    { key: 'cloudinaryApiKey', label: 'Cloudinary API Key' },
    { key: 'cloudinaryApiSecret', label: 'Cloudinary API Secret', secret: true },
    { key: 'typesenseApiKey', label: 'Typesense API Key', secret: true },
    { key: 'appServerUrl', label: 'App Server URL (for reindex)', secret: false },
];
export function LoginScreen() {
    const setAuthenticated = useAppStore((s) => s.setAuthenticated);
    const setDbConnected = useAppStore((s) => s.setDbConnected);
    const setStatus = useAppStore((s) => s.setStatus);
    const isFirstRun = !hasPassphrase();
    const [phase, setPhase] = useState(isFirstRun ? 'setup-welcome' : 'passphrase');
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [setupStep, setSetupStep] = useState(0);
    const [setupValues, setSetupValues] = useState({});
    const handlePassphrase = useCallback(async () => {
        if (!input.trim())
            return;
        setPhase('connecting');
        try {
            const valid = await verifyPassphrase(input);
            if (!valid) {
                setError('Invalid passphrase');
                setPhase('error');
                setInput('');
                return;
            }
            const config = loadConfig(input);
            await initDatabase(config.databaseUrl);
            const connected = await testConnection();
            if (!connected) {
                setError('Could not connect to database');
                setPhase('error');
                return;
            }
            setDbConnected(true);
            setStatus('Connected to Neon');
            setAuthenticated(config);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setPhase('error');
        }
    }, [input, setAuthenticated, setDbConnected, setStatus]);
    const handleSetupField = useCallback((value) => {
        const field = SETUP_FIELDS[setupStep];
        setSetupValues((prev) => ({ ...prev, [field.key]: value }));
        setInput('');
        if (setupStep < SETUP_FIELDS.length - 1) {
            setSetupStep((s) => s + 1);
        }
        else {
            // All fields filled — now set passphrase
            setPhase('passphrase');
        }
    }, [setupStep]);
    const handleNewPassphrase = useCallback(async () => {
        if (!input.trim() || input.length < 8) {
            setError('Passphrase must be at least 8 characters');
            return;
        }
        setPhase('connecting');
        try {
            const config = setupValues;
            await setPassphrase(input);
            saveConfig(config, input);
            await initDatabase(config.databaseUrl);
            const connected = await testConnection();
            if (!connected) {
                setError('Config saved but could not connect to database');
                setPhase('error');
                return;
            }
            setDbConnected(true);
            setStatus('Connected to Neon');
            setAuthenticated(config);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setPhase('error');
        }
    }, [input, setupValues, setAuthenticated, setDbConnected, setStatus]);
    // ──── Setup Welcome ────
    if (phase === 'setup-welcome') {
        return (_jsxs(Box, { flexDirection: "column", padding: 2, children: [_jsx(Text, { bold: true, color: "cyan", children: "Welcome to MerchStation!" }), _jsx(Text, { dimColor: true, children: "First-run setup: enter your credentials." }), _jsx(Text, {}), _jsx(Text, { children: "Press Enter to begin..." }), _jsx(Text, { dimColor: true, children: "(This will configure your database, Cloudinary, and search connections)" }), _jsx(TextInput, { value: "", onChange: () => { }, onSubmit: () => { setPhase('setup-fields'); setInput(''); }, placeholder: "Press Enter" })] }));
    }
    // ──── Setup Fields ────
    if (phase === 'setup-fields') {
        const field = SETUP_FIELDS[setupStep];
        return (_jsxs(Box, { flexDirection: "column", padding: 2, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["MerchStation Setup (", setupStep + 1, "/", SETUP_FIELDS.length, ")"] }), _jsx(Text, {}), _jsxs(Text, { children: [field.label, ":"] }), _jsx(TextInput, { value: input, onChange: setInput, onSubmit: handleSetupField, placeholder: field.secret ? '••••••••' : `Enter ${field.label}`, showCursor: true }), setupValues.databaseUrl && setupStep > 0 && (_jsx(Text, { dimColor: true, children: "\u2713 Database URL set" }))] }));
    }
    // ──── Passphrase Input ────
    if (phase === 'passphrase') {
        const isNew = isFirstRun || !configExists();
        return (_jsxs(Box, { flexDirection: "column", padding: 2, children: [_jsx(Text, { bold: true, color: "cyan", children: "MerchStation" }), _jsx(Text, { dimColor: true, children: "Terminal Product Management" }), _jsx(Text, {}), _jsx(Text, { children: isNew ? 'Create a passphrase (min 8 chars):' : 'Enter passphrase:' }), _jsx(TextInput, { value: input, onChange: setInput, onSubmit: isNew ? handleNewPassphrase : handlePassphrase, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", showCursor: true })] }));
    }
    // ──── Connecting ────
    if (phase === 'connecting') {
        return (_jsx(Box, { flexDirection: "column", padding: 2, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Connecting to database...'] }) }));
    }
    // ──── Error ────
    if (phase === 'error') {
        return (_jsxs(Box, { flexDirection: "column", padding: 2, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, {}), _jsx(Text, { children: "Press Enter to retry" }), _jsx(TextInput, { value: "", onChange: () => { }, onSubmit: () => { setError(''); setPhase(isFirstRun ? 'setup-welcome' : 'passphrase'); setInput(''); }, placeholder: "Press Enter" })] }));
    }
    return null;
}
