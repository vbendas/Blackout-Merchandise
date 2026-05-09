import { mistralClient } from './mistral-client';

const ROUTER_SYSTEM_PROMPT = `You are an intelligent routing system for a merchandise platform called MerchFrom.

Your job is to analyze user messages and route them to the appropriate AI agent:
- Leopoldo: Business, pricing, onboarding, waitlist, bulk orders, store setup
- Francisca: Design, artwork, catalog, print quality, mockups, product creation
- Antônia: Tracking, shipping, returns, support, order issues

You must respond with valid JSON only. No markdown, no explanations outside JSON.`;

export class RouterProvider {
  async route(routingPrompt: string): Promise<string> {
    const response = await mistralClient.chat({
      messages: [
        { role: 'system', content: ROUTER_SYSTEM_PROMPT },
        { role: 'user', content: routingPrompt },
      ],
      temperature: 0.2,
      maxTokens: 400,
    });
    return response.content;
  }
}

export const routerProvider = new RouterProvider();
