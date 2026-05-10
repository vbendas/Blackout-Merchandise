const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'voxtral';
const REQUEST_TIMEOUT_MS = 30000;

class VoxtralSpeechProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    this.model = process.env.VOXTRAL_STT_MODEL || DEFAULT_MODEL;
  }

  async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', this.model);
      formData.append('language', 'en');
      formData.append('response_format', 'json');

      const response = await fetch(`${MISTRAL_BASE_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Voxtral STT error ${response.status}: ${await response.text()}`);
        return null;
      }

      const data = (await response.json()) as { text?: string };
      return data.text || null;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Voxtral STT transcription failed:', error);
      return null;
    }
  }
}

export const voxtralSpeechProvider = new VoxtralSpeechProvider();
