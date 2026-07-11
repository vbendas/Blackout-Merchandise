/**
 * Demo Mode — Predictable scripted responses for crowdfunding video recording.
 *
 * When DEMO_MODE=true, the chat uses scripted conversation flows instead of
 * calling the Mistral API. This ensures predictable, polished responses for
 * video recording without requiring an API key.
 *
 * Each agent has a sequence of responses that fire based on message count.
 * Quick actions trigger specific scripted responses.
 */

import type { AgentId } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';

export interface DemoResponse {
  content: string;
  /** Optional delay in ms to simulate thinking */
  delay?: number;
  /** Optional card data to attach */
  cardData?: unknown;
  /** Optional agent to hand off to */
  handoffTo?: AgentId;
  /** Optional follow-up that auto-sends after this response */
  followUp?: string;
}

export interface DemoConversationFlow {
  /** Greeting when chat first opens */
  greeting: string;
  /** Ordered responses — index based on message count */
  responses: DemoResponse[];
  /** Keyword-triggered responses (overrides sequential) */
  keywordTriggers: Record<string, DemoResponse>;
  /** Fallback when no keyword match and past sequential responses */
  fallback: string;
}

/**
 * Leopoldo — Store Manager demo flow
 */
const leopoldoDemoFlow: DemoConversationFlow = {
  greeting:
    "Oi! Welcome to MerchFrom — I'm Leopoldo, your Store Manager. I'll help you set up your merch store, handle pricing, and get you selling. What brings you here today?",
  responses: [
    {
      content:
        "Great choice! Setting up your store is simple — we handle everything from production to shipping. You focus on the art, we handle the rest.\n\nFirst, let me ask: what kind of products are you thinking about? T-shirts, hoodies, accessories — or a mix?",
      delay: 800,
    },
    {
      content:
        "Perfect — our premium t-shirts and hoodies are our most popular items. We use 100% organic cotton blanks, 220 GSM weight, and our printing quality is museum-grade.\n\nThe best part? **Zero upfront cost.** You only pay when products sell. I'll set up your store with our standard 50/50 revenue split. Sound fair?",
      delay: 1200,
    },
    {
      content:
        "Your store will be live within 24 hours. I'll set up:\n\n• **Product catalog** with your designs\n• **Pricing** optimized for your market\n• **Shipping** from our Portugal facility (7-14 days EU)\n• **Payments** via Stripe Connect — weekly payouts\n\nWant me to hand you over to Francisca? She can start creating your first design right now.",
      delay: 1500,
    },
    {
      content:
        "I'll get everything set up on my end. In the meantime, Francisca will take great care of your designs. She's the best Art Director in the business.\n\nAny questions about store setup, pricing, or orders — I'm always here. Oi! 🐱",
      delay: 800,
      handoffTo: 'francisca',
    },
  ],
  keywordTriggers: {
    pricing: {
      content:
        "Our pricing is transparent and artist-first:\n\n• **Base cost**: €8-15 per item (depending on product)\n• **You set the retail price** — most artists charge 3-5x base\n• **Revenue split**: 50/50 (we handle production, shipping, returns)\n• **No minimums** — print-on-demand, zero inventory risk\n\nExample: You design a t-shirt. Base cost is €10. You price it at €35. You earn €12.50 per sale. Sell 100/month = €1,250/month passive income.",
      delay: 1000,
    },
    bulk: {
      content:
        "Bulk orders are my specialty! For orders of 50+ units, we offer:\n\n• **15-30% discount** on base costs\n• **Priority production** (5-7 business days)\n• **Dedicated quality check** — every single item inspected\n• **Custom packaging** available\n\nWant a quote? Just tell me: what product, how many units, and when you need them.",
      delay: 800,
    },
    shipping: {
      content:
        "We ship from our own facility in Castelo Branco, Portugal:\n\n• **EU orders**: 7-14 business days\n• **UK orders**: 10-18 business days\n• **US/International**: 14-21 business days\n• **Express available** for rush orders\n\nAll shipments are tracked, and we handle returns internally. Zero headaches for you.",
      delay: 800,
    },
  },
  fallback:
    "That's a great question! Let me look into that for you. In the meantime, would you like to hear about our pricing, shipping, or store setup process?",
};

/**
 * Francisca — Art Director demo flow
 */
