'use client';

export function StatsBar() {
  const stats = [
    {
      value: '$0',
      label: 'Upfront Cost',
    },
    {
      value: '40%+',
      label: 'Avg. Margin',
    },
    {
      value: '100%',
      label: 'Organic & Vegan',
      emoji: '🌱',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-16">
      <div
        className="relative rounded-2xl border border-[#D4AF37]/15 bg-black/50 backdrop-blur-sm overflow-hidden"
        style={{
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.1)',
        }}
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#D4AF37]/20">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center justify-center px-8 py-10 md:py-12">
              {/* Value */}
              <div className="text-5xl md:text-6xl font-bold text-[#D4AF37] mb-2">{stat.value}</div>

              {/* Label */}
              <div className="text-sm md:text-base text-gray-400 font-medium flex items-center gap-1.5">
                {stat.label}
                {stat.emoji && <span className="text-lg">{stat.emoji}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
