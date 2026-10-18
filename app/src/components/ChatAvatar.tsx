'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { AgentName, Expression } from '@/types/expressions';

interface ChatAvatarProps {
  agentName: AgentName;
  expression: Expression;
}

export function ChatAvatar({ agentName, expression }: ChatAvatarProps) {
  // Build Cloudinary URL
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drhfgth7c';
  const baseCloudinary = `https://res.cloudinary.com/${cloudName}/image/upload`;

  // Map expression to file number (from constants)
  const expressionMap: Record<string, string> = {
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

  const expressionNumber = expressionMap[expression] || '1_-_neutral';
  const publicId = `blackout-merchandise/avatars/${agentName.toLowerCase()}/${expressionNumber}_attr1_subject`;

  // Large avatar (96px) for enhanced expression visibility
  const imageUrl = `${baseCloudinary}/f_auto,q_auto,w_256/${publicId}`;

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-zinc-900"
    >
      <Image src={imageUrl} alt={`${agentName} - ${expression}`} fill className="object-cover" sizes="96px" />
    </motion.div>
  );
}
