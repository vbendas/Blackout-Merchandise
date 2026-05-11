import type { AgentId } from '@/types/chat';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const REQUEST_TIMEOUT_MS = 30000;

// Hardcoded voice IDs — custom ElevenLabs voices for each agent.
// Env vars can override if needed, but defaults ensure demo works without .env.local.
const DEFAULT_AGENT_VOICES: Record<AgentId, string> = {
  leopoldo: 'c43ywN69sd2QZPOi12As',
  francisca: 'uCG8NgE9eo2MZqeaE3Yw',
  antonia: 'gNmLxtK9mWUnIfR6E6DB',
};

const AGENT_VOICES: Record<AgentId, string> = {
  leopoldo: process.env.ELEVENLABS_VOICE_LEOPOLDO || DEFAULT_AGENT_VOICES.leopoldo,
  francisca: process.env.ELEVENLABS_VOICE_FRANCISCA || DEFAULT_AGENT_VOICES.francisca,
  antonia: process.env.ELEVENLABS_VOICE_ANTONIA || DEFAULT_AGENT_VOICES.antonia,
};

class ElevenLabsTTSProvider {
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY ?? '';

    // Only API key is required — voice IDs have hardcoded defaults
    this.isConfigured = !!this.apiKey;

    if (!this.apiKey) {
      console.warn(
        '[ElevenLabsTTS] Missing ELEVENLABS_API_KEY. ' +
        'TTS will be unavailable until this is configured in .env.local'
      );
    } else {
      console.log('[ElevenLabsTTS] Configured with voices:', Object.keys(AGENT_VOICES).join(', '));
      console.log('[ElevenLabsTTS] Voice IDs:', {
        leopoldo: AGENT_VOICES.leopoldo,
        francisca: AGENT_VOICES.francisca,
        antonia: AGENT_VOICES.antonia,
      });
    }
  }

  get configured(): boolean {
    return this.isConfigured;
  }

  async generateSpeech(text: string, agent: AgentId): Promise<string | null> {
    if (!this.isConfigured) {
      console.warn('[ElevenLabsTTS] Provider not fully configured, returning null');
      return null;
    }

    const voiceId = AGENT_VOICES[agent];
    if (!voiceId) {
      console.warn(`[ElevenLabsTTS] No voice ID configured for agent: ${agent}`);
      return null;
    }

    console.log(`[ElevenLabsTTS] Using voice ID: ${voiceId} for agent: ${agent}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ElevenLabsTTS] API error ${response.status}: ${errorText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:audio/mp3;base64,${base64}`;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[ElevenLabsTTS] TTS request failed:', error);
      return null;
    }
  }
}

export const elevenLabsTTSProvider = new ElevenLabsTTSProvider();
