import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface SettingRow {
  id: string;
  key: string;
  value: string;
  valueJson: unknown;
  description: string | null;
  updatedAt: Date | null;
}

type Mode = 'list' | 'edit-value' | 'edit-json-prompt' | 'edit-json' | 'seed-msg';

function pad(str: string, len: number): string {
  const s = String(str);
  if (s.length >= len) return s.slice(0, len - 1) + '…';
  return s + ' '.repeat(len - s.length);
}

function relativeTime(date: Date | null): string {
  if (!date) return '—';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(date).toISOString().slice(0, 10);
}

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return str.slice(0, half) + '...' + str.slice(str.length - half);
}

const PAGE_SIZE = 20;

export function SettingsPlaceholder({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
  const setStatus = useAppStore((s) => s.setStatus);

  const [items, setItems] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [inputValue, setInputValue] = useState('');
  const [editItem, setEditItem] = useState<SettingRow | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { getAllSettings } = await import('@db-root/knowledge');
      const result = await getAllSettings();
      setItems(result as SettingRow[]);
    } catch (err) {
      setError(formatDbError(err, 'load settings'));
    } finally {
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

  const handleSave = useCallback(async (key: string, newValue: string, newJsonValue?: unknown) => {
    setSaving(true);
    setError('');
    try {
      const { updateSetting, clearKnowledgeCache } = await import('@db-root/knowledge');
      if (newJsonValue !== undefined) {
        await updateSetting(key, 'json', newJsonValue);
      } else {
        await updateSetting(key, newValue);
      }
      clearKnowledgeCache();
      setStatus(`Updated: ${key}`);
      setMode('list');
      setInputValue('');
      setEditItem(null);
      await loadSettings();
    } catch (err) {
      setError(formatDbError(err, 'save setting'));
    } finally {
      setSaving(false);
    }
  }, [loadSettings, setStatus]);

  const handleDelete = useCallback(async (item: SettingRow) => {
    setSaving(true);
    setError('');
    try {
      const { updateSetting, clearKnowledgeCache } = await import('@db-root/knowledge');
      await updateSetting(item.key, '');
      clearKnowledgeCache();
      setStatus(`Cleared: ${item.key}`);
      await loadSettings();
    } catch (err) {
      setError(formatDbError(err, 'delete setting'));
    } finally {
      setSaving(false);
    }
  }, [loadSettings, setStatus]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (mode === 'edit-json-prompt') {
      if (key.escape) {
        cancelForm();
      } else if (input === 'y' || input === 'Y') {
        handleJsonPromptYes();
      } else if (input === 'n' || input === 'N') {
        handleJsonPromptNo();
      }
      return;
    }

    if (mode === 'seed-msg') {
      setMode('list');
      return;
    }

    if (mode !== 'list') return;

    if (key.escape) {
      return;
    }

    if (key.upArrow) {
      setSelectedRow((r) => Math.max(0, r - 1));
    } else if (key.downArrow) {
      setSelectedRow((r) => Math.min(pageItems.length - 1, r + 1));
    } else if (key.leftArrow && page > 0) {
      setPage((p) => p - 1);
    } else if (key.rightArrow && page < totalPages - 1) {
      setPage((p) => p + 1);
    } else if (input === 'e' && pageItems[selectedRow]) {
      const item = pageItems[selectedRow];
      setEditItem(item);
      if (item.valueJson != null) {
        setMode('edit-json-prompt');
        setInputValue('');
      } else {
        setInputValue(item.value);
        setMode('edit-value');
      }
    } else if (input === 'd' && pageItems[selectedRow]) {
      handleDelete(pageItems[selectedRow]);
    } else if (input === 'r') {
      reload();
    } else if (input === 's') {
      setMode('seed-msg');
    }
  });

  const handleEditValueSubmit = () => {
    if (!editItem) return;
    handleSave(editItem.key, inputValue.trim());
  };

  const handleJsonPromptYes = () => {
    if (!editItem) return;
    setInputValue(JSON.stringify(editItem.valueJson, null, 2));
    setMode('edit-json');
  };

  const handleJsonPromptNo = () => {
    if (!editItem) return;
    setInputValue(editItem.value);
    setMode('edit-value');
  };

  const handleEditJsonSubmit = () => {
    if (!editItem) return;
    try {
      const parsed = JSON.parse(inputValue);
      handleSave(editItem.key, 'json', parsed);
    } catch {
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
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Loading settings...'}
        </Text>
      </Box>
    );
  }

  if (error && items.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="red">✗ {error}</Text>
        <Text dimColor>Press R to retry</Text>
      </Box>
    );
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
    return (
      <Text key={item.id} color={isSel ? 'green' : 'white'} bold={isSel}>
        {isSel ? '▸ ' : '  '}{row}
      </Text>
    );
  });

  const pageInfo = totalPages > 1
    ? ` · Page ${page + 1}/${totalPages} (←/→)`
    : '';

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box marginBottom={1}>
        <Text bold color="cyan">⚙️  Settings / Knowledge Base</Text>
        <Text dimColor>{` · ${items.length} total${pageInfo}`}</Text>
      </Box>

      {mode === 'list' && (
        <>
          <Text bold color="cyan">{header}</Text>
          <Text dimColor>{separator}</Text>
          {rows.length > 0 ? rows : <Text dimColor>  No settings found</Text>}
          <Text dimColor></Text>
          <Text dimColor>E: Edit · D: Delete · R: Refresh · S: Run Seed · Esc: Back</Text>
          {saving && (
            <Text>
              <Text color="yellow"><Spinner type="dots" /></Text>
              {' Saving...'}
            </Text>
          )}
        </>
      )}

      {mode === 'edit-value' && editItem && (
        <Box flexDirection="column">
          <Text bold color="cyan">Edit Setting</Text>
          <Text dimColor>{`Key: ${editItem.key}`}</Text>
          <Text dimColor>{`Current: ${editItem.valueJson != null ? JSON.stringify(editItem.valueJson) : editItem.value}`}</Text>
          <Text dimColor></Text>
          <Box>
            <Text>New value: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleEditValueSubmit} placeholder="Enter new value..." showCursor />
          </Box>
          <Text dimColor>Enter to save · Esc to cancel</Text>
          {saving && (
            <Text>
              <Text color="yellow"><Spinner type="dots" /></Text>
              {' Saving...'}
            </Text>
          )}
        </Box>
      )}

      {mode === 'edit-json-prompt' && editItem && (
        <Box flexDirection="column">
          <Text bold color="cyan">Edit Setting — {editItem.key}</Text>
          <Text dimColor>{`This setting has JSON data (valueJson).`}</Text>
          <Text dimColor>{`Current text value: ${editItem.value}`}</Text>
          <Text dimColor>{`Current JSON: ${JSON.stringify(editItem.valueJson)}`}</Text>
          <Text dimColor></Text>
          <Text>Edit JSON? (Y/n)</Text>
          <Text dimColor>Y: Edit JSON · N: Edit text value · Esc: Cancel</Text>
        </Box>
      )}

      {mode === 'edit-json' && editItem && (
        <Box flexDirection="column">
          <Text bold color="cyan">Edit JSON — {editItem.key}</Text>
          <Text dimColor>Current JSON:</Text>
          <Box flexDirection="column" marginLeft={2}>
            {JSON.stringify(editItem.valueJson, null, 2).split('\n').map((line, i) => (
              <Text key={i} dimColor>{line}</Text>
            ))}
          </Box>
          <Text dimColor></Text>
          <Box>
            <Text>New JSON: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleEditJsonSubmit} placeholder="{}" showCursor />
          </Box>
          <Text dimColor>Enter to save · Esc to cancel</Text>
          {saving && (
            <Text>
              <Text color="yellow"><Spinner type="dots" /></Text>
              {' Saving...'}
            </Text>
          )}
        </Box>
      )}

      {mode === 'seed-msg' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Seed Knowledge Base</Text>
          <Text dimColor></Text>
          <Text>To reset settings to defaults, run from the repo root:</Text>
          <Text bold color="green">  bun run src/db/seed-knowledge.ts</Text>
          <Text dimColor></Text>
          <Text dimColor>Press any key to go back</Text>
        </Box>
      )}

      {error && <Text color="red">✗ {error}</Text>}
    </Box>
  );
}
