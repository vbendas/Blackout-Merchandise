import type { PublicStore } from '@/lib/storefront/read-model';
import { safeExternalUrl } from '@/lib/storefront/present';

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  x: 'X',
  youtube: 'YouTube',
  website: 'Website',
};

export function Footer({ store }: { store: PublicStore }) {
  const socials = Object.entries(store.socials ?? {}).flatMap(([key, value]) => {
    const href = safeExternalUrl(value);
    return href ? [{ key, href }] : [];
  });

  return (
    <footer className="sf-footer">
      <div className="sf-wrap sf-footer-in">
        <p className="mf-label mf-dim">Merch by Blackout Merchandise · printed in Barcelona</p>

        {socials.length > 0 && (
          <ul role="list" className="sf-socials">
            {socials.map(({ key, href }) => (
              <li key={key}>
                <a href={href} target="_blank" rel="noreferrer" className="mf-label hover:opacity-80">
                  {SOCIAL_LABELS[key.toLowerCase()] ?? key}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
