'use client';

import { useCallback, useEffect, useState } from 'react';
import { colorSeparationClient, type PantoneMapping, type SeparationResponse } from '@/lib/color-separation';

interface ColorSeparatorProps {
  designFile?: File;
  garmentColor?: string;
  colorMode?: string;
  printMethod?: string;
  onSeparationComplete?: (result: SeparationResponse) => void;
  onError?: (error: string) => void;
}

export function ColorSeparator({
  designFile,
  garmentColor = '#FFFFFF',
  colorMode = 'spot',
  printMethod = 'screen',
  onSeparationComplete,
  onError,
}: ColorSeparatorProps) {
  const [isSeparating, setIsSeparating] = useState(false);
  const [result, setResult] = useState<SeparationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const separateColors = useCallback(
    async (file: File) => {
      setIsSeparating(true);
      setError(null);

      try {
        const response = await colorSeparationClient.separateColors(file, {
          garment_color: garmentColor,
          max_colors: 6,
          threshold: 35,
          color_mode: colorMode,
          print_method: printMethod,
          include_halftone: true,
        });

        setResult(response);
        onSeparationComplete?.(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Color separation failed';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsSeparating(false);
      }
    },
    [garmentColor, colorMode, printMethod, onSeparationComplete, onError]
  );

  useEffect(() => {
    if (designFile) {
      separateColors(designFile);
    }
  }, [designFile, separateColors]);

  const renderColorSwatch = (rgb: [number, number, number]) => {
    const hex = `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    return (
      <div key={hex} className="w-8 h-8 rounded border border-zinc-600" style={{ backgroundColor: hex }} title={hex} />
    );
  };

  const renderPantoneMapping = (mapping: PantoneMapping) => {
    const originalHex = mapping.original_color.hex;
    const matchHex = mapping.best_match.hex;

    return (
      <div key={mapping.original_color.hex} className="flex items-center gap-3 p-2 bg-zinc-800 rounded">
        <div className="w-10 h-10 rounded border border-zinc-600" style={{ backgroundColor: originalHex }} />
        <div className="flex-1">
          <p className="text-sm font-medium">{mapping.best_match.name}</p>
          <p className="text-xs text-zinc-400">
            {mapping.best_match.pantone} • ΔE {mapping.best_match.distance.toFixed(1)}
          </p>
          {mapping.magna_recipe && (
            <p className="text-xs text-amber-400 mt-1">
              {mapping.magna_recipe.base} + {mapping.magna_recipe.pigment}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded border border-zinc-600" style={{ backgroundColor: matchHex }} />
      </div>
    );
  };

  const getModeBadgeColor = (mode: string) => {
    switch (mode) {
      case 'spot': return 'bg-blue-500/20 text-blue-400';
      case 'process': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'screen': return 'bg-amber-500/20 text-amber-400';
      case 'dtg': return 'bg-pink-500/20 text-pink-400';
      case 'dtf': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <div className="color-separator p-4 bg-zinc-900 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Color Separation</h3>
        <div className="flex items-center gap-2">
          {result && (
            <>
              <span className={`text-xs px-2 py-1 rounded ${getModeBadgeColor(result.color_mode)}`}>
                {result.color_mode.toUpperCase()}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${getMethodBadgeColor(result.print_method)}`}>
                {result.print_method.toUpperCase()}
              </span>
              <span className="text-sm text-green-400">{result.kept_colors} colors</span>
            </>
          )}
        </div>
      </div>

      {!designFile && !result && <p className="text-zinc-400 text-sm">Upload a design to run color separation</p>}

      {isSeparating && (
        <div className="flex items-center gap-3 p-4 bg-zinc-800 rounded">
          <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing colors...</span>
        </div>
      )}

      {error && <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">{error}</div>}

      {result && !isSeparating && (
        <div className="space-y-4">
          {/* White Base Layer */}
          {result.white_base_layer && (
            <div className="p-3 bg-zinc-800 rounded">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">White Base Layer</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-white border border-zinc-600" />
                <div className="flex-1 text-xs text-zinc-400">
                  <p>Filename: {result.white_base_layer.filename}</p>
                  {result.white_base_layer.choke_applied && (
                    <p className="text-amber-400">
                      Choke: {result.white_base_layer.choke_px}px 
                      ({result.white_base_layer.area_reduction_percent?.toFixed(1)}% reduction)
                    </p>
                  )}
                  {!result.white_base_layer.choke_applied && (
                    <p className="text-purple-400">No choke (process mode)</p>
                  )}
                  <p>Area: {result.white_base_layer.original_area.toLocaleString()} px</p>
                </div>
              </div>
            </div>
          )}

          {/* Spot Mode: Original Colors + Pantone */}
          {result.color_mode === 'spot' && (
            <>
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Original Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {result.original_colors.map((color) => (
                    <div key={color.hex} className="flex items-center gap-2">
                      {renderColorSwatch(color.rgb)}
                      <span className="text-xs text-zinc-400">{(color.coverage * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.pantone_mappings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Pantone Matches</h4>
                  <div className="space-y-2">{result.pantone_mappings.map(renderPantoneMapping)}</div>
                </div>
              )}

              {result.filtered_colors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Filtered (too similar to garment)</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.filtered_colors.map((color) => (
                      <div key={color.hex} className="flex items-center gap-2 opacity-50">
                        {renderColorSwatch(color.rgb)}
                        <span className="text-xs text-zinc-500">{color.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Process Mode: CMYK Layers */}
          {result.color_mode === 'process' && (
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-2">CMYK Layers</h4>
              <div className="grid grid-cols-2 gap-2">
                {result.layers
                  .filter(l => l.type === 'cmyk' || !l.type)
                  .map((layer) => (
                    <div key={layer.filename} className="p-2 bg-zinc-800 rounded text-xs">
                      <p className="font-medium">{layer.channel || `Layer ${layer.layer}`}</p>
                      <p className="text-zinc-500">{layer.filename}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-zinc-800 rounded text-xs text-zinc-400">
            <p>Processing time: {result.metadata.processing_time_ms}ms</p>
            <p>Garment: {result.metadata.garment_color}</p>
            <p>Coverage revealed: {(result.garment_reveal_coverage * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function useColorSeparation() {
  const [isSeparating, setIsSeparating] = useState(false);
  const [result, setResult] = useState<SeparationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const separate = useCallback(
    async (
      file: File,
      options?: {
        garmentColor?: string;
        maxColors?: number;
        threshold?: number;
        colorMode?: string;
        printMethod?: string;
      }
    ) => {
      setIsSeparating(true);
      setError(null);

      try {
        const response = await colorSeparationClient.separateColors(file, {
          garment_color: options?.garmentColor || '#FFFFFF',
          max_colors: options?.maxColors || 6,
          threshold: options?.threshold || 35,
          color_mode: options?.colorMode || 'spot',
          print_method: options?.printMethod || 'screen',
        });

        setResult(response);
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Color separation failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsSeparating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    separate,
    reset,
    isSeparating,
    result,
    error,
  };
}
