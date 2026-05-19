import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { hasPassphrase, verifyPassphrase, setPassphrase } from '../lib/auth';
import { configExists, loadConfig, saveConfig, type MerchStationConfig } from '../lib/config';
import { initDatabase, testConnection } from '../lib/db';
import { useAppStore } from '../lib/store';

type LoginPhase = 'passphrase' | 'setup-welcome' | 'setup-fields' | 'connecting' | 'error';

const SETUP_FIELDS: { key: keyof MerchStationConfig; label: string; secret?: boolean }[] = [
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
  const [phase, setPhase] = useState<LoginPhase>(isFirstRun ? 'setup-welcome' : 'passphrase');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [setupStep, setSetupStep] = useState(0);
  const [setupValues, setSetupValues] = useState<Partial<MerchStationConfig>>({});

  const handlePassphrase = useCallback(async () => {
    if (!input.trim()) return;
    setPhase('connecting');

    try {
      const valid = await verifyPassphrase(input);
      if (!valid) {
        setError('Invalid passphrase');
        setPhase('error');
        setInput('');
        return;
      }

      const config = await loadConfig(input);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, [input, setAuthenticated, setDbConnected, setStatus]);

  const handleSetupField = useCallback((value: string) => {
    const field = SETUP_FIELDS[setupStep];
    setSetupValues((prev) => ({ ...prev, [field.key]: value }));
    setInput('');

    if (setupStep < SETUP_FIELDS.length - 1) {
      setSetupStep((s) => s + 1);
    } else {
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
      const config = setupValues as MerchStationConfig;
      await setPassphrase(input);
      await saveConfig(config, input);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, [input, setupValues, setAuthenticated, setDbConnected, setStatus]);

  // ──── Setup Welcome ────
  if (phase === 'setup-welcome') {
    return (
      <Box flexDirection="column" padding={2}>
        <Text bold color="cyan">Welcome to MerchStation!</Text>
        <Text dimColor>First-run setup: enter your credentials.</Text>
        <Text></Text>
        <Text>Press Enter to begin...</Text>
        <Text dimColor>(This will configure your database, Cloudinary, and search connections)</Text>
        {/* Use invisible TextInput just to capture Enter */}
        <TextInput value="" onChange={() => {}} onSubmit={() => { setPhase('setup-fields'); setInput(''); }} placeholder="Press Enter" />
      </Box>
    );
  }

  // ──── Setup Fields ────
  if (phase === 'setup-fields') {
    const field = SETUP_FIELDS[setupStep];
    return (
      <Box flexDirection="column" padding={2}>
        <Text bold color="cyan">MerchStation Setup ({setupStep + 1}/{SETUP_FIELDS.length})</Text>
        <Text></Text>
        <Text>{field.label}:</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSetupField}
          placeholder={field.secret ? '••••••••' : `Enter ${field.label}`}
          showCursor={true}
        />
        {setupValues.databaseUrl && setupStep > 0 && (
          <Text dimColor>✓ Database URL set</Text>
        )}
      </Box>
    );
  }

  // ──── Passphrase Input ────
  if (phase === 'passphrase') {
    const isNew = isFirstRun || !configExists();
    return (
      <Box flexDirection="column" padding={2}>
        <Text bold color="cyan">MerchStation</Text>
        <Text dimColor>Terminal Product Management</Text>
        <Text></Text>
        <Text>{isNew ? 'Create a passphrase (min 8 chars):' : 'Enter passphrase:'}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={isNew ? handleNewPassphrase : handlePassphrase}
          placeholder="••••••••"
          showCursor={true}
        />
      </Box>
    );
  }

  // ──── Connecting ────
  if (phase === 'connecting') {
    return (
      <Box flexDirection="column" padding={2}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Connecting to database...'}
        </Text>
      </Box>
    );
  }

  // ──── Error ────
  if (phase === 'error') {
    return (
      <Box flexDirection="column" padding={2}>
        <Text color="red">✗ {error}</Text>
        <Text></Text>
        <Text>Press Enter to retry</Text>
        <TextInput value="" onChange={() => {}} onSubmit={() => { setError(''); setPhase(isFirstRun ? 'setup-welcome' : 'passphrase'); setInput(''); }} placeholder="Press Enter" />
      </Box>
    );
  }

  return null;
}
