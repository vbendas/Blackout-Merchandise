import type { AgentId } from '@/types/chat';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const REQUEST_TIMEOUT_MS = 30000;

const AGENT_VOICES: Record<AgentId, string> = {
  leopoldo: process.env.ELEVENLABS_VOICE_LEOPOLDO!,
  francisca: process.env.ELEVENLABS_VOICE_FRANCISCA!,
  antonia: process.env.ELEVENLABS_VOICE_ANTONIA!,
};

class ElevenLabsTTSProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY ?? '';

    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn('[ElevenLabsTTS] Missing ELEVENLABS_API_KEY - TTS will be unavailable');
    }
    if (!process.env.ELEVENLABS_VOICE_LEOPOLDO) {
      console.warn('[ElevenLabsTTS] Missing ELEVENLABS_VOICE_LEOPOLDO');
    }
    if (!process.env.ELEVENLABS_VOICE_FRANCISCA) {
      console.warn('[ElevenLabsTTS] Missing ELEVENLABS_VOICE_FRANCISCA');
    }
    if (!process.env.ELEVENLABS_VOICE_ANTONIA) {
      console.warn('[ElevenLabsTTS] Missing ELEVENLABS_VOICE_ANTONIA');
    }
  }

  async generateSpeech(text: string, agent: AgentId): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('[ElevenLabsTTS] No API key, returning null');
      return null;
    }

    const voiceId = AGENT_VOICES[agent];
    if (!voiceId) {
      console.warn(`[ElevenLabsTTS] No voice ID configured for agent: ${agent}`);
      return null;
    }

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
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
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
