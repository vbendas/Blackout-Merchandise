'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Cloudinary configuration
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drhfgth7c';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

// Expression name to Cloudinary public_id number mapping
const EXPRESSION_MAP: Record<string, string> = {
  neutral: '1_-_neutral',
  speaking_a: '2_-_speaking_a',
  speaking_b: '3_-_speaking_b',
  happy: '4_-_happy',
  excited: '5_-_excited',
  thinking: '6_-_thinking',
  confused: '7_-_confused',
  shocked: '8_-_shocked',
  sad: '9_-_sad',
  angry_annoyed: '10_-_angry:annoyed',
  wink: '11_-_wink',
  love: '12_-_love',
  sleepy: '13_-_sleepy',
  mischievous: '14_-_mischevious',
  proud: '15_-_proud',
  mouth_closed: '16_-_mouth_closed',
  mouth_o_shape: '17_-_mouth_o_shape',
  mouth_wide_open: '18_-_mouth_wide_open',
  mouth_teeth_showing: '19_-_mouth_teeth_showing',
  blep: '20_-_blep',
};

// Per-character overrides for expressions with typos in Cloudinary
const CHARACTER_OVERRIDES: Record<string, Record<string, string>> = {
  leopoldo: {
    mouth_o_shape: '17_-_mount_o_shape', // typo in original filename
  },
  antonia: {
    mouth_wide_open: '18_-_mount_wide_open', // typo in original filename
  },
};

// All 20 available expressions
const EXPRESSIONS = Object.keys(EXPRESSION_MAP);

// Avatar configuration with Cloudinary paths
// Order: Left (Francisca) -> Center (Leopoldo) -> Right (Antônia)
const AVATARS = {
  francisca: {
    name: 'Francisca',
    folder: 'merch-from/avatars/francisca',
    containerClass: 'h-[86%] -mr-[8%] z-10',
    aspectRatio: 'aspect-[3/4]',
    opacity: 0.8,
    delay: 0,
  },
  leopoldo: {
    name: 'Leopoldo',
    folder: 'merch-from/avatars/leopoldo',
    containerClass: 'h-[98%] z-10',
    aspectRatio: 'aspect-[3/4]',
    opacity: 1,
    delay: 0.15,
  },
  antonia: {
    name: 'Antônia',
    folder: 'merch-from/avatars/antonia',
    containerClass: 'h-[86%] -ml-[8%] z-10',
    aspectRatio: 'aspect-[3/4]',
    opacity: 0.8,
    delay: 0.3,
  },
};

type AvatarKey = keyof typeof AVATARS;

// Build Cloudinary URL with optimizations
function getCloudinaryUrl(folder: string, expression: string, avatarKey: string, width: number = 800): string {
  // Check for character-specific overrides (e.g., typos in filenames)
  const override = CHARACTER_OVERRIDES[avatarKey]?.[expression];
  const expressionPath = override || EXPRESSION_MAP[expression];
  const publicId = `${folder}/${expressionPath}_attr1_subject`;
  // Auto format (webp/avif), auto quality, responsive width
  return `${CLOUDINARY_BASE}/f_auto,q_auto,w_${width}/${publicId}`;
}

// Preload all avatar images to prevent loading delays
function preloadImages() {
  Object.keys(AVATARS).forEach((avatarKey) => {
    const avatar = AVATARS[avatarKey as AvatarKey];
    EXPRESSIONS.forEach((expression) => {
      const img = new Image();
      img.src = getCloudinaryUrl(avatar.folder, expression, avatarKey, 800);
    });
  });
}

export function AvatarTrio() {
  // Track current expression for each avatar
  const [expressions, setExpressions] = useState<Record<AvatarKey, string>>({
    francisca: 'mischievous',
    leopoldo: 'mischievous',
    antonia: 'mischievous',
  });

  // Preload all images on mount
  useEffect(() => {
    preloadImages();
  }, []);

  // Automated expression changes with random timers (4-12 seconds)
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Function to change expression for a specific avatar
    const changeExpression = (avatarKey: AvatarKey) => {
      setExpressions((prev) => {
        const currentExpression = prev[avatarKey];
        // Filter out current expression to ensure we NEVER repeat
        const otherExpressions = EXPRESSIONS.filter((e) => e !== currentExpression);
        const randomExpression = otherExpressions[Math.floor(Math.random() * otherExpressions.length)];
        return { ...prev, [avatarKey]: randomExpression };
      });
    };

    // Function to schedule the next expression change with random delay
    const scheduleNextChange = (avatarKey: AvatarKey) => {
      // Random delay between 4-12 seconds (4000-12000ms)
      const randomDelay = Math.floor(Math.random() * 8000) + 4000;

      const timer = setTimeout(() => {
        changeExpression(avatarKey);
        scheduleNextChange(avatarKey); // Schedule the next change
      }, randomDelay);

      timers.push(timer);
    };

    // Start individual timers for each avatar
    (Object.keys(AVATARS) as AvatarKey[]).forEach((avatarKey) => {
      scheduleNextChange(avatarKey);
    });

    // Cleanup timers on unmount
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="absolute top-[65px] md:top-[10px] left-0 w-full h-[70vh] md:h-[75vh] lg:h-[80vh] flex items-end justify-center z-40 overflow-hidden pt-5 scale-95 max-[389px]:scale-90 max-[389px]:origin-bottom md:scale-95 lg:scale-100">
      <div className="relative w-full max-w-7xl mx-auto h-full flex items-end justify-center pb-0">
        {(Object.keys(AVATARS) as AvatarKey[]).map((key) => {
          const avatar = AVATARS[key];
          const expression = expressions[key];
          const imageSrc = getCloudinaryUrl(avatar.folder, expression, key, 800);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: avatar.delay }}
              className={`${avatar.containerClass} ${avatar.aspectRatio} relative`}
            >
              <motion.img
                src={imageSrc}
                alt={`${avatar.name} - ${expression}`}
                className="absolute inset-0 w-full h-full object-contain saturate-[0.5] sepia-[0.08] hover:saturate-100 hover:sepia-0 mix-blend-screen transition-[filter] duration-500"
                initial={{ opacity: avatar.opacity }}
                animate={{ opacity: avatar.opacity }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
