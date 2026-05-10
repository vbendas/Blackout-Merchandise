/**
 * Chat System Configuration
 *
 * Centralized configuration for all chat-related constants.
 * Prevents magic numbers scattered throughout the codebase.
 */

export const CHAT_CONFIG = {
  // ─── Timeouts (milliseconds) ─────────────────────────────────────────────
  timeouts: {
    /** Mistral API request timeout */
    mistralRequest: 8000,
    /** Intent classification LLM timeout */
    intentClassification: 1200,
    /** Delay before agent handoff message */
    handoffDelay: 400,
    /** Silence detection delay for voice */
    silenceDetection: 1200,
    /** Recording timer interval */
    recordingInterval: 1000,
    /** Bubble auto-show delay */
    bubbleShowDelay: 1500,
    /** Bubble auto-hide delay */
    bubbleHideDelay: 5000,
    /** Hover hide delay */
    hoverHideDelay: 500,
  },

  // ─── Thresholds ───────────────────────────────────────────────────────────
  thresholds: {
    /** Minimum confidence for intent classification (0-1) */
    confidence: 0.7,
    /** Audio level threshold for VAD (0-255) */
    audioLevel: 15,
    /** Maximum message length in characters */
    maxMessageLength: 2000,
    /** Minimum blob size for voice recording (bytes) */
    minVoiceBlobSize: 1000,
  },

  // ─── Limits ───────────────────────────────────────────────────────────────
  limits: {
    /** Maximum number of history messages sent to API */
    maxHistoryMessages: 10,
    /** Maximum voice file size (bytes) */
    maxFileSize: 10 * 1024 * 1024, // 10MB
    /** Voice requests per minute (rate limiting) */
    voiceRequestsPerMinute: 5,
    /** Text requests per minute (rate limiting) */
    textRequestsPerMinute: 20,
    /** Maximum conversation history context window */
    historyContextWindow: 5,
  },

  // ─── VAD Configuration ────────────────────────────────────────────────────
  vad: {
    /** FFT size for audio analysis */
    fftSize: 256,
    /** Smoothing time constant (0-1) */
    smoothingTimeConstant: 0.8,
    /** Number of frequency bins */
    frequencyBinCount: 128,
  },

  // ─── Animation ────────────────────────────────────────────────────────────
  animation: {
    /** Spring stiffness for chat window */
    springStiffness: 300,
    /** Spring damping for chat window */
    springDamping: 25,
    /** Message entrance duration (seconds) */
    messageDuration: 0.3,
    /** Typing indicator blink duration (seconds) */
    typingBlinkDuration: 1.5,
  },

  // ─── UI ───────────────────────────────────────────────────────────────────
  ui: {
    /** Chat window width (desktop, non-studio) */
    desktopWidth: 420,
    /** Chat window width (studio mode) */
    studioWidth: 380,
    /** Avatar size in pixels (md) */
    avatarSize: 168,
  },
} as const;

// Type-safe access helpers
export type ChatConfig = typeof CHAT_CONFIG;
