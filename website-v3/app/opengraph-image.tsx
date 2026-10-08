import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'MerchFrom — Premium merchandise for artists.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Fonts and the pre-screened halftone live in scripts/fonts (no network at
// build). The halftone is produced by scripts/gen-og-halftone.mjs.
const dir = join(process.cwd(), 'scripts/fonts');
const condensed = await readFile(join(dir, 'BarlowCondensed-Bold.ttf'));
const mono = await readFile(join(dir, 'IBMPlexMono-Medium.ttf'));
const halftone = await readFile(join(dir, 'og-halftone.png'));
const halftoneSrc = `data:image/png;base64,${halftone.toString('base64')}`;

const BONE = '#ede4dd';
const GROUND = '#141414';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: GROUND,
          color: BONE,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={halftoneSrc}
          alt=""
          width={540}
          height={390}
          style={{ position: 'absolute', top: 0, right: 0, width: 540, height: 390, objectFit: 'cover', objectPosition: 'top' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 60,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Plex',
            fontSize: 22,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            lineHeight: 1.6,
            opacity: 0.8,
          }}
        >
          <span>Premium merchandise</span>
          <span>for artists.</span>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 60,
            right: 60,
            bottom: 24,
            display: 'flex',
            justifyContent: 'center',
            fontFamily: 'Condensed',
            fontWeight: 700,
            fontSize: 253,
            lineHeight: 1,
            letterSpacing: '0.005em',
            whiteSpace: 'nowrap',
          }}
        >
          MERCHFROM
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Condensed', data: condensed, weight: 700, style: 'normal' },
        { name: 'Plex', data: mono, weight: 500, style: 'normal' },
      ],
    },
  );
}
