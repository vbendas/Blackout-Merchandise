'use client';

interface TransformationResultCardProps {
  beforeUrl: string;
  afterUrl: string;
  transformationName: string;
}

export function TransformationResultCard({ beforeUrl, afterUrl, transformationName }: TransformationResultCardProps) {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      {/* Header with transformation name */}
      <div className="px-4 py-2 border-b border-white/10 bg-zinc-800/30">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-200 border border-purple-500/30">
          {transformationName}
        </span>
      </div>

      {/* Before/After comparison */}
      <div className="grid grid-cols-2 gap-2 p-2">
        {/* Before */}
        <div className="space-y-1">
          <span className="text-xs text-zinc-500 font-medium">Before</span>
          <div className="aspect-square rounded-lg bg-zinc-950 overflow-hidden">
            <img src={beforeUrl} alt="Before transformation" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* After */}
        <div className="space-y-1">
          <span className="text-xs text-zinc-500 font-medium">After</span>
          <div className="aspect-square rounded-lg bg-zinc-950 overflow-hidden">
            <img src={afterUrl} alt="After transformation" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}
