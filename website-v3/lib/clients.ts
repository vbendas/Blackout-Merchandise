export type ViewMode = 'list' | 'grid' | 'gallery';

export interface ShowcaseClient {
  /** Display name, rendered uppercase in the List stack */
  name: string;
  /** Short category shown in Grid captions, e.g. "Tour merch" */
  category: string;
  /** Merch photos for this client (hover cluster, grid card, gallery thumbs) */
  images: string[];
}

// PLACEHOLDER ROSTER — fictional brand names from the v2 gallery pieces,
// standing in until the real print-shop client list arrives. Swapping a
// client is editing one entry here; every view reads from this array.
export const CLIENTS: ShowcaseClient[] = [
  { name: 'Hellslain', category: 'Tour merch', images: ['/gallery/2a.png', '/gallery/2b.png'] },
  { name: 'Harterize', category: 'Tees', images: ['/gallery/4a.png', '/gallery/4b.png'] },
  { name: 'Yujin', category: 'Tour merch', images: ['/gallery/3a.png', '/gallery/3b.png'] },
  { name: 'Iron Legacy', category: 'Tees', images: ['/gallery/9a.png', '/gallery/9b.png'] },
  { name: 'Void', category: 'Outerwear', images: ['/gallery/7a.png', '/gallery/7b.png'] },
  { name: 'The Abysmalker', category: 'Tees', images: ['/gallery/1a.png', '/gallery/1b.png'] },
  { name: 'Game Over', category: 'Drop', images: ['/gallery/11a.png', '/gallery/11b.png'] },
  { name: 'Doing My Best Club', category: 'Tees', images: ['/gallery/12a.png', '/gallery/12b.png'] },
  { name: 'Feel Like Shit', category: 'Fleece', images: ['/gallery/5a.png', '/gallery/5b.png'] },
  { name: 'Metallica', category: 'Tour merch', images: ['/gallery/6a.png', '/gallery/6b.png'] },
  { name: 'Snakebite', category: 'Flash', images: ['/gallery/8a.png', '/gallery/8b.png'] },
  { name: 'Nightshift', category: 'Outerwear', images: ['/gallery/10a.png', '/gallery/10b.png'] },
];
