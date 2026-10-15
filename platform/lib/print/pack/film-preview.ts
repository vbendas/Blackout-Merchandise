// A small black-on-white picture of one film for the admin pages. Downsampled
// from the film itself (Plan 4.1: previews come from the print-size render),
// so halftones read as tone.
import sharp from 'sharp';
import type { InkPlate, PlateLabelInfo } from '@/lib/print/types';
import { plateInkLabel } from './names';
import { encodePng } from './png';

export async function renderFilmPreviewPng(plate: InkPlate, label: PlateLabelInfo, heightPx = 720): Promise<Buffer> {
  const { width: W, height: H, data } = plate.plate;
  if (!(W > 0 && H > 0) || data.length !== W * H) throw new Error(`film ${plate.index} has no pixels`);
  const h = Math.max(16, Math.min(Math.round(heightPx), H));
  const w = Math.max(1, Math.round((W * h) / H));
  // No pixel limit: a film is as big as the print (sharp's default refuses past 268M px, a PSB-size canvas).
  const { data: small, info } = await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width: W, height: H, channels: 1 }, limitInputPixels: false })
    .negate({ alpha: false })
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .toColourspace('b-w')
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error('film preview is not a single grey channel');
  return encodePng({
    width: info.width,
    height: info.height,
    channels: 1,
    data: new Uint8Array(small.buffer, small.byteOffset, small.byteLength),
    text: { Title: `${label.designCode} v${label.version} · ${label.placementLabel} · film ${plate.index} · ${plateInkLabel(plate)}` },
  });
}
