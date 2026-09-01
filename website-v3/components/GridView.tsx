'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PRODUCTS, type Product } from '@/lib/products';
import { ProductModal } from '@/components/ProductModal';

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function GridView() {
  // Server-render in source order (deterministic, no hydration
  // mismatch), then shuffle after mount so every visit gets a fresh
  // arrangement of the catalog.
  const [products, setProducts] = useState<readonly Product[]>(PRODUCTS);
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState<Product | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProducts(shuffle(PRODUCTS));
    setArmed(true);
  }, []);

  // Entrance stagger: each card rises in as it enters the viewport,
  // once. The 'in' class survives React re-renders because className
  // props never change after arming.
  useEffect(() => {
    if (!armed || !rootRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('catalog-card-in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    );
    rootRef.current.querySelectorAll('.catalog-card').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [armed, products]);

  return (
    <>
      <div
        ref={rootRef}
        data-armed={armed || undefined}
        className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-3 lg:grid-cols-4"
        style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}
      >
        {products.map((product, i) => (
          <div
            key={product.code}
            className="catalog-card group"
            style={{ transitionDelay: `${(i % 4) * 70}ms`, cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            aria-label={`${product.code} — details`}
            onClick={() => setOpen(product)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(product);
              }
            }}
          >
            <div className="relative w-full" style={{ aspectRatio: '4 / 5' }}>
              {/* Inset so the garment never touches its cell — the ground
                  breathes around every product. */}
              <div className="absolute inset-[9%]">
                <Image
                  src={product.src}
                  alt={`${product.code} — front`}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className={`object-contain transition-opacity duration-500 ease-out ${
                    product.back ? 'group-hover:opacity-0' : ''
                  }`}
                />
                {product.back && (
                  <Image
                    src={product.back}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-contain opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                  />
                )}
              </div>
            </div>
            <div className="mt-5 text-center text-[13px] tracking-[0.06em]">
              <span className="font-bold">{product.code}</span>
              <span className="block overflow-hidden">
                <span
                  className="block translate-y-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
                  style={{ color: 'color-mix(in srgb, var(--signal) 60%, transparent)' }}
                >
                  {product.name}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
      {open && <ProductModal product={open} onClose={() => setOpen(null)} />}
    </>
  );
}
