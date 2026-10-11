export interface StudioSession {
  id: string;
  title: string; // never empty: falls back to "Untitled session"
  collectionId: string | null;
  lastActivityAt: string; // ISO
}

export interface StudioCollection {
  id: string;
  name: string;
  productCount: number;
}

export interface StudioSidebarData {
  collections: StudioCollection[]; // [] for admins / users without a store
  sessions: StudioSession[]; // only sessions with at least one message
}
