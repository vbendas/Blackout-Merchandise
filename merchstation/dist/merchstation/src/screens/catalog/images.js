import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
import { configureCloudinary, scanForImages, uploadImage } from '../../lib/cloudinary';
const IMAGE_TYPES = ['front', 'back', 'detail', 'lifestyle', 'swatch'];
export function CatalogImagesScreen({ maxHeight }) {
    const setScreen = useAppStore((s) => s.setScreen);
    const screenParams = useAppStore((s) => s.screenParams);
    const config = useAppStore((s) => s.config);
    const productId = screenParams.productId ?? '';
    const [phase, setPhase] = useState(productId ? 'input-path' : 'input-path');
    const [folderPath, setFolderPath] = useState('');
    const [manualProductId, setManualProductId] = useState(productId);
    const [needsProductId, setNeedsProductId] = useState(!productId);
    const [files, setFiles] = useState([]);
    const [cursorIdx, setCursorIdx] = useState(0);
    const [configIdx, setConfigIdx] = useState(0);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const effectiveProductId = needsProductId ? manualProductId : productId;
    const doScan = useCallback((dir) => {
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
                imageType: 'front',
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
                const result = await uploadImage(file.path);
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
            }
            catch (err) {
                errors++;
            }
        }
        try {
            const { pingReindex } = await import('../../lib/sync');
            await pingReindex(config);
        }
        catch {
            // reindex failure is non-blocking
        }
        setSummary({ uploaded, saved, errors });
        setPhase('done');
    }, [files, config, effectiveProductId]);
    useInput((input, key) => {
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
                setFiles((prev) => prev.map((f, i) => (i === cursorIdx ? { ...f, selected: !f.selected } : f)));
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
                }
                else {
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
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDDBC  Image Import" }) }), needsProductId && (_jsxs(Box, { marginBottom: 1, children: [_jsx(Box, { width: 16, children: _jsx(Text, { dimColor: !needsProductId ? true : false, children: "Product ID:" }) }), needsProductId ? (_jsx(TextInput, { value: manualProductId, onChange: (v) => { setManualProductId(v); setError(''); }, onSubmit: () => { }, showCursor: true, placeholder: "Enter product ID" })) : (_jsx(Text, { children: effectiveProductId }))] })), !needsProductId && (_jsxs(Box, { marginBottom: 1, children: [_jsx(Box, { width: 16, children: _jsx(Text, { dimColor: true, children: "Product ID:" }) }), _jsx(Text, { children: effectiveProductId })] })), _jsxs(Box, { marginBottom: 1, children: [_jsx(Box, { width: 16, children: _jsx(Text, { children: "Folder path:" }) }), _jsx(TextInput, { value: folderPath, onChange: (v) => { setFolderPath(v); setError(''); }, onSubmit: () => { }, showCursor: true, placeholder: "~/merchfrom-assets/products/hypster-tee/" })] }), error && (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { color: "red", children: ["\u2717 ", error] }) })), _jsx(Text, { dimColor: true, children: "Enter: Scan \u00B7 Tab: Toggle product ID input \u00B7 Esc: Back" })] }));
    }
    if (phase === 'select-files') {
        const selectedCount = files.filter((f) => f.selected).length;
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDDBC  Select Images" }), _jsxs(Text, { dimColor: true, children: [selectedCount, "/", files.length, " selected"] })] }), _jsx(Box, { flexDirection: "column", marginBottom: 1, children: files.map((f, i) => (_jsx(Box, { children: _jsxs(Text, { children: [i === cursorIdx ? _jsx(Text, { color: "cyan", children: "\u25B8" }) : ' ', ' ', _jsx(Text, { color: f.selected ? 'green' : undefined, children: f.selected ? '●' : '○' }), ' ', _jsx(Text, { dimColor: i !== cursorIdx, children: f.name })] }) }, f.path))) }), error && (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { color: "red", children: ["\u2717 ", error] }) })), _jsx(Text, { dimColor: true, children: "\u2191\u2193: Navigate \u00B7 Space: Toggle \u00B7 A: Select all \u00B7 Enter: Configure \u00B7 B: Back \u00B7 Esc: Cancel" })] }));
    }
    if (phase === 'configure') {
        const selectedFiles = files.filter((f) => f.selected);
        if (selectedFiles.length === 0)
            return null;
        const currentFileIdx = Math.min(configIdx, selectedFiles.length - 1);
        const currentFile = selectedFiles[currentFileIdx];
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\u2699  Configure Images" }), _jsxs(Text, { dimColor: true, children: ["  ", currentFileIdx + 1, "/", selectedFiles.length] })] }), _jsx(Box, { flexDirection: "column", marginBottom: 1, children: selectedFiles.map((f, i) => {
                        const isActive = i === currentFileIdx;
                        return (_jsx(Box, { children: _jsxs(Text, { children: [isActive ? _jsx(Text, { color: "cyan", children: "\u25B8" }) : ' ', ' ', _jsx(Text, { dimColor: !isActive, children: f.name.padEnd(30) }), ' ', _jsx(Text, { color: isActive ? 'yellow' : 'green', children: f.imageType.padEnd(10) }), ' ', _jsx(Text, { color: f.isPrimary ? 'yellow' : undefined, children: f.isPrimary ? '★ primary' : '  primary' }), ' ', _jsxs(Text, { dimColor: true, children: ["order:", f.displayOrder] })] }) }, f.path));
                    }) }), error && (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { color: "red", children: ["\u2717 ", error] }) })), _jsxs(Text, { dimColor: true, children: ["Tab: Next file \u00B7 T: Type (", currentFile.imageType, ") \u00B7 P: Primary \u00B7 +/-: Order \u00B7 Enter: Upload \u00B7 Esc: Back"] })] }));
    }
    if (phase === 'uploading') {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, color: "cyan", children: "\u2B06  Uploading Images" }) }), _jsx(Box, { marginBottom: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' ', "[", progress.current, "/", progress.total, "] ", progress.currentFile] }) }), _jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ['█'.repeat(Math.round((progress.current / progress.total) * 30)), '░'.repeat(30 - Math.round((progress.current / progress.total) * 30)), ' ', Math.round((progress.current / progress.total) * 100), "%"] }) })] }));
    }
    if (phase === 'done' && summary) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, color: "cyan", children: "\u2713 Upload Complete" }) }), _jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsxs(Text, { color: "green", children: ["  Uploaded: ", summary.uploaded] }), _jsxs(Text, { color: "green", children: ["  Saved to DB: ", summary.saved] }), summary.errors > 0 && (_jsxs(Text, { color: "red", children: ["  Errors: ", summary.errors] }))] }), _jsx(Text, { dimColor: true, children: "Enter/Esc: Back to product \u00B7 U: Upload more" })] }));
    }
    return null;
}
