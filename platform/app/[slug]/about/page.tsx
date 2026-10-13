import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPublicStore } from '@/lib/storefront/read-model';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStore(slug);
  return store ? { title: `About ${store.name}` } : {};
}

// The shop's bio and banner. The header only links here when there is
// something to show; a direct visit to an empty About goes to the shop.
export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const store = await getPublicStore(slug);
  if (!store) notFound();

  const about = store.about?.trim();
  if (!about && !store.bannerUrl) redirect(`/${slug}`);

  return (
    <div className="pb-6 pt-8">
      {store.bannerUrl && (
        <div className="sf-banner mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={store.bannerUrl} alt={store.name} />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
        <h1 className="sf-title">About</h1>
        {about && <p className="max-w-[60ch] whitespace-pre-line text-base leading-relaxed">{about}</p>}
      </div>
    </div>
  );
}
