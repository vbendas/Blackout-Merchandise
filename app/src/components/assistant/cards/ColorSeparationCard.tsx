'use client';

interface ColorSeparationCardProps {
  colors: Array<{
    name: string;
    hex: string;
    pantone: string;
  }>;
}

export function ColorSeparationCard({ colors }: ColorSeparationCardProps) {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-800/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="Colors"
          >
            <title>Colors</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          <h3 className="text-sm font-semibold text-white">Color Separation</h3>
        </div>
        <span className="text-xs text-zinc-500">{colors.length} colors detected</span>
      </div>

      {/* Color grid */}
      <div className="grid grid-cols-2 gap-2">
        {colors.map((color, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50 border border-white/5">
            {/* Color swatch */}
            <div
              className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />

            {/* Color info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-300 truncate">{color.name}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{color.pantone}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info note */}
      <p className="mt-3 text-xs text-zinc-500">
        Colors are separated for screen printing. Each color requires a separate screen.
      </p>
    </div>
  );
}
