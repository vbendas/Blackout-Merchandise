// Generates the print fixtures for the engine, pack and check tests
// (Documentation/Dev/Print-Prep-Plan.md sections 4 and 5). Run from platform/:
//   npx tsx scripts/fixtures/print/make-fixtures.ts
// Offline: no database, no network. Writes next to this file, and the output is
// the same on every run. Every shape is drawn here (no photos, no third-
// party artwork). The lettering uses the Arial Black system font (macOS), so a
// machine without it renders a fallback: the PNGs committed here are the reference.
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = __dirname;
/** Sized fixtures are made at 300 ppi, so 1 mm is about 11.8 px. */
const PPI = 300;
const PX_PER_MM = PPI / 25.4;
const mm = (value: number): number => value * PX_PER_MM;

interface Fixture {
  file: string;
  svg: string;
  width: number;
  height: number;
}

// --- helpers ---------------------------------------------------------------

/** Deterministic pseudo-random numbers in 0..1, so jagged edges repeat exactly. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** A circle as a path, for even-odd holes. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const vertices: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    vertices.push(`${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `M ${vertices.join(' L ')} Z`;
}

/** A rectangle whose four edges wobble, like torn paper. */
function jaggedRectPath(x: number, y: number, w: number, h: number, amp: number, step: number, rng: () => number): string {
  const points: string[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const count = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const offset = (rng() * 2 - 1) * amp;
      points.push(`${(x0 + (x1 - x0) * t + nx * offset).toFixed(1)} ${(y0 + (y1 - y0) * t + ny * offset).toFixed(1)}`);
    }
  };
  edge(x, y, x + w, y, 0, -1);
  edge(x + w, y, x + w, y + h, 1, 0);
  edge(x + w, y + h, x, y + h, 0, 1);
  edge(x, y + h, x, y, -1, 0);
  return `M ${points.join(' L ')} Z`;
}

