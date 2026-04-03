'use client';

import { useState } from 'react';
import { type MockupRequest, type MockupResponse, mockupClient, type ProductTemplate } from '@/lib/mockup';

interface MockupGeneratorProps {
  product?: ProductTemplate;
  onMockupGenerated?: (url: string) => void;
}

export function MockupGenerator({ product, onMockupGenerated }: MockupGeneratorProps) {
  const [designUrl, setDesignUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedView, setSelectedView] = useState<'front' | 'back' | 'detail'>('front');
  const [halftone, setHalftone] = useState(true);
  const [dpi, setDpi] = useState<72 | 300>(300);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockup, setMockup] = useState<MockupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!product || !designUrl || !selectedColor) {
      setError('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const request: MockupRequest = {
        design_url: designUrl,
        product_sku: product.sku,
        color_code: selectedColor,
        views: [selectedView as 'flat' | 'worn' | 'closeup'],
        halftone,
        dpi,
      };

      const result = await mockupClient.generateMockup(request);
      setMockup(result);

      if (result.success && result.views?.[0]?.web_res_url && onMockupGenerated) {
        onMockupGenerated(result.views[0].web_res_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mockup-generator p-6 bg-zinc-900 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Generate Mockup</h2>

      {product && (
        <div className="mb-4 p-3 bg-zinc-800 rounded">
          <p className="text-sm text-zinc-400">
            {product.name} - {product.category}
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Design URL</label>
        <input
          type="url"
          value={designUrl}
          onChange={(e) => setDesignUrl(e.target.value)}
          placeholder="https://example.com/design.png"
          className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded"
        />
      </div>

      {product && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Color</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(product.colors).map(
              ([code, color]: [string, any]) =>
                color.available && (
                  <button
                    key={code}
                    onClick={() => setSelectedColor(code)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedColor === code ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                )
            )}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">View</label>
        <div className="flex gap-2">
          {(['front', 'back', 'detail'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-4 py-2 rounded ${
                selectedView === view ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={halftone}
            onChange={(e) => setHalftone(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Halftone Effect</span>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-sm">DPI:</span>
          <select
            value={dpi}
            onChange={(e) => setDpi(Number(e.target.value) as 72 | 300)}
            className="p-1 bg-zinc-800 rounded"
          >
            <option value={72}>72 (Web)</option>
            <option value={300}>300 (Print)</option>
          </select>
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !product || !designUrl || !selectedColor}
        className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-700 rounded font-medium"
      >
        {isGenerating ? 'Generating...' : 'Generate Mockup'}
      </button>

      {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-800 rounded text-red-200">{error}</div>}

      {mockup && mockup.success && mockup.views?.[0]?.web_res_url && (
        <div className="mt-4">
          <p className="text-green-400 mb-2">Mockup generated!</p>
          <img src={mockup.views[0].web_res_url} alt="Generated mockup" className="w-full rounded" />
          <div className="mt-2 flex gap-2">
            <a
              href={mockup.views[0].web_res_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-rose-400 hover:underline"
            >
              View Full Size
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
