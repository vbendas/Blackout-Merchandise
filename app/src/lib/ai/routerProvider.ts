const ROUTER_SYSTEM_PROMPT = `You are an intelligent routing system for a merchandise platform.

Your job is to analyze user messages and route them to the appropriate AI agent:
- Leopoldo: Business, pricing, onboarding, waitlist, bulk orders
- Francisca: Design, artwork, catalog, print quality, mockups
- Antônia: Tracking, shipping, returns, support, order issues

You must respond with valid JSON only. No markdown, no explanations outside JSON.`;

const ROUTING_TIMEOUT_MS = 950;

export class RouterProvider {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY ?? '';
  }

  async route(routingPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://merchfrom.com',
          'X-Title': 'Merch From Router',
        },
        body: JSON.stringify({
          model: 'minimax/minimax-m2-her',
          messages: [
            { role: 'system', content: ROUTER_SYSTEM_PROMPT },
            { role: 'user', content: routingPrompt },
          ],
          temperature: 0.2,
          max_tokens: 400,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Router API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message: { content: string };
        }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in router response');
      }

      return content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[RouterProvider] Timeout after', ROUTING_TIMEOUT_MS, 'ms');
      }

      throw error;
    }
  }
}

export const routerProvider = new RouterProvider();
