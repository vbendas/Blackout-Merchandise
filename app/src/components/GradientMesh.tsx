'use client';

import { motion } from 'framer-motion';
import { getAgentColor } from '@/lib/chat/agentDetection';
import { useNavigation } from '@/lib/NavigationContext';

/**
 * GradientMesh - Animated gradient background for PWA glass effect
 *
 * Provides subtle color variation behind the side strip nav and bottom bar
 * so the backdrop-blur effect actually has something to blur.
 *
 * The colors subtly shift based on the current active agent:
 * - Leopoldo: Gray/neutral with subtle warm undertones
 * - Francisca: Purple/violet tones
 * - Antonia: Blue/teal tones
 */
export function GradientMesh() {
  const { activeAgent } = useNavigation();
  const agentColor = getAgentColor(activeAgent);

  // Convert hex to RGB for opacity manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 100, g: 100, b: 100 };
  };

  const rgb = hexToRgb(agentColor);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 0% 30%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 70%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.04) 0%, transparent 40%),
          radial-gradient(ellipse at 50% 100%, rgba(30, 58, 138, 0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, rgba(88, 28, 135, 0.04) 0%, transparent 40%),
          linear-gradient(180deg, #09090b 0%, #18181b 50%, #09090b 100%)
        `,
      }}
    >
      {/* Animated subtle blobs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background: `radial-gradient(circle, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          left: '-10%',
          top: '20%',
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06) 0%, transparent 70%)`,
          filter: 'blur(80px)',
          right: '-5%',
          bottom: '10%',
        }}
        animate={{
          x: [0, -20, 0],
          y: [0, -30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />

      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-25"
        style={{
          background: `radial-gradient(circle, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.07) 0%, transparent 70%)`,
          filter: 'blur(50px)',
          left: '30%',
          bottom: '-10%',
        }}
        animate={{
          x: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 10,
        }}
      />
    </div>
  );
}
