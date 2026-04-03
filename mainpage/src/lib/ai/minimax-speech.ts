import type { AgentId } from '@/types/chat';

export interface SpeechConfig {
  voiceId?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

const AGENT_VOICES: Record<AgentId, string> = {
  antonia: 'male-qn-qingse',
  leopoldo: 'male-qn-jingying',
  francisca: 'female-shaonv',
};

export class MiniMaxSpeechProvider {
  private apiKey: string;
  private baseUrl = 'https://api.minimax.io';

  constructor(apiKey?: string) {
    const envKey = process.env.MINIMAX_SPEECH_API_KEY;
    this.apiKey = apiKey || (envKey ? envKey : '');
    
    if (!this.apiKey) {
      console.warn('[MiniMaxSpeech] Missing API key - Speech will use fallback mode');
    }
  }

  async generateSpeech(
    text: string,
    agent: AgentId,
    config: SpeechConfig = {}
  ): Promise<ArrayBuffer | null> {
    if (!this.apiKey) {
      console.warn('[MiniMaxSpeech] No API key, returning null');
      return null;
    }

    const voiceId = config.voiceId || AGENT_VOICES[agent];
    
    try {
      const response = await fetch(`${this.baseUrl}/t2a_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          text,
          model: 'speech-02.6-hd',
          voice_id: voiceId,
          speed: config.speed ?? 1.0,
          pitch: config.pitch ?? 0,
          volume: config.volume ?? 0,
          audio_sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[MiniMaxSpeech] TTS error:', error);
        return null;
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('[MiniMaxSpeech] TTS request failed:', error);
      return null;
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('[MiniMaxSpeech] No API key, returning null');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'speech-01-er');
      formData.append('language', 'en');
      formData.append('format', 'webm');

      const response = await fetch(`${this.baseUrl}/asr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[MiniMaxSpeech] STT error:', error);
        return null;
      }

      const data = (await response.json()) as {
        text?: string;
      };

      return data.text || null;
    } catch (error) {
      console.error('[MiniMaxSpeech] STT request failed:', error);
      return null;
    }
  }

  async speechToText(base64Audio: string): Promise<string> {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/webm' });
      
      const result = await this.transcribeAudio(audioBlob);
      return result || '';
    } catch (error) {
      console.error('[MiniMaxSpeech] speechToText error:', error);
      return '';
    }
  }

  async textToSpeech(
    text: string,
    options?: { voice?: string; speed?: number }
  ): Promise<string | null> {
    const agentId: AgentId = options?.voice?.includes('francisca') ? 'francisca' 
      : options?.voice?.includes('antonia') ? 'antonia' 
      : 'leopoldo';
    
    const result = await this.generateSpeech(text, agentId, {
      speed: options?.speed,
    });
    
    if (result) {
      return `data:audio/mp3;base64,${Buffer.from(result).toString('base64')}`;
    }
    return null;
  }

  async processAudioMessage(
    audioBlob: Blob,
    _agent: AgentId,
    _conversationHistory: Array<{ role: string; content: string }>
  ): Promise<{
    transcription: string;
    response: string;
    audioBlob: Blob | null;
  }> {
    const transcription = await this.transcribeAudio(audioBlob);
    
    if (!transcription) {
      return {
        transcription: '',
        response: "I didn't catch that. Could you try again?",
        audioBlob: null,
      };
    }

    return {
      transcription,
      response: `I heard you say: "${transcription}". How can I help you with that?`,
      audioBlob: null,
    };
  }
}

export const miniMaxSpeechProvider = new MiniMaxSpeechProvider();

// Backward compatibility alias
export const MiniMaxSpeechClient = MiniMaxSpeechProvider;