/** The colour of `share` of an ink over white, as a flat 50% (or other) tint. */
function tintOf(hex: string, share: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) =>
    Math.round(c * share + 255 * (1 - share)),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function svgDoc(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

// --- fixtures for the engine -----------------------------------------------

/** Three flat colours on transparent, 3000 px wide. */
function flatLogo3c(): Fixture {
  const navy = '#1C2B3A';
  const mustard = '#E0A526';
  const brick = '#B5402A';
  const body = [
    `<path fill="${navy}" fill-rule="evenodd" d="${circlePath(1500, 1000, 900)} ${circlePath(1500, 1000, 820)}"/>`,
    `<circle cx="1500" cy="980" r="470" fill="${mustard}"/>`,
    `<rect x="880" y="1110" width="1240" height="110" fill="${brick}"/>`,
    `<path fill="${navy}" d="${starPath(1500, 1500, 300, 125)}"/>`,
  ].join('');
  return { file: 'flat-logo-3c.png', svg: svgDoc(3000, 2000, body), width: 3000, height: 2000 };
}

/** Bold single-colour lettering on transparent. Arial Black gives real counters (O, A, G). */
function lettering1c(): Fixture {
  const ink = '#1A1A1A';
  const body = [
    `<text x="1200" y="560" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="420" fill="${ink}">LOUD</text>`,
    `<text x="1200" y="930" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="300" fill="${ink}">NIGHT</text>`,
  ].join('');
  return { file: 'lettering-1c.png', svg: svgDoc(2400, 1000, body), width: 2400, height: 1000 };
}

/** Opaque smooth gradients and soft blurred shapes, no hard edges: continuous tone. */
function gradientPhoto(): Fixture {
  const size = 2400;
  const body = [
    '<defs>',
    '<linearGradient id="base" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#1B0B3A"/>',
    '<stop offset="0.35" stop-color="#8E1B6B"/>',
    '<stop offset="0.65" stop-color="#F06A3B"/>',
    '<stop offset="1" stop-color="#FFE6A7"/>',
    '</linearGradient>',
    '<radialGradient id="teal" cx="0.3" cy="0.35" r="0.5">',
    '<stop offset="0" stop-color="#2EC4B6" stop-opacity="0.9"/>',
    '<stop offset="1" stop-color="#2EC4B6" stop-opacity="0"/>',
    '</radialGradient>',
    '<radialGradient id="blue" cx="0.72" cy="0.7" r="0.45">',
    '<stop offset="0" stop-color="#3A86FF" stop-opacity="0.85"/>',
    '<stop offset="1" stop-color="#3A86FF" stop-opacity="0"/>',
    '</radialGradient>',
    '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>',
    '</defs>',
    `<rect width="${size}" height="${size}" fill="url(#base)"/>`,
    '<ellipse cx="800" cy="900" rx="700" ry="520" fill="url(#teal)"/>',
    '<circle cx="1700" cy="1700" r="650" fill="url(#blue)"/>',
    '<circle cx="1400" cy="700" r="260" fill="#FFD166" opacity="0.8" filter="url(#soft)"/>',
  ].join('');
  return { file: 'gradient-photo.png', svg: svgDoc(size, size, body), width: size, height: size };
}

/**
 * Black lines 0.10 to 0.50 mm wide, on a 280 mm wide print (3307 px at 300 ppi).
 * Horizontal and vertical lines in each row, so both directions are tested.
 * Thinner than 0.3 mm (the recipe's minLineMm) should raise the thin-line warning.
 */
function fineLines(): Fixture {
  const widths = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];
  const printWidthMm = 280;
  const printHeightMm = 146;
  const lines: string[] = [];
  widths.forEach((widthMm, row) => {
    const top = 10 + row * 18;
    for (let k = 0; k < 4; k++) {
      const y = mm(top + 3 + k * 3.5);
      lines.push(`<line x1="${mm(10)}" y1="${y}" x2="${mm(180)}" y2="${y}" stroke-width="${mm(widthMm)}"/>`);
      const x = mm(200 + k * 5);
      lines.push(`<line x1="${x}" y1="${mm(top + 2.5)}" x2="${x}" y2="${mm(top + 15.5)}" stroke-width="${mm(widthMm)}"/>`);
    }
  });
  const width = Math.round(mm(printWidthMm));
  const height = Math.round(mm(printHeightMm));
  const body = `<g stroke="#000000" stroke-linecap="butt" fill="none">${lines.join('')}</g>`;
  return { file: 'fine-lines.png', svg: svgDoc(width, height, body), width, height };
}

/** Two inks, each at 100%, as a 50% flat tint, and as a 50% opacity. Transparent. */
function tints2c(): Fixture {
  const inkA = '#0E5A6B';
  const inkB = '#E8572A';
  const cell = 800;
  const cells: [number, number, string, number][] = [
    [0, 0, inkA, 1],
    [1, 0, tintOf(inkA, 0.5), 1],
    [2, 0, inkA, 0.5],
    [0, 1, inkB, 1],
    [1, 1, tintOf(inkB, 0.5), 1],
    [2, 1, inkB, 0.5],
  ];
  const body = cells
    .map(([col, row, fill, opacity]) => {
      const x = col * cell + 60;
      const y = row * cell + 60;
      return `<rect x="${x}" y="${y}" width="680" height="680" rx="40" fill="${fill}" fill-opacity="${opacity}"/>`;
    })
    .join('');
  return { file: 'tints-2c.png', svg: svgDoc(cell * 3, cell * 2, body), width: cell * 3, height: cell * 2 };
}

// --- one simple sample per Style Capsule look -------------------------------

const SAMPLE = 2000;

