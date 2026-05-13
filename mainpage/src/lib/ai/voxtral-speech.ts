const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'voxtral-mini-latest';
const REQUEST_TIMEOUT_MS = 30000;

class VoxtralSpeechProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    this.model = process.env.VOXTRAL_STT_MODEL || DEFAULT_MODEL;
  }

  async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    if (!this.apiKey) {
      console.error('[Voxtral STT] MISTRAL_API_KEY is not configured');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', this.model);
      // No language specified — let Voxtral auto-detect the spoken language

      console.log(`[Voxtral STT] Transcribing with model: ${this.model}`);

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
        const errorText = await response.text();
        console.error(`[Voxtral STT] API error ${response.status}: ${errorText}`);
        return null;
      }

      const data = (await response.json()) as { text?: string };
      console.log(`[Voxtral STT] Transcription result: "${data.text?.substring(0, 100)}"`);
      return data.text || null;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Voxtral STT] Request timed out after', REQUEST_TIMEOUT_MS, 'ms');
      } else {
        console.error('[Voxtral STT] Transcription failed:', error);
      }
      return null;
    }
  }
}

export const voxtralSpeechProvider = new VoxtralSpeechProvider();
