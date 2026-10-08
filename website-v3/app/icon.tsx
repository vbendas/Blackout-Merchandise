import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

const condensed = await readFile(join(process.cwd(), 'scripts/fonts/BarlowCondensed-Bold.ttf'));

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#141414',
          color: '#ede4dd',
          fontFamily: 'Condensed',
          fontWeight: 700,
          fontSize: 470,
          lineHeight: 1,
          paddingTop: 10,
        }}
      >
        M
      </div>
    ),
    { ...size, fonts: [{ name: 'Condensed', data: condensed, weight: 700, style: 'normal' }] },
  );
}
