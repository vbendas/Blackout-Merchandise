import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { sanitizeText } from '../lib/sanitize';
import { formatDbError } from '../lib/format-error';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
}

type Mode = 'list' | 'add-name' | 'add-desc' | 'edit-name' | 'edit-desc';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pad(str: string, len: number): string {
  const s = String(str);
  if (s.length >= len) return s.slice(0, len - 1) + '…';
  return s + ' '.repeat(len - s.length);
}

export function CategoriesScreen({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
  const setStatus = useAppStore((s) => s.setStatus);

  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [inputValue, setInputValue] = useState('');
  const [editItem, setEditItem] = useState<CategoryRow | null>(null);
  const [pendingName, setPendingName] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { getAllCategories } = await import('@db-root/catalog');
      const result = await getAllCategories();
      setItems(result as CategoryRow[]);
    } catch (err) {
      setError(formatDbError(err, 'load categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setSelectedRow(0);
  }, [items]);

  const reload = useCallback(async () => {
    await loadCategories();
  }, [loadCategories]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (mode !== 'list') return;

    if (key.upArrow) {
      setSelectedRow((r) => Math.max(0, r - 1));
    } else if (key.downArrow) {
      setSelectedRow((r) => Math.min(items.length - 1, r + 1));
    } else if (input === 'a') {
      setMode('add-name');
      setInputValue('');
    } else if (input === 'e' && items[selectedRow]) {
      setEditItem(items[selectedRow]);
      setInputValue(items[selectedRow].name);
      setMode('edit-name');
    } else if (input === 'd' && items[selectedRow]) {
      toggleActive(items[selectedRow]);
    } else if (input === 'r') {
      reload();
    }
  });

  const toggleActive = async (item: CategoryRow) => {
    try {
      const { updateCategory } = await import('@db-root/catalog');
      await updateCategory(item.id, { isActive: !item.isActive } as any);
      setStatus(`${item.isActive ? 'Deactivated' : 'Activated'}: ${item.name}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleAddName = () => {
    if (!inputValue.trim()) return;
    setPendingName(inputValue.trim());
    setInputValue('');
    setMode('add-desc');
  };

  const handleAddDesc = async () => {
    try {
      const { createCategory } = await import('@db-root/catalog');
      const slug = slugify(pendingName);
      await createCategory({
        name: sanitizeText(pendingName),
        slug,
        description: sanitizeText(inputValue.trim()) || null,
      } as any);
      setStatus(`Created category: ${pendingName}`);
      setMode('list');
      setInputValue('');
      setPendingName('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
      setMode('list');
    }
  };

  const handleEditName = () => {
    if (!inputValue.trim() || !editItem) return;
    setPendingName(inputValue.trim());
    setInputValue(editItem.description || '');
    setMode('edit-desc');
  };

  const handleEditDesc = async () => {
    if (!editItem) return;
    try {
      const { updateCategory } = await import('@db-root/catalog');
      await updateCategory(editItem.id, {
        name: sanitizeText(pendingName),
        description: sanitizeText(inputValue.trim()) || null,
      } as any);
      setStatus(`Updated: ${pendingName}`);
      setMode('list');
      setInputValue('');
      setEditItem(null);
      setPendingName('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      setMode('list');
    }
  };

  const cancelForm = () => {
    setMode('list');
    setInputValue('');
    setEditItem(null);
    setPendingName('');
  };

  if (loading && items.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Loading categories...'}
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

  // Dynamic column widths: Name gets all remaining space
  const SLUG_W = 16;
  const DESC_W = 30;
  const ORDER_W = 6;
  const STATUS_W = 8;
  const fixedTotal = SLUG_W + DESC_W + ORDER_W + STATUS_W;
  const separatorChars = 4 * 3; // 4 separators " │ "
  const prefixChars = 2;
  const indicatorChars = 2;
  const NAME_W = Math.max(20, contentWidth - fixedTotal - separatorChars - prefixChars - indicatorChars);

  const header = `  ${pad('Name', NAME_W)} │ ${pad('Slug', SLUG_W)} │ ${pad('Description', DESC_W)} │ ${pad('Order', ORDER_W)} │ ${pad('Status', STATUS_W)}`;
  const separator = `  ${'─'.repeat(NAME_W)}─┼─${'─'.repeat(SLUG_W)}─┼─${'─'.repeat(DESC_W)}─┼─${'─'.repeat(ORDER_W)}─┼─${'─'.repeat(STATUS_W)}`;

  const rows = items.map((item, idx) => {
    const isSel = idx === selectedRow;
    const row = `${pad(item.name, NAME_W)} │ ${pad(item.slug, SLUG_W)} │ ${pad(item.description || '—', DESC_W)} │ ${pad(String(item.displayOrder ?? 0), ORDER_W)} │ ${pad(item.isActive ? 'Active' : 'Inactive', STATUS_W)}`;
    return (
      <Text key={item.id} color={isSel ? 'green' : 'white'} bold={isSel}>
        {isSel ? '▸ ' : '  '}{row}
      </Text>
    );
  });

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box marginBottom={1}>
        <Text bold color="cyan">🏷️  Categories</Text>
        <Text dimColor>{` · ${items.length} total`}</Text>
      </Box>

      {mode === 'list' && (
        <>
          <Text bold color="cyan">{header}</Text>
          <Text dimColor>{separator}</Text>
          {rows.length > 0 ? rows : <Text dimColor>  No categories found</Text>}
          <Text dimColor></Text>
          <Text dimColor>A: Add · E: Edit · D: Toggle active · R: Refresh · Esc: Back</Text>
        </>
      )}

      {mode === 'add-name' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Add Category — Name</Text>
          <Box>
            <Text>Name: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleAddName} placeholder="e.g. T-Shirts" showCursor />
          </Box>
          <Text dimColor>Enter to continue · Esc to cancel</Text>
          <Text dimColor>Slug will be auto-generated</Text>
        </Box>
      )}

      {mode === 'add-desc' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Add Category — Description</Text>
          <Text dimColor>{`For: ${pendingName} (${slugify(pendingName)})`}</Text>
          <Box>
            <Text>Description: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleAddDesc} placeholder="Optional description..." showCursor />
          </Box>
          <Text dimColor>Enter to create · Esc to cancel</Text>
        </Box>
      )}

      {mode === 'edit-name' && editItem && (
        <Box flexDirection="column">
          <Text bold color="cyan">Edit Category — Name</Text>
          <Text dimColor>{`Editing: ${editItem.slug}`}</Text>
          <Box>
            <Text>Name: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleEditName} showCursor />
          </Box>
          <Text dimColor>Enter to continue · Esc to cancel</Text>
        </Box>
      )}

      {mode === 'edit-desc' && editItem && (
        <Box flexDirection="column">
          <Text bold color="cyan">Edit Category — Description</Text>
          <Text dimColor>{`Name: ${pendingName}`}</Text>
          <Box>
            <Text>Description: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleEditDesc} showCursor />
          </Box>
          <Text dimColor>Enter to save · Esc to cancel</Text>
        </Box>
      )}

      {error && <Text color="red">✗ {error}</Text>}
    </Box>
  );
}