const franciscaDemoFlow: DemoConversationFlow = {
  greeting:
    "Olá! I'm Francisca, your Art Director. I'll help you create stunning designs, choose the right products, and build a catalog that sells. What are we creating today?",
  responses: [
    {
      content:
        "Love it! Let me show you what's possible. We support multiple art styles — from traditional tattoo flash to Japanese, blackwork, vintage 90's, realism, and dark art.\n\nDo you have a specific style in mind, or would you like to see some examples?",
      delay: 1000,
    },
    {
      content:
        "Excellent taste! Here's what I'll do — I'll generate a custom design in that style, optimized for screen printing. Our AI can create production-ready artwork in under 10 seconds.\n\nBefore I start, do you have any reference images or a brand aesthetic I should follow?",
      delay: 1200,
    },
    {
      content:
        "I'm creating your design now. Here's what makes our output special:\n\n• **AI-enhanced** with style-specific LoRAs (trained on expert-curated data)\n• **Print-optimized** — automatic color separation for screen printing\n• **Multiple variations** — we'll iterate until it's perfect\n\nGenerating your design... ✨",
      delay: 1500,
    },
    {
      content:
        "Here's your design! What do you think? I can:\n\n• **Adjust colors** or add more detail\n• **Change the composition** — move elements around\n• **Try a different style** — American Traditional, Japanese, etc.\n• **Apply it to a product** — see it on a t-shirt, hoodie, or tote\n\nJust tell me what you'd like to change!",
      delay: 800,
    },
  ],
  keywordTriggers: {
    design: {
      content:
        "I'd love to create something for you! Tell me:\n\n1. **What** — the subject or theme (skull, rose, dragon, logo, etc.)\n2. **Style** — American Traditional, Japanese, Blackwork, Vintage 90's, Realism, or Dark Art\n3. **Product** — t-shirt, hoodie, tote, poster, sticker?\n\nOr I can surprise you with something in our most popular style! 🎨",
      delay: 800,
    },
    mockup: {
      content:
        "Let me generate a mockup! Our mockup system uses real photography from our Portugal facility — not generic mockup templates.\n\nEvery mockup shows:\n• Accurate print size and placement\n• Real fabric texture and color\n• Production quality preview\n\nWhich product would you like to see your design on?",
      delay: 800,
    },
    style: {
      content:
        "We currently offer 6 signature styles, each with its own AI model:\n\n🎨 **American Traditional** — Bold lines, limited palette, classic flash\n🌸 **Japanese** — Irezumi-inspired, flowing compositions\n🖤 **Blackwork** — High-contrast, geometric and dotwork\n📻 **Vintage 90's** — Retro graphics, distressed textures\n🖼️ **Realism** — Photorealistic detail, gradients\n🌑 **Dark Art** — Gothic, surreal, atmospheric\n\nWhich one speaks to you?",
      delay: 1000,
    },
    catalog: {
      content:
        "Let me show you our catalog! We have premium blanks from Stanley/Stella and Gildan:\n\n• **Stanley/Stella Hypster Tee** — 100% Organic Cotton, 180 GSM — €12.00 base\n• **Stanley/Stella Iconic Hoodie** — 330 GSM heavyweight — €28.00 base\n• **Stanley/Stella Jogger Pants** — 310 GSM, tapered fit — €22.00 base\n• **Gildan Heavy Cotton Tee** — 203 GSM, classic fit — €8.00 base\n\nAll organic, vegan-friendly, and ethically produced. Which product interests you?",
      delay: 1000,
    },
    'show me': {
      content:
        "Here's what I found in our catalog:\n\n• **Stanley/Stella Hypster Tee** — 100% Organic Cotton, relaxed fit — €12.00\n• **Stanley/Stella Iconic Hoodie** — Heavyweight 330 GSM — €28.00\n• **Stanley/Stella Jogger Pants** — Tapered fit, elastic cuffs — €22.00\n• **Gildan Heavy Cotton Tee** — Great value — €8.00\n\nWant me to show you a design on any of these? I can generate a mockup instantly!",
      delay: 1000,
    },
    't-shirt': {
      content:
        "Great choice! Our t-shirt selection:\n\n👕 **Stanley/Stella Hypster** — 100% Organic Cotton, 180 GSM, relaxed fit — €12.00 base\n👕 **Stanley/Stella Creator Tank** — Organic Cotton, 165 GSM — €9.00 base\n👕 **Gildan Heavy Cotton** — 203 GSM, pre-shrunk — €8.00 base\n\nAll are screen-print ready with excellent print surfaces. Want me to apply a design to one?",
      delay: 1000,
    },
    hoodie: {
      content:
        "Our hoodies are premium quality:\n\n🧥 **Stanley/Stella Iconic Hoodie** — 80% Organic Cotton / 20% Recycled Polyester, 330 GSM. Kangaroo pocket, double-lined hood. — €28.00 base\n\nThis is our most popular item — the heavyweight feel and organic cotton make it a premium canvas for bold designs. Want to see a mockup?",
      delay: 1000,
    },
    products: {
      content:
        "Here's our current product lineup:\n\n👕 **T-Shirts**: Organic cotton and classic cotton options (€8-12 base)\n🧥 **Hoodies**: Heavyweight organic cotton blend (€28 base)\n👖 **Pants**: Jogger style, tapered fit (€22 base)\n\nAll blanks are vegan-certified, ethically sourced, and optimized for screen printing. What would you like to explore?",
      delay: 1000,
    },
    search: {
      content:
        "I can search our entire catalog for you! We have:\n\n• **T-Shirts** — from €8.00 (Gildan) to €12.00 (Stanley/Stella organic)\n• **Hoodies** — €28.00 (heavyweight organic blend)\n• **Joggers** — €22.00 (organic cotton blend)\n\nJust tell me what you're looking for — style, material, price range — and I'll find the perfect blank!",
      delay: 800,
    },
    find: {
      content:
        "What are you looking for? I can search by:\n\n• **Product type** — t-shirt, hoodie, pants\n• **Material** — organic cotton, recycled, blend\n• **Brand** — Stanley/Stella, Gildan\n• **Price range** — budget to premium\n\nOr just describe what you need and I'll find it!",
      delay: 600,
    },
    blank: {
      content:
        "Our blank garments are sourced from the best suppliers:\n\n• **Stanley/Stella** — 100% organic cotton, EU-based, GOTS certified\n• **Gildan** — Classic cotton, great value for bulk orders\n\nAll blanks are pre-washed, pre-shrunk, and ready for print. Want to browse the full catalog?",
      delay: 800,
    },
  },
  fallback:
    "Hmm, interesting! Let me think about that from a design perspective. Would you like to explore a specific art style, or should I show you our product catalog?",
};

