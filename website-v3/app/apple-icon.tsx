import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const condensed = await readFile(join(process.cwd(), 'scripts/fonts/BarlowCondensed-Bold.ttf'));

export default function AppleIcon() {
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
          fontSize: 165,
          lineHeight: 1,
          paddingTop: 4,
        }}
      >
        M
      </div>
    ),
    { ...size, fonts: [{ name: 'Condensed', data: condensed, weight: 700, style: 'normal' }] },
  );
}
