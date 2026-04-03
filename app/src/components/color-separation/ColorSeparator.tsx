'use client';

import { useCallback, useEffect, useState } from 'react';
import { colorSeparationClient, type PantoneMapping, type SeparationResponse } from '@/lib/color-separation';

interface ColorSeparatorProps {
  designFile?: File;
  garmentColor?: string;
  onSeparationComplete?: (result: SeparationResponse) => void;
  onError?: (error: string) => void;
}

export function ColorSeparator({
  designFile,
  garmentColor = '#FFFFFF',
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
          include_white: true,
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
    [garmentColor, onSeparationComplete, onError]
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

  return (
    <div className="color-separator p-4 bg-zinc-900 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Color Separation</h3>
        {result && <span className="text-sm text-green-400">{result.kept_colors} colors</span>}
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
      }
    ) => {
      setIsSeparating(true);
      setError(null);

      try {
        const response = await colorSeparationClient.separateColors(file, {
          garment_color: options?.garmentColor || '#FFFFFF',
          max_colors: options?.maxColors || 6,
          threshold: options?.threshold || 35,
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