/**
 * Antônia — Operations Lead demo flow
 */
const antoniaDemoFlow: DemoConversationFlow = {
  greeting:
    "Hey there! I'm Antônia, your Operations & Support specialist. I handle order tracking, shipping questions, and any issues that come up. What's the craic? How can I help?",
  responses: [
    {
      content:
        "No worries, I'll track that down for you right away! Our production facility in Portugal handles all orders with a zero-defect quality standard.\n\nCan you share your order number? Or if it's a general question, fire away!",
      delay: 800,
    },
    {
      content:
        "Got it! Here's the latest on that:\n\n• **Production**: Complete — all items passed quality check ✅\n• **Shipping**: Packed and dispatched from Portugal\n• **Tracking**: Your tracking link is active now\n• **ETA**: 7-10 business days within the EU\n\nIs there anything else about the order you'd like to know?",
      delay: 1200,
    },
    {
      content:
        "Absolutely! Our return policy is simple and painless:\n\n• **30-day returns** for any quality issues\n• **Free replacement** for printing defects\n• **Full refund** if we can't make it right\n• **No questions asked** — we trust our artists and customers\n\nWe inspect every item before shipping, so defects are extremely rare. But if something slips through, I'll personally make sure it's sorted. That's what I'm here for! 🍀",
      delay: 1000,
    },
  ],
  keywordTriggers: {
    order: {
      content:
        "I can check on any order for you! Just provide:\n\n• Order number (starts with MF-)\n• Or the email used for the order\n\nI'll pull up the full status including production, shipping, and delivery updates.",
      delay: 600,
    },
    return: {
      content:
        "Our return process is hassle-free:\n\n1. **Contact me** — describe the issue\n2. **Send photos** — I'll assess within 24 hours\n3. **Resolution** — replacement, refund, or credit (your choice)\n\nWe stand behind every product. Quality is our reputation! 🍀",
      delay: 800,
    },
    problem: {
      content:
        "I'm sorry to hear that! Let me help resolve this right away. Can you tell me:\n\n1. What happened?\n2. When did you notice the issue?\n3. Do you have photos?\n\nI'll make sure this gets sorted — every issue is a chance for us to prove we care. That's the MerchFrom way! 💪",
      delay: 800,
    },
  },
  fallback:
    "Good question! Let me look into that for you. In the meantime, is there anything specific about orders, shipping, or returns I can help with?",
};

const DEMO_FLOWS: Record<AgentId, DemoConversationFlow> = {
  leopoldo: leopoldoDemoFlow,
  francisca: franciscaDemoFlow,
  antonia: antoniaDemoFlow,
};

/**
 * Get the demo greeting for a given agent.
 */
export function getDemoGreeting(agent: AgentId): string {
  return DEMO_FLOWS[agent].greeting;
}

/**
 * Get a scripted demo response based on user input and conversation position.
 *
 * Priority:
 * 1. Keyword triggers (e.g., "pricing", "design", "order")
 * 2. Sequential responses (based on message count for this agent)
 * 3. Fallback response
 */
export function getDemoResponse(
  agent: AgentId,
  userMessage: string,
  messageCount: number
): DemoResponse {
  const flow = DEMO_FLOWS[agent];

  // Check keyword triggers first
  const lowerMessage = userMessage.toLowerCase();
  for (const [keyword, response] of Object.entries(flow.keywordTriggers)) {
    if (lowerMessage.includes(keyword)) {
      return response;
    }
  }

  // Sequential responses
  if (messageCount < flow.responses.length) {
    return flow.responses[messageCount];
  }

  // Fallback
  return {
    content: flow.fallback,
    delay: 500,
  };
}

/**
 * Check if demo mode is active.
 * Set DEMO_MODE=true in .env.local for scripted responses.
 */
export function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    // Client-side: check window env
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  }
  return process.env.DEMO_MODE === 'true';
}

/**
 * Get all agent configs with demo greetings.
 */
export function getDemoAgentGreetings(): Record<AgentId, string> {
  const greetings: Record<AgentId, string> = {} as Record<AgentId, string>;
  for (const [id, flow] of Object.entries(DEMO_FLOWS)) {
    greetings[id as AgentId] = flow.greeting;
  }
  return greetings;
}
