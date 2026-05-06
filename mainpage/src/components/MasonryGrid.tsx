'use client';

import { useEffect, useState } from 'react';
import { useViewportSize } from '@/hooks/useViewportSize';

// Cloudinary configuration
const CLOUDINARY_CLOUD = 'drhfgth7c';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

function getCloudinaryUrl(publicId: string, width: number = 600): string {
  return `${CLOUDINARY_BASE}/f_auto,q_auto,w_${width}/${publicId}`;
}

// Gallery items with Cloudinary public_ids
const ITEMS = [
  { id: 1, publicId: '2024061019193023_xppfml', className: 'col-span-1 md:col-span-1 lg:col-span-2 row-span-2' },
  { id: 2, publicId: '2024061511335904_xnxhyx', className: 'col-span-1 row-span-1' },
  { id: 3, publicId: '2024061611442076_eendu5', className: 'col-span-1 lg:row-span-2 row-span-1' },
  { id: 4, publicId: '2024072522085784_wqhpz4', className: 'col-span-1 row-span-1' },
  { id: 5, publicId: 'PXL_20240104_185659523.RAW-01.COVER_cbnu86', className: 'col-span-1 row-span-1' },
  { id: 6, publicId: 'PXL_20240319_102040539.RAW-01.COVER_bsfp1u', className: 'col-span-1 lg:row-span-2 row-span-1' },
  { id: 7, publicId: 'PXL_20240319_214226810.RAW-01.COVER_ipjods', className: 'col-span-1 md:col-span-1 lg:col-span-2 row-span-2' },
  { id: 8, publicId: 'PXL_20240329_140404109.RAW-01.COVER_ciokct', className: 'col-span-1 lg:row-span-2 row-span-1' },
  { id: 9, publicId: 'PXL_20240429_125545466.RAW-01.COVER_xqirln', className: 'col-span-1 row-span-1' },
  { id: 10, publicId: 'PXL_20240505_122820090.RAW-01.COVER_l0m1qc', className: 'col-span-1 lg:row-span-2 row-span-1' },
  { id: 11, publicId: 'PXL_20240505_144131222.RAW-01.COVER_yyw0of', className: 'col-span-1 row-span-1' },
  { id: 12, publicId: 'PXL_20240608_133049372.RAW-01.COVER_heljk8', className: 'col-span-1 row-span-1' },
  { id: 13, publicId: 'PXL_20240610_165136658.RAW-01.COVER_xmpqk1', className: 'col-span-1 row-span-1' },
  { id: 14, publicId: 'PXL_20240612_000158545.RAW-01.COVER_tquwks', className: 'col-span-1 row-span-1' },
];

export default function MasonryGrid() {
  const [mounted, setMounted] = useState(false);
  const { hasMounted } = useViewportSize();

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted || !hasMounted) return null;

  return (
    <section className="w-full bg-black relative overflow-hidden" style={{ height: '100vh' }}>
      {/* Gradient fade at top */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/80 to-transparent z-20 pointer-events-none" />

      {/* Static masonry grid */}
      <div className="min-h-full overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[300px] md:auto-rows-[250px] lg:auto-rows-[200px] grid-flow-dense relative z-0">
          {ITEMS.map((item, index) => (
            <div
              key={item.id}
              className={`relative group overflow-hidden rounded-sm ${item.className}`}
            >
              <img
                src={getCloudinaryUrl(item.publicId, 600)}
                alt={`Portfolio ${item.id}`}
                draggable={false}
                className="w-full h-full object-cover saturate-[0.65] sepia-[0.08] contrast-[1.05] blur-[0.5px] group-hover:saturate-100 group-hover:sepia-0 group-hover:contrast-100 group-hover:blur-0 transition-all duration-700 ease-in-out scale-105 group-hover:scale-100"
              />
              {/* Film grain overlay */}
              <div
                className="absolute inset-0 opacity-30 group-hover:opacity-0 transition-opacity duration-700 pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-36 bg-gradient-to-t from-black via-black to-transparent z-20 pointer-events-none" />
    </section>
  );
}
