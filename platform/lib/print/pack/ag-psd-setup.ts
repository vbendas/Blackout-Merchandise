// ag-psd reads and writes image data in Node only after initializeCanvas. The
// pack never draws on a canvas: layers go in as raw channels and come out as
// plain image data, so createCanvas just refuses.
import { initializeCanvas } from 'ag-psd';

let ready = false;

export function ensureAgPsd(): void {
  if (ready) return;
  initializeCanvas(
    () => {
      throw new Error('ag-psd needs no canvas in the print pack; pass raw image data instead');
    },
    (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4), colorSpace: 'srgb' }) as unknown as ImageData,
  );
  ready = true;
}
