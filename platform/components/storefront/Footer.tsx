import type { PublicStore } from '@/lib/storefront/read-model';
import { Hairline } from '@/components/ui/Hairline';

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  x: 'X',
  youtube: 'YouTube',
  website: 'Website',
};

export function Footer({ store }: { store: PublicStore }) {
  const socials = Object.entries(store.socials ?? {}).filter(([, url]) => Boolean(url));

  return (
    <footer className="mt-24">
      <Hairline />
      <div style={{ padding: 'var(--gutter)' }}>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {store.about && <p className="mf-dim max-w-md text-sm leading-relaxed">{store.about}</p>}

          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {socials.map(([key, url]) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noreferrer" className="label hover:opacity-80">
                    {SOCIAL_LABELS[key.toLowerCase()] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="label mf-dim mt-10">Merch by MerchFrom · printed in Barcelona</p>
      </div>
    </footer>
  );
}
