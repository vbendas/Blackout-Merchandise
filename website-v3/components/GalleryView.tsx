import Image from 'next/image';
import { CLIENTS } from '@/lib/clients';

interface FlatImage {
  src: string;
  clientName: string;
}

// One thumbnail per piece, not per photo — each client's images are the
// same garment shot twice (packshot + worn), so flattening both produced
// back-to-back duplicates. The contact sheet shows the primary shot only.
function flattenImages(): FlatImage[] {
  return CLIENTS.map((client) => ({ src: client.images[0], clientName: client.name }));
}

export function GalleryView() {
  const images = flattenImages();

  return (
    <div
      className="grid grid-cols-2 gap-x-12 gap-y-24 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      style={{
        paddingLeft: 'var(--gutter)',
        paddingRight: 'var(--gutter)',
        paddingTop: '48px',
        paddingBottom: '48px',
      }}
    >
      {images.map((image, index) => (
        <div key={`${image.src}-${index}`} className="flex flex-col items-center">
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: '4/5',
              height: '180px',
              maxHeight: '180px',
              width: 'auto',
              maxWidth: '100%',
            }}
          >
            <Image
              src={image.src}
              alt={`${image.clientName} merch`}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition-transform duration-300 ease-out hover:scale-[1.02]"
            />
          </div>
          <p
            className="text-center"
            style={{ marginTop: '12px', fontSize: '13px', letterSpacing: '0.06em' }}
          >
            {String(index + 1).padStart(3, '0')}
          </p>
        </div>
      ))}
    </div>
  );
}
