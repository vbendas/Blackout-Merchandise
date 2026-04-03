import type { AgentName, Expression } from '@/types/expressions';
import { AGENT_FOLDERS, CHARACTER_OVERRIDES } from './constants';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drhfgth7c';

function getExpressionFilename(character: AgentName, expression: Expression): string {
  const override = CHARACTER_OVERRIDES[character]?.[expression];
  if (override) return `${override}_attr1_subject`;

  const map: Record<Expression, string> = {
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

  return `${map[expression]}_attr1_subject`;
}

export function getCloudinaryUrl(character: AgentName, expression: Expression, size: number = 200): string {
  const folder = AGENT_FOLDERS[character];
  const filename = getExpressionFilename(character, expression);
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${size}/${folder}/${filename}`;
}

export function getAvatarUrl(character: AgentName, expression: Expression, size: number = 200): string {
  return getCloudinaryUrl(character, expression, size);
}
