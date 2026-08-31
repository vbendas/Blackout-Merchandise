import Image from 'next/image';
import { CLIENTS } from '@/lib/clients';

const ASPECTS = ['4/5', '1/1', '3/4'];

export function GridView() {
  return (
    <div
      className="grid grid-cols-1 gap-x-6 gap-y-16 md:grid-cols-2 lg:grid-cols-3"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}
    >
      {CLIENTS.map((client, index) => {
        const aspect = ASPECTS[index % ASPECTS.length];
        const [primary, secondary] = client.images;

        return (
          <div key={client.name} className="group">
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: aspect }}
            >
              <Image
                src={primary}
                alt={`${client.name} merch`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-opacity duration-[400ms] ease-out group-hover:opacity-0"
              />
              {secondary && (
                <Image
                  src={secondary}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover opacity-0 transition-opacity duration-[400ms] ease-out group-hover:opacity-100"
                />
              )}
            </div>
            <p
              className="text-center"
              style={{ marginTop: '14px', fontSize: '14px' }}
            >
              <span className="font-bold group-hover:underline">
                {client.name}
              </span>
              <span
                style={{
                  color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
                }}
              >
                {' / '}
                {client.category}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
