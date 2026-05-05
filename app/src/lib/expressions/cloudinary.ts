import type { AgentName, Expression } from '@/types/expressions';
import { AGENT_FOLDERS, ALL_EXPRESSIONS, CHARACTER_OVERRIDES, EXPRESSION_MAP } from './constants';

// Cloudinary configuration
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drhfgth7c';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

/**
 * Build Cloudinary URL for an avatar expression
 * @param agentName - The agent (Leopoldo, Francisca, Antônia)
 * @param expression - The expression to display
 * @param width - Image width in pixels (default: 800)
 * @returns Full Cloudinary URL with optimizations
 */
export function getCloudinaryUrl(agentName: AgentName, expression: Expression, width: number = 800): string {
  const folder = AGENT_FOLDERS[agentName];

  // Check for character-specific overrides (e.g., typos in filenames)
  const override = CHARACTER_OVERRIDES[agentName]?.[expression];
  const expressionPath = override || EXPRESSION_MAP[expression];

  const publicId = `${folder}/${expressionPath}_attr1_subject`;

  // Auto format (webp/avif), auto quality, responsive width
  return `${CLOUDINARY_BASE}/f_auto,q_auto,w_${width}/${publicId}`;
}

/**
 * Alias for getCloudinaryUrl - used by chat components
 */
export function getAvatarUrl(agentName: AgentName, expression: Expression, width: number = 800): string {
  return getCloudinaryUrl(agentName, expression, width);
}

/**
 * Preload all avatar expression images to prevent loading delays
 * @param agentName - Optional specific agent to preload (loads all if not specified)
 */
export function preloadExpressions(agentName?: AgentName): void {
  const agents = agentName ? [agentName] : (['Leopoldo', 'Francisca', 'Antônia'] as AgentName[]);

  agents.forEach((agent) => {
    ALL_EXPRESSIONS.forEach((expression) => {
      const img = new Image();
      img.src = getCloudinaryUrl(agent, expression, 800);
    });
  });
}

/**
 * Get all expressions for a specific agent
 * @returns Array of all available expressions
 */
export function getAllExpressions(): Expression[] {
  return [...ALL_EXPRESSIONS];
}

/**
 * Get speaking expressions for animation
 * @returns Array of speaking expressions
 */
export function getSpeakingExpressions(): Expression[] {
  return ['speaking_a', 'speaking_b'];
}

/**
 * Get idle expressions for animation
 * @returns Array of idle expressions
 */
export function getIdleExpressions(): Expression[] {
  return ['neutral', 'thinking', 'mouth_closed', 'sleepy'];
}
