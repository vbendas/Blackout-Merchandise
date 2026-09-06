import type { Card, Chip } from '@/lib/ui-cards/schemas';

const PLACEHOLDER = (label: string) => `https://placehold.co/400x400/221f1c/ede4dd?text=${encodeURIComponent(label)}`;

export const catalogueChips: Chip[] = [
  { label: 'Name my shop', prompt: 'Name my shop' },
  { label: 'Browse blanks', prompt: 'Show me blanks' },
  { label: 'Bulk order', prompt: 'Start a bulk order' },
];

export function storeCard(published: boolean, stripeReady: boolean): Card {
  return {
    id: 'card-store',
    kind: 'store',
    storeId: 'store_1',
    name: published ? 'Your Shop' : 'Unnamed shop',
    slug: 'your-shop',
    url: 'https://your-shop.merchfrom.com',
    isPublished: published,
    stripeReady,
    liveProducts: published ? 1 : 0,
    actions: [{ label: 'Open storefront', href: 'https://merchfrom.com' }],
  };
}

export function blankGridCard(): Card {
  return {
    id: 'card-blank-grid',
    kind: 'blank_grid',
    title: 'Popular blanks',
    items: [
      { code: 'BL-104', name: 'Heavyweight Tee', imageUrl: PLACEHOLDER('BL-104'), fromPriceCents: 1200 },
      { code: 'BL-210', name: 'Crewneck Sweatshirt', imageUrl: PLACEHOLDER('BL-210'), fromPriceCents: 2400 },
      { code: 'BL-330', name: 'Canvas Tote', imageUrl: PLACEHOLDER('BL-330'), fromPriceCents: 900 },
      { code: 'BL-415', name: 'Snapback Cap', imageUrl: PLACEHOLDER('BL-415'), fromPriceCents: 1400 },
    ],
    total: 42,
  };
}

export function blankCard(): Card {
  return {
    id: 'card-blank',
    kind: 'blank',
    code: 'BL-104',
    name: 'Heavyweight Tee',
    description:
      '240gsm combed cotton, boxy fit, tearaway label. Our best-seller for screen and DTG alike. Runs true to size with a relaxed shoulder.',
    imageUrl: PLACEHOLDER('BL-104'),
    type: 'T-shirt',
    fit: 'Boxy',
    composition: '100% combed cotton',
    weightGsm: 240,
    colours: [
      { code: 'BLK', name: 'Black', hex: '#161412' },
      { code: 'WHT', name: 'White', hex: '#ede4dd' },
      { code: 'CLY', name: 'Clay', hex: '#a9633f' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    printServices: ['Screen print', 'DTG', 'Embroidery'],
    fromPriceCents: 1200,
    expandable: true,
    actions: [{ label: 'Use this blank', prompt: 'Use BL-104 for my product' }],
  };
}

export function productProjectState() {
  return {
    imageUrl: PLACEHOLDER('BL-104'),
    name: 'Heavyweight Tee',
    code: 'BL-104',
    colours: [
      { code: 'BLK', name: 'Black', hex: '#161412' },
      { code: 'WHT', name: 'White', hex: '#ede4dd' },
      { code: 'CLY', name: 'Clay', hex: '#a9633f' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    printService: 'Screen print',
    baseCostCents: 1200,
    retailCents: 2800,
    status: 'Drafting',
    actions: [{ label: 'Price it', prompt: 'Price it' }],
  };
}

export function inboxCard(): Card {
  return {
    id: 'card-inbox',
    kind: 'inbox',
    title: 'Inbox',
    items: [
      {
        id: 'msg1',
        at: '2 hours ago',
        text: 'Your Stripe application needs one more document.',
        unread: true,
        prompt: 'Show me the Stripe requirement',
      },
      { id: 'msg2', at: 'Yesterday', text: 'Proof approved for Heavyweight Tee.', unread: false },
      { id: 'msg3', at: '3 days ago', text: 'Welcome to MerchFrom.', unread: false },
    ],
  };
}

export function menuCard(): Card {
  return {
    id: 'card-menu',
    kind: 'menu',
    title: 'What can I do',
    sections: [
      {
        title: 'Design',
        chips: [
          { label: 'Upload artwork', prompt: 'I want to upload my own artwork' },
          { label: 'Generate a design', prompt: 'Generate a design for me' },
        ],
      },
      {
        title: 'Store',
        chips: [
          { label: 'Name my shop', prompt: 'Name my shop' },
          { label: 'Set up Stripe', prompt: 'Set up Stripe' },
        ],
      },
      {
        title: 'Orders',
        chips: [
          { label: 'Bulk order', prompt: 'Start a bulk order' },
          { label: 'Sales this month', prompt: 'How are sales this month?' },
        ],
      },
    ],
  };
}

export function noticeCard(tone: 'info' | 'success' | 'warning' | 'error', text: string): Card {
  return { id: `card-notice-${tone}`, kind: 'notice', tone, text };
}

export function bulkOrderState() {
  return {
    lines: [
      { label: 'Heavyweight Tee — Black — M', qty: 24, priceCents: 1200 * 24 },
      { label: 'Heavyweight Tee — Black — L', qty: 24, priceCents: 1200 * 24 },
    ],
    totalCents: 1200 * 24 * 2,
    status: 'Draft',
    actions: [{ label: 'Send to production', prompt: 'Send my bulk order to production' }],
  };
}
