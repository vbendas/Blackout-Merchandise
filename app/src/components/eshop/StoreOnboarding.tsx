'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface StoreOnboardingProps {
  onStoreCreated: () => void;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

export function StoreOnboarding({ onStoreCreated }: StoreOnboardingProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
  const slugRef = useRef<HTMLInputElement>(null);

  // Auto-derive slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    // Only allow valid slug characters as they type
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30));
  };

  const validate = (): boolean => {
    const errors: { name?: string; slug?: string } = {};
    if (name.trim().length < 2) errors.name = 'Store name must be at least 2 characters.';
    if (name.trim().length > 100) errors.name = 'Store name must be under 100 characters.';
    if (slug.length < 3) errors.slug = 'URL must be at least 3 characters.';
    if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Only lowercase letters, numbers, and hyphens.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.error?.toLowerCase().includes('slug')) {
          setFieldErrors((prev) => ({ ...prev, slug: 'This URL is already taken. Try another.' }));
        } else {
          setError(data.error ?? 'Something went wrong. Please try again.');
        }
        return;
      }

      onStoreCreated();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-zinc-800/50">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Icon icon="solar:shop-2-linear" className="w-7 h-7 text-zinc-300" />
            </div>
            <h1 className="text-xl font-semibold text-white">Create Your Store</h1>
            <p className="text-sm text-zinc-400 mt-1.5">
              Set up your storefront to start selling merch to your fans.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="store-name">
                Store Name
              </label>
              <Input
                id="store-name"
                type="text"
                placeholder="My Merch Store"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                disabled={isSubmitting}
                className="bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Store Slug */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="store-slug">
                Store URL
              </label>
              <Input
                id="store-slug"
                ref={slugRef}
                type="text"
                placeholder="my-merch-store"
                value={slug}
                onChange={(e) => {
                  handleSlugChange(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, slug: undefined }));
                }}
                disabled={isSubmitting}
                className="bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
              />
              <p className="text-xs text-zinc-500">
                blackoutmerch.example/shop/
                <span className={slug ? 'text-zinc-300' : 'text-zinc-600'}>
                  {slug || 'your-store-url'}
                </span>
              </p>
              {fieldErrors.slug && (
                <p className="text-xs text-red-400">{fieldErrors.slug}</p>
              )}
            </div>

            {/* Global error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || slug.length < 3}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  Creating store…
                </>
              ) : (
                <>
                  <Icon icon="lucide:store" className="w-4 h-4" />
                  Create Store
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          You can customise your store name and URL in settings later.
        </p>
      </motion.div>
    </div>
  );
}