/** American traditional: four flat colours (red, green, yellow, black) with thick black outlines. */
function americanTraditional(): Fixture {
  const red = '#C8102E';
  const green = '#1E7B4A';
  const yellow = '#F5C518';
  const black = '#141414';
  const outline = `stroke="${black}" stroke-width="56" stroke-linejoin="round"`;
  const body = [
    `<path d="M 260 1180 L 1740 1180 L 1640 1330 L 1740 1480 L 260 1480 L 360 1330 Z" fill="${red}" ${outline}/>`,
    `<path d="M 560 1120 Q 300 900 420 620 Q 620 780 560 1120 Z" fill="${green}" ${outline}/>`,
    `<path d="M 1440 1120 Q 1700 900 1580 620 Q 1380 780 1440 1120 Z" fill="${green}" ${outline}/>`,
    `<path d="${starPath(1000, 760, 330, 135)}" fill="${yellow}" ${outline}/>`,
  ].join('');
  return { file: 'american-traditional.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

/** Blackletter: one black ink, a pointed arch with hairline inner frame, diamond and spires. */
function blackletter(): Fixture {
  const ink = '#111111';
  const body = [
    `<path d="M 420 1820 L 420 880 Q 420 360 1000 170 Q 1580 360 1580 880 L 1580 1820" fill="none" stroke="${ink}" stroke-width="84" stroke-linejoin="miter"/>`,
    `<path d="M 540 1760 L 540 900 Q 540 470 1000 320 Q 1460 470 1460 900 L 1460 1760" fill="none" stroke="${ink}" stroke-width="16"/>`,
    `<polygon points="1000,620 1180,900 1000,1180 820,900" fill="${ink}"/>`,
    `<polygon points="700,1820 760,1560 820,1820" fill="${ink}"/>`,
    `<polygon points="1180,1820 1240,1560 1300,1820" fill="${ink}"/>`,
    `<rect x="340" y="1820" width="1320" height="70" fill="${ink}"/>`,
    `<path d="M 600 1260 Q 1000 1080 1400 1260" fill="none" stroke="${ink}" stroke-width="10"/>`,
  ].join('');
  return { file: 'blackletter.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

/** Woodcut: one black ink, a carved sunrise with bars, a mountain and hatched sky. */
function woodcut(): Fixture {
  const ink = '#111111';
  const bars: string[] = [];
  for (let k = 0; k < 6; k++) {
    const y = 1100 + k * 70;
    bars.push(`<rect x="${520 + k * 14}" y="${y}" width="${960 - k * 28}" height="${22 + k * 4}" fill="${ink}"/>`);
  }
  const hatch: string[] = [];
  for (let x = 60; x < 440; x += 46) hatch.push(`M ${x} 80 L ${x + 200} 280`);
  for (let x = 1560; x < 1940; x += 46) hatch.push(`M ${x} 80 L ${x + 200} 280`);
  const body = [
    `<path d="M 500 1100 A 500 500 0 0 1 1500 1100 Z" fill="${ink}"/>`,
    ...bars,
    `<polygon points="100,1900 700,1420 900,1620 1200,1300 1600,1700 1900,1420 1900,1900" fill="${ink}"/>`,
    `<path d="${hatch.join(' ')}" fill="none" stroke="${ink}" stroke-width="14"/>`,
  ].join('');
  return { file: 'woodcut.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

/** Death-metal logo: one black ink, a serrated arch, a spiked base and blades. No legible letters. */
function deathMetalLogo(): Fixture {
  const ink = '#111111';
  const teeth = 14;
  const outer: string[] = [];
  const inner: string[] = [];
  for (let k = 0; k <= teeth; k++) {
    const angle = Math.PI + (k * Math.PI) / teeth;
    const tip = k % 2 === 0;
    const ro = tip ? 880 : 760;
    const ri = tip ? 640 : 560;
    outer.push(`${(1000 + ro * Math.cos(angle)).toFixed(1)} ${(1150 + ro * Math.sin(angle)).toFixed(1)}`);
    inner.push(`${(1000 + ri * Math.cos(angle)).toFixed(1)} ${(1150 + ri * Math.sin(angle)).toFixed(1)}`);
  }
  const arch = `M ${outer.join(' L ')} L ${inner.reverse().join(' L ')} Z`;
  const body = [
    `<path d="${arch}" fill="${ink}"/>`,
    `<polygon points="180,1300 1820,1300 1900,1360 1820,1420 180,1420 100,1360" fill="${ink}"/>`,
    `<polygon points="300,1420 420,820 540,1420" fill="${ink}"/>`,
    `<polygon points="1460,1420 1580,820 1700,1420" fill="${ink}"/>`,
    `<polygon points="880,1420 1000,330 1120,1420" fill="${ink}"/>`,
  ].join('');
  return { file: 'death-metal-logo.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

/** Riso 2-colour: fluorescent pink and riso blue, flat and never overlapping (no overprint). */
function riso2Colour(): Fixture {
  const pink = '#FF48B0';
  const blue = '#0078BF';
  const body = [
    `<circle cx="640" cy="640" r="460" fill="${pink}"/>`,
    `<path d="M 0 1400 Q 300 1250 620 1400 T 1200 1400 L 1200 2000 L 0 2000 Z" fill="${pink}"/>`,
    `<circle cx="1600" cy="700" r="300" fill="${blue}"/>`,
    `<polygon points="1400,1900 1900,1900 1650,1300" fill="${blue}"/>`,
  ].join('');
  return { file: 'riso-2-colour.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

/** Photocopy zine: one black ink, torn-edged blocks, a white hole cut in the top block. */
function photocopyZine(): Fixture {
  const ink = '#111111';
  const rng = makeRng(20261015);
  const top = jaggedRectPath(200, 200, 1600, 900, 26, 40, rng);
  const hole = circlePath(1000, 650, 300);
  const bar1 = jaggedRectPath(300, 1300, 1400, 180, 18, 36, rng);
  const bar2 = jaggedRectPath(300, 1600, 1000, 120, 16, 30, rng);
  const body = [
    `<path d="${top} ${hole}" fill="${ink}" fill-rule="evenodd"/>`,
    `<path d="${bar1}" fill="${ink}"/>`,
    `<path d="${bar2}" fill="${ink}"/>`,
    `<path d="${starPath(1600, 1700, 170, 70)}" fill="${ink}"/>`,
  ].join('');
  return { file: 'photocopy-zine.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

/** Line tattoo: one single-weight continuous line (no fills), 4 px at 2000 px = 0.56 mm on 280 mm. */
function lineTattoo(): Fixture {
  const ink = '#111111';
  const R = 700;
  const r = 180;
  const d = 260;
  const turns = (r / 20) * 2 * Math.PI; // gcd(700, 180) = 20: the curve closes after this
  const points: string[] = [];
  for (let i = 0; i <= 4000; i++) {
    const t = (i / 4000) * turns;
    const x = 1000 + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = 1000 + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const body = `<path d="M ${points.join(' L ')}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  return { file: 'line-tattoo.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

/** Halftone: a flat yellow disc with black dots that shrink towards the edge, like comic shading. */
function halftone(): Fixture {
  const yellow = '#FFD21F';
  const ink = '#111111';
  const cx = 1000;
  const cy = 1000;
  const R = 880;
  const spacing = 64;
  const cos = Math.cos(Math.PI / 4);
  const sin = Math.sin(Math.PI / 4);
  const dots: string[] = [];
  for (let i = -30; i <= 30; i++) {
    for (let j = -30; j <= 30; j++) {
      const gx = i * spacing;
      const gy = j * spacing;
      const x = cx + gx * cos - gy * sin;
      const y = cy + gx * sin + gy * cos;
      const edge = Math.hypot(x - cx, y - cy) / R;
      if (edge > 1) continue;
      const radius = spacing * 0.48 * (1 - edge * 0.85);
      if (radius < 4) continue;
      dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}"/>`);
    }
  }
  const body = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${yellow}"/><g fill="${ink}">${dots.join('')}</g>`;
  return { file: 'halftone.png', svg: svgDoc(SAMPLE, SAMPLE, body), width: SAMPLE, height: SAMPLE };
}

// --- 28 cm fixtures: index and simulated process -----------------------------

/** 280 mm at 300 ppi is 3307 px. Every fixture in this group is this wide. */
const PRINT_WIDTH_MM = 280;
const WIDE_PX = Math.round(mm(PRINT_WIDTH_MM));

/** A gradient stop: offset, colour, and an optional opacity (default 1). */
type Stop = [offset: number, colour: string, opacity?: number];

function stopsXml(stops: Stop[]): string {
  return stops
    .map(([offset, colour, opacity = 1]) => `<stop offset="${offset}" stop-color="${colour}" stop-opacity="${opacity}"/>`)
    .join('');
}

interface RadialSpec {
  cx: number;
  cy: number;
  r: number;
  fx?: number;
  fy?: number;
}

/** A radial gradient in bounding-box units. The focus (fx, fy) sets where the light falls. */
function radialGradient(id: string, spec: RadialSpec, stops: Stop[]): string {
  const { cx, cy, r, fx = cx, fy = cy } = spec;
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stopsXml(stops)}</radialGradient>`;
}

function linearGradient(id: string, x1: number, y1: number, x2: number, y2: number, stops: Stop[]): string {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml(stops)}</linearGradient>`;
}

/** A closed polygon through the given points. */
function polygonPath(points: [number, number][]): string {
  return `M ${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
}

/** A regular polygon with its first vertex on the right (angle 0). */
function regularPolygon(cx: number, cy: number, r: number, sides: number): [number, number][] {
  return Array.from({ length: sides }, (_, k): [number, number] => {
    const angle = (k * 2 * Math.PI) / sides;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
}

/**
 * Twelve flat colours on transparent, one bold shape each, on a 4 x 3 grid (280 x 210 mm).
 * No overlaps and no gradients: the index-separation target. The only anti-aliasing is on
 * the shape edges.
 */
function manyColoursFlat(): Fixture {
  const width = WIDE_PX;
  const height = Math.round(mm(210));
  const size = 600;
  const h = size / 2;
  const t = h * 0.3;
  const shapes: { colour: string; path: (cx: number, cy: number) => string }[] = [
    { colour: '#E4262C', path: (cx, cy) => circlePath(cx, cy, h) },
    { colour: '#F7941D', path: (cx, cy) => polygonPath([[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]]) },
    { colour: '#FFD400', path: (cx, cy) => polygonPath([[cx, cy - h], [cx + h, cy + h], [cx - h, cy + h]]) },
    { colour: '#9ACD32', path: (cx, cy) => starPath(cx, cy, h, h * 0.42) },
    { colour: '#00843D', path: (cx, cy) => polygonPath([[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]]) },
    { colour: '#009A9A', path: (cx, cy) => polygonPath(regularPolygon(cx, cy, h, 6)) },
    { colour: '#4FC3F7', path: (cx, cy) => `M ${cx - h} ${cy} A ${h} ${h} 0 0 1 ${cx + h} ${cy} Z` },
    { colour: '#1F3FBF', path: (cx, cy) => `M ${cx - h} ${cy + h} L ${cx + h} ${cy + h} A ${size} ${size} 0 0 0 ${cx - h} ${cy - h} Z` },
    { colour: '#151515', path: (cx, cy) => `${circlePath(cx, cy, h)} ${circlePath(cx, cy, h * 0.5)}` },
    {
      colour: '#A855F7',
      path: (cx, cy) =>
        polygonPath([
          [cx - t, cy - h], [cx + t, cy - h], [cx + t, cy - t], [cx + h, cy - t],
          [cx + h, cy + t], [cx + t, cy + t], [cx + t, cy + h], [cx - t, cy + h],
          [cx - t, cy + t], [cx - h, cy + t], [cx - h, cy - t], [cx - t, cy - t],
        ]),
    },
    {
      colour: '#FF5FA2',
      path: (cx, cy) =>
        polygonPath([[cx - h, cy - h / 2], [cx, cy - h / 2], [cx, cy - h], [cx + h, cy], [cx, cy + h], [cx, cy + h / 2], [cx - h, cy + h / 2]]),
    },
    {
      colour: '#6B3A1E',
      path: (cx, cy) => polygonPath([[cx - h + h / 2, cy - h], [cx + h, cy - h], [cx + h - h / 2, cy + h], [cx - h, cy + h]]),
    },
  ];
  const cellW = width / 4;
  const cellH = height / 3;
  const body = shapes
    .map(({ colour, path }, i) => {
      const cx = ((i % 4) + 0.5) * cellW;
      const cy = (Math.floor(i / 4) + 0.5) * cellH;
      return `<path d="${path(cx, cy)}" fill="${colour}" fill-rule="evenodd"/>`;
    })
    .join('');
  return { file: 'many-colours-flat.png', svg: svgDoc(width, height, body), width, height };
}

/**
 * Opaque and smooth: a violet-to-yellow sweep, a teal field, a blue field and a soft warm
 * glow. Large areas with no edges to trace: the simulated-process target.
 */
function smoothGradients(): Fixture {
  const size = WIDE_PX;
  const body = [
    '<defs>',
    linearGradient('sweep', 0, 0, 1, 1, [
      [0, '#2A0A5E'],
      [0.28, '#8E1A9C'],
      [0.52, '#F0457A'],
      [0.76, '#FF9A3C'],
      [1, '#FFD84D'],
    ]),
    radialGradient('teal', { cx: 0.18, cy: 0.82, r: 0.7 }, [[0, '#1FD1C0', 0.95], [1, '#1FD1C0', 0]]),
    radialGradient('blue', { cx: 0.86, cy: 0.2, r: 0.62 }, [[0, '#2F6BFF', 0.9], [1, '#2F6BFF', 0]]),
    radialGradient('glow', { cx: 0.42, cy: 0.42, r: 0.34 }, [
      [0, '#FFF6D6', 0.95],
      [0.3, '#FFE9A8', 0.55],
      [1, '#FFE9A8', 0],
    ]),
    '</defs>',
    `<rect width="${size}" height="${size}" fill="url(#sweep)"/>`,
    `<rect width="${size}" height="${size}" fill="url(#teal)"/>`,
    `<rect width="${size}" height="${size}" fill="url(#blue)"/>`,
    `<rect width="${size}" height="${size}" fill="url(#glow)"/>`,
  ].join('');
  return { file: 'smooth-gradients.png', svg: svgDoc(size, size, body), width: size, height: size };
}

/** A closed blob: a circle with a slow wobble, so the edge is organic but smooth. */
function blobPath(cx: number, cy: number, r: number, wobble: number, phase: number): string {
  const steps = 240;
  const points: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const k = 1 + wobble * Math.sin(3 * t + phase) + wobble * 0.5 * Math.sin(5 * t + 2 * phase);
    points.push(`${(cx + r * k * Math.cos(t)).toFixed(1)} ${(cy + r * k * Math.sin(t)).toFixed(1)}`);
  }
  return `M ${points.join(' L ')} Z`;
}

/**
 * A stylised painted orb: three concentric blobs in three hues (coral, ochre, teal), each
 * shaded from light to dark by the same upper-left light, with one dark outline per blob.
 * On transparent. This is the art that should go to simulated process on dark garments.
 */
function paintedShading(): Fixture {
  const size = WIDE_PX;
  const c = size / 2;
  const layers: { r: number; wobble: number; phase: number; outline: number; stops: Stop[] }[] = [
    {
      r: 1180, wobble: 0.035, phase: 0.6, outline: 30,
      stops: [[0, '#FFB39A'], [0.4, '#F0553A'], [0.78, '#B3251A'], [1, '#5C0F12']],
    },
    {
      r: 800, wobble: 0.045, phase: 2.1, outline: 22,
      stops: [[0, '#FFE58F'], [0.4, '#F5B21E'], [0.78, '#C27A10'], [1, '#6B3F08']],
    },
    {
      r: 410, wobble: 0.05, phase: 4.0, outline: 16,
      stops: [[0, '#C9F7EE'], [0.4, '#2CC2B3'], [0.78, '#13766F'], [1, '#08343A']],
    },
  ];
  const defs = layers.map((layer, i) =>
    radialGradient(`shade${i}`, { cx: 0.5, cy: 0.5, r: 0.72, fx: 0.36, fy: 0.3 }, layer.stops),
  );
  const shapes = layers.map((layer, i) => {
    const d = blobPath(c, c, layer.r, layer.wobble, layer.phase);
    return (
      `<path d="${d}" fill="url(#shade${i})"/>` +
      `<path d="${d}" fill="none" stroke="#120708" stroke-width="${layer.outline}" stroke-linejoin="round"/>`
    );
  });
  const body = `<defs>${defs.join('')}</defs>${shapes.join('')}`;
  return { file: 'painted-shading.png', svg: svgDoc(size, size, body), width: size, height: size };
}

/**
 * A tonal piece on transparent: neutral greys (one black ink, in tints) and one muted sage
 * (a second ink, in tints). A grey moon, a sage hill and a grey hill, all opaque, so no
 * grey sits over the sage and there is no soft alpha ramp to band.
 */
function lowChromaTonal(): Fixture {
  const size = WIDE_PX;
  const sage = '#6E8577';
  const cx = size / 2;
  const moonY = 1100;
  const body = [
    '<defs>',
    radialGradient('moon', { cx: 0.5, cy: 0.5, r: 0.5, fx: 0.36, fy: 0.32 }, [
      [0, '#FAFAFA'],
      [0.55, '#B4B4B4'],
      [1, '#4E4E4E'],
    ]),
    linearGradient('far', 0, 0, 0, 1, [
      [0, tintOf(sage, 0.3)],
      [1, sage],
    ]),
    linearGradient('near', 0, 0, 0, 1, [
      [0, '#8A8A8A'],
      [1, '#2B2B2B'],
    ]),
    '</defs>',
    `<circle cx="${cx}" cy="${moonY}" r="640" fill="url(#moon)"/>`,
    `<path d="M 0 1960 C 500 1760 1000 1900 1450 1990 S 2650 1800 ${size} 1960 L ${size} ${size} L 0 ${size} Z" fill="url(#far)"/>`,
    `<path d="M 0 2420 C 700 2260 1200 2480 1900 2400 S 2900 2300 ${size} 2420 L ${size} ${size} L 0 ${size} Z" fill="url(#near)"/>`,
  ].join('');
  return { file: 'low-chroma-tonal.png', svg: svgDoc(size, size, body), width: size, height: size };
}

// --- run ---------------------------------------------------------------------

const FIXTURES: Fixture[] = [
  flatLogo3c(),
  lettering1c(),
  gradientPhoto(),
  fineLines(),
  tints2c(),
  americanTraditional(),
  blackletter(),
  woodcut(),
  deathMetalLogo(),
  riso2Colour(),
  photocopyZine(),
  lineTattoo(),
  halftone(),
  manyColoursFlat(),
  smoothGradients(),
  paintedShading(),
  lowChromaTonal(),
];

async function main(): Promise<void> {
  for (const fixture of FIXTURES) {
    const target = path.join(OUT_DIR, fixture.file);
    const info = await sharp(Buffer.from(fixture.svg))
      .png({ compressionLevel: 9 })
      .withMetadata({ density: PPI })
      .toFile(target);
    console.log(`${fixture.file} ${info.width}x${info.height} ${info.size} bytes`);
  }
}

main().catch((error: unknown) => {
  console.error('make-fixtures failed:', error);
  process.exitCode = 1;
});
