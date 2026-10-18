import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
import { configureCloudinary, scanForImages, uploadImage, type UploadResult } from '../../lib/cloudinary';

const IMAGE_TYPES = ['front', 'back', 'detail', 'lifestyle', 'swatch'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

interface ScannedFile {
  path: string;
  name: string;
  selected: boolean;
  imageType: ImageType;
  isPrimary: boolean;
  displayOrder: number;
}

type Phase = 'input-path' | 'select-files' | 'configure' | 'uploading' | 'done';

interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
}

interface UploadSummary {
  uploaded: number;
  saved: number;
  errors: number;
}

export function CatalogImagesScreen({ maxHeight }: { maxHeight: number }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const screenParams = useAppStore((s) => s.screenParams);
  const config = useAppStore((s) => s.config);

  const productId = screenParams.productId ?? '';

  const [phase, setPhase] = useState<Phase>(productId ? 'input-path' : 'input-path');
  const [folderPath, setFolderPath] = useState('');
  const [manualProductId, setManualProductId] = useState(productId);
  const [needsProductId, setNeedsProductId] = useState(!productId);

  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [configIdx, setConfigIdx] = useState(0);

  const [progress, setProgress] = useState<UploadProgress>({ current: 0, total: 0, currentFile: '' });
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [error, setError] = useState('');

  const effectiveProductId = needsProductId ? manualProductId : productId;

  const doScan = useCallback((dir: string) => {
    setError('');
    const found = scanForImages(dir);
    if (found.length === 0) {
      setError('No images found in directory');
      return;
    }
    setFiles(found.map((p) => {
      const name = p.split('/').pop() ?? p;
      return {
        path: p,
        name,
        selected: false,
        imageType: 'front' as ImageType,
        isPrimary: false,
        displayOrder: 0,
      };
    }));
    setCursorIdx(0);
    setPhase('select-files');
  }, []);

  const handleUpload = useCallback(async () => {
    const selected = files.filter((f) => f.selected);
    if (selected.length === 0) {
      setError('No files selected');
      return;
    }

    if (!config) {
      setError('No configuration loaded');
      return;
    }

    if (!effectiveProductId) {
      setError('Product ID is required');
      return;
    }

    configureCloudinary(config.cloudinaryCloudName, config.cloudinaryApiKey, config.cloudinaryApiSecret);

    setPhase('uploading');
    setProgress({ current: 0, total: selected.length, currentFile: '' });
    setError('');

    let uploaded = 0;
    let saved = 0;
    let errors = 0;

    const { createProductImage } = await import('@db-root/catalog');

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      setProgress({ current: i + 1, total: selected.length, currentFile: file.name });

      try {
        const result: UploadResult = await uploadImage(file.path);

        await createProductImage({
          productId: effectiveProductId,
          variantId: null,
          cloudinaryPublicId: result.publicId,
          cloudinaryUrl: result.url,
          imageType: file.imageType,
          isPrimary: file.isPrimary,
          displayOrder: file.displayOrder,
          altText: file.name.replace(/\.[^.]+$/, ''),
        });

        uploaded++;
        saved++;
      } catch (err) {
        errors++;
      }
    }

    try {
      const { pingReindex } = await import('../../lib/sync');
      await pingReindex(config);
    } catch {
      // reindex failure is non-blocking
    }

    setSummary({ uploaded, saved, errors });
    setPhase('done');
  }, [files, config, effectiveProductId]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (phase === 'input-path') {
      if (key.return) {
        if (needsProductId && !manualProductId.trim()) {
          setError('Product ID is required');
          return;
        }
        if (!folderPath.trim()) {
          setError('Folder path is required');
          return;
        }
        doScan(folderPath.trim());
        return;
      }
      if (key.escape) {
        setScreen('catalog');
        return;
      }
      if (key.tab) {
        setNeedsProductId((prev) => !prev);
        return;
      }
      return;
    }

    if (phase === 'select-files') {
      if (key.escape) {
        setScreen('catalog-detail', { productId: effectiveProductId });
        return;
      }
      if (key.upArrow) {
        setCursorIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setCursorIdx((i) => Math.min(files.length - 1, i + 1));
        return;
      }
      if (input === ' ') {
        setFiles((prev) =>
          prev.map((f, i) => (i === cursorIdx ? { ...f, selected: !f.selected } : f))
        );
        return;
      }
      if (input === 'a') {
        const allSelected = files.every((f) => f.selected);
        setFiles((prev) => prev.map((f) => ({ ...f, selected: !allSelected })));
        return;
      }
      if (key.return) {
        const hasSelected = files.some((f) => f.selected);
        if (hasSelected) {
          setConfigIdx(files.findIndex((f) => f.selected));
          setPhase('configure');
        } else {
          setError('Select at least one file');
        }
        return;
      }
      if (input === 'b') {
        setPhase('input-path');
        return;
      }
      return;
    }

    if (phase === 'configure') {
      const selectedFiles = files.filter((f) => f.selected);
      if (selectedFiles.length === 0) {
        setPhase('select-files');
        return;
      }

      const fileIdx = files.indexOf(selectedFiles[Math.min(configIdx, selectedFiles.length - 1)]);
      const current = files[fileIdx];

      if (key.escape) {
        setPhase('select-files');
        return;
      }
      if (key.tab) {
        const selectedIndices = files.map((f, i) => (f.selected ? i : -1)).filter((i) => i >= 0);
        const currentPos = selectedIndices.indexOf(fileIdx);
        const nextPos = (currentPos + 1) % selectedIndices.length;
        setConfigIdx(selectedIndices[nextPos]);
        return;
      }
      if (input === 't') {
        const typeIdx = IMAGE_TYPES.indexOf(current.imageType);
        const nextType = IMAGE_TYPES[(typeIdx + 1) % IMAGE_TYPES.length];
        setFiles((prev) => prev.map((f, i) => (i === fileIdx ? { ...f, imageType: nextType } : f)));
        return;
      }
      if (input === 'p') {
        setFiles((prev) => prev.map((f, i) => (i === fileIdx ? { ...f, isPrimary: !f.isPrimary } : f)));
        return;
      }
      if (input === '+' || input === '=') {
        setFiles((prev) => prev.map((f, i) => (i === fileIdx ? { ...f, displayOrder: f.displayOrder + 1 } : f)));
        return;
      }
      if (input === '-' || input === '_') {
        setFiles((prev) => prev.map((f, i) => (i === fileIdx ? { ...f, displayOrder: Math.max(0, f.displayOrder - 1) } : f)));
        return;
      }
      if (key.return) {
        handleUpload();
        return;
      }
      return;
    }

    if (phase === 'done') {
      if (key.return || key.escape || input === 'b') {
        setScreen('catalog-detail', { productId: effectiveProductId });
        return;
      }
      if (input === 'u') {
        setPhase('input-path');
        setSummary(null);
        setFiles([]);
        return;
      }
      return;
    }

    if (phase === 'uploading') {
      return;
    }
  });

  if (phase === 'input-path') {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">🖼  Image Import</Text>
        </Box>

        {needsProductId && (
          <Box marginBottom={1}>
            <Box width={16}>
              <Text dimColor={!needsProductId ? true : false}>Product ID:</Text>
            </Box>
            {needsProductId ? (
              <TextInput
                value={manualProductId}
                onChange={(v) => { setManualProductId(v); setError(''); }}
                onSubmit={() => {}}
                showCursor={true}
                placeholder="Enter product ID"
              />
            ) : (
              <Text>{effectiveProductId}</Text>
            )}
          </Box>
        )}

        {!needsProductId && (
          <Box marginBottom={1}>
            <Box width={16}>
              <Text dimColor>Product ID:</Text>
            </Box>
            <Text>{effectiveProductId}</Text>
          </Box>
        )}

        <Box marginBottom={1}>
          <Box width={16}>
            <Text>Folder path:</Text>
          </Box>
          <TextInput
            value={folderPath}
            onChange={(v) => { setFolderPath(v); setError(''); }}
            onSubmit={() => {}}
            showCursor={true}
            placeholder="~/blackoutmerch-assets/products/hypster-tee/"
          />
        </Box>

        {error && (
          <Box marginBottom={1}>
            <Text color="red">✗ {error}</Text>
          </Box>
        )}

        <Text dimColor>Enter: Scan · Tab: Toggle product ID input · Esc: Back</Text>
      </Box>
    );
  }

  if (phase === 'select-files') {
    const selectedCount = files.filter((f) => f.selected).length;

    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="cyan">🖼  Select Images</Text>
          <Text dimColor>{selectedCount}/{files.length} selected</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          {files.map((f, i) => (
            <Box key={f.path}>
              <Text>
                {i === cursorIdx ? <Text color="cyan">▸</Text> : ' '}
                {' '}
                <Text color={f.selected ? 'green' : undefined}>
                  {f.selected ? '●' : '○'}
                </Text>
                {' '}
                <Text dimColor={i !== cursorIdx}>{f.name}</Text>
              </Text>
            </Box>
          ))}
        </Box>

        {error && (
          <Box marginBottom={1}>
            <Text color="red">✗ {error}</Text>
          </Box>
        )}

        <Text dimColor>
          ↑↓: Navigate · Space: Toggle · A: Select all · Enter: Configure · B: Back · Esc: Cancel
        </Text>
      </Box>
    );
  }

  if (phase === 'configure') {
    const selectedFiles = files.filter((f) => f.selected);
    if (selectedFiles.length === 0) return null;

    const currentFileIdx = Math.min(configIdx, selectedFiles.length - 1);
    const currentFile = selectedFiles[currentFileIdx];

    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">⚙  Configure Images</Text>
          <Text dimColor>  {currentFileIdx + 1}/{selectedFiles.length}</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          {selectedFiles.map((f, i) => {
            const isActive = i === currentFileIdx;
            return (
              <Box key={f.path}>
                <Text>
                  {isActive ? <Text color="cyan">▸</Text> : ' '}
                  {' '}
                  <Text dimColor={!isActive}>{f.name.padEnd(30)}</Text>
                  {' '}
                  <Text color={isActive ? 'yellow' : 'green'}>{f.imageType.padEnd(10)}</Text>
                  {' '}
                  <Text color={f.isPrimary ? 'yellow' : undefined}>
                    {f.isPrimary ? '★ primary' : '  primary'}
                  </Text>
                  {' '}
                  <Text dimColor>order:{f.displayOrder}</Text>
                </Text>
              </Box>
            );
          })}
        </Box>

        {error && (
          <Box marginBottom={1}>
            <Text color="red">✗ {error}</Text>
          </Box>
        )}

        <Text dimColor>
          Tab: Next file · T: Type ({currentFile.imageType}) · P: Primary · +/-: Order · Enter: Upload · Esc: Back
        </Text>
      </Box>
    );
  }

  if (phase === 'uploading') {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">⬆  Uploading Images</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>
            <Text color="cyan"><Spinner type="dots" /></Text>
            {' '}
            [{progress.current}/{progress.total}] {progress.currentFile}
          </Text>
        </Box>

        <Box>
          <Text dimColor>
            {'█'.repeat(Math.round((progress.current / progress.total) * 30))}
            {'░'.repeat(30 - Math.round((progress.current / progress.total) * 30))}
            {' '}
            {Math.round((progress.current / progress.total) * 100)}%
          </Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'done' && summary) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">✓ Upload Complete</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color="green">  Uploaded: {summary.uploaded}</Text>
          <Text color="green">  Saved to DB: {summary.saved}</Text>
          {summary.errors > 0 && (
            <Text color="red">  Errors: {summary.errors}</Text>
          )}
        </Box>

        <Text dimColor>Enter/Esc: Back to product · U: Upload more</Text>
      </Box>
    );
  }

  return null;
}
