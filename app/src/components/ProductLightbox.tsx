'use client';

import { Icon } from '@iconify/react';
import { motion, type PanInfo, useAnimation } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '@/data/products';

interface ProductLightboxProps {
  product: Product;
  onConfirm: (config: { name: string; color: string; size: string; position: string }) => void;
  onClose: () => void;
}

const colorOptions = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Grey', hex: '#6b7280' },
];

const sizeOptions = ['S', 'M', 'L', 'XL', 'XXL'];

const positionOptions = ['Front', 'Back', 'Right Sleeve', 'Left Sleeve', 'Intertag'];

export function ProductLightbox({ product, onConfirm, onClose }: ProductLightboxProps): React.ReactElement {
  const [color, setColor] = useState(colorOptions[0].name);
  const [size, setSize] = useState(sizeOptions[0]);
  const [position, setPosition] = useState(positionOptions[0]);
  const [isMobile, setIsMobile] = useState(false);
  const [_activeSection, _setActiveSection] = useState<'color' | 'size' | 'position' | null>(null);

  // Swipe handling
  const controls = useAnimation();
  const _y = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    onConfirm({
      name: product.name,
      color,
      size,
      position,
    });
  }, [color, name, position, product.name, size, onConfirm]);

  // Swipe to close handler
  const handleDragEnd = useCallback(
    async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isMobile && info.offset.y > 100 && info.velocity.y > 0) {
        await controls.start({ y: window.innerHeight, transition: { duration: 0.3 } });
        onClose();
      } else {
        controls.start({ y: 0, transition: { type: 'spring', damping: 30, stiffness: 400 } });
      }
    },
    [controls, isMobile, onClose]
  );

  // Mobile Bottom Sheet Version
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Bottom Sheet */}
        <motion.div
          ref={contentRef}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{
            type: 'spring',
            damping: 30,
            stiffness: 400,
            mass: 0.8,
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="
            relative
            w-full
            bg-zinc-900 
            rounded-t-2xl 
            overflow-hidden 
            shadow-2xl
            max-h-[90vh]
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-title"
        >
          {/* Handle Bar */}
          <div className="w-full pt-3 pb-2 flex justify-center touch-none">
            <div className="w-10 h-1.5 bg-zinc-600 rounded-full" />
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-40px)] pb-safe">
            {/* Product Image - Full width on mobile */}
            <div className="aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative overflow-hidden">
              <Icon icon="lucide:image" className="w-16 h-16 text-zinc-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent" />

              {/* Close Button - Top right */}
              <button
                type="button"
                onClick={onClose}
                className="
                  absolute top-3 right-3
                  w-10 h-10
                  bg-zinc-900/80 backdrop-blur-sm
                  rounded-full
                  flex items-center justify-center
                  text-zinc-400 hover:text-zinc-100
                  transition-colors
                  touch-manipulation
                  min-h-[44px]
                  min-w-[44px]
                "
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Close"
              >
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 id="product-title" className="text-xl font-bold text-zinc-100 mb-1">
                {product.name}
              </h3>
              <p className="text-sm text-zinc-500 mb-4">{product.description}</p>

              {/* Configuration Options */}
              <div className="space-y-4">
                {/* Color Selection */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-medium">Color</label>
                  <div className="flex flex-wrap gap-3">
                    {colorOptions.map((opt) => (
                      <motion.button
                        key={opt.name}
                        type="button"
                        onClick={() => setColor(opt.name)}
                        whileTap={{ scale: 0.9 }}
                        className={`
                          w-12 h-12
                          rounded-full
                          border-2
                          flex items-center justify-center
                          transition-all duration-150
                          touch-manipulation
                          ${
                            color === opt.name
                              ? 'border-zinc-100 shadow-lg shadow-zinc-100/20'
                              : 'border-zinc-700 hover:border-zinc-500'
                          }
                        `}
                        style={{
                          backgroundColor: opt.hex,
                          WebkitTapHighlightColor: 'transparent',
                          minWidth: '48px',
                          minHeight: '48px',
                        }}
                        aria-label={`Select ${opt.name}`}
                        aria-pressed={color === opt.name}
                      >
                        {color === opt.name && opt.hex !== '#FFFFFF' && (
                          <Icon icon="lucide:check" className="w-5 h-5 text-white" />
                        )}
                        {color === opt.name && opt.hex === '#FFFFFF' && (
                          <Icon icon="lucide:check" className="w-5 h-5 text-zinc-900" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-medium">Size</label>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((opt) => (
                      <motion.button
                        key={opt}
                        type="button"
                        onClick={() => setSize(opt)}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          min-w-[48px]
                          min-h-[48px]
                          px-4
                          rounded-lg
                          font-medium
                          text-sm
                          transition-all duration-150
                          touch-manipulation
                          ${size === opt ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}
                        `}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        aria-label={`Size ${opt}`}
                        aria-pressed={size === opt}
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Position Selection */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-medium">Print Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    {positionOptions.map((opt) => (
                      <motion.button
                        key={opt}
                        type="button"
                        onClick={() => setPosition(opt)}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          min-h-[48px]
                          px-3 py-3
                          rounded-lg
                          text-sm
                          font-medium
                          transition-all duration-150
                          touch-manipulation
                          ${
                            position === opt
                              ? 'bg-zinc-100 text-zinc-900'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }
                        `}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        aria-label={`Position: ${opt}`}
                        aria-pressed={position === opt}
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons - Sticky at bottom */}
              <div className="flex gap-3 mt-6 sticky bottom-0 bg-zinc-900 pt-2 pb-safe">
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileTap={{ scale: 0.98 }}
                  className="
                    flex-1
                    min-h-[48px]
                    px-4 py-3
                    bg-zinc-800 hover:bg-zinc-700
                    text-zinc-100
                    rounded-xl
                    font-medium
                    transition-colors
                    touch-manipulation
                    active:bg-zinc-600
                  "
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleConfirm}
                  whileTap={{ scale: 0.98 }}
                  className="
                    flex-1
                    min-h-[48px]
                    px-4 py-3
                    bg-zinc-100 hover:bg-white
                    text-zinc-900
                    rounded-xl
                    font-semibold
                    transition-colors
                    touch-manipulation
                    active:bg-zinc-200
                  "
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Add to Chat
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Desktop Modal Version
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title-desktop"
      >
        {/* Product Image */}
        <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative overflow-hidden">
          <Icon icon="lucide:image" className="w-16 h-16 text-zinc-600" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="
              absolute top-3 right-3
              w-10 h-10
              bg-zinc-900/80 backdrop-blur-sm
              rounded-full
              flex items-center justify-center
              text-zinc-400 hover:text-zinc-100
              transition-colors
            "
            aria-label="Close"
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
          </button>
        </div>

        {/* Product Info */}
        <div className="p-5">
          <h3 id="product-title-desktop" className="text-lg font-bold text-zinc-100 mb-1">
            {product.name}
          </h3>
          <p className="text-sm text-zinc-500 mb-4">{product.description}</p>

          {/* Configuration Form */}
          <div className="space-y-4">
            {/* Color Selection */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setColor(opt.name)}
                    className={`
                      w-10 h-10
                      rounded-full
                      border-2
                      transition-all duration-150
                      ${color === opt.name ? 'border-zinc-100 shadow-lg' : 'border-zinc-700 hover:border-zinc-500'}
                    `}
                    style={{ backgroundColor: opt.hex }}
                    aria-label={`Select ${opt.name}`}
                    aria-pressed={color === opt.name}
                  >
                    {color === opt.name && opt.hex !== '#FFFFFF' && (
                      <Icon icon="lucide:check" className="w-4 h-4 text-white mx-auto" />
                    )}
                    {color === opt.name && opt.hex === '#FFFFFF' && (
                      <Icon icon="lucide:check" className="w-4 h-4 text-zinc-900 mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Size</label>
              <div className="flex gap-2">
                {sizeOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSize(opt)}
                    className={`
                      w-10 h-10
                      rounded-lg
                      font-medium
                      text-sm
                      transition-all duration-150
                      ${size === opt ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}
                    `}
                    aria-label={`Size ${opt}`}
                    aria-pressed={size === opt}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Selection */}
            <div>
              <label htmlFor="position-select" className="text-sm text-zinc-400 mb-2 block">
                Print Position
              </label>
              <select
                id="position-select"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                {positionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg transition-colors font-semibold"
            >
              Add to Chat
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ProductLightbox;
