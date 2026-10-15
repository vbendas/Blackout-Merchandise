import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_COLOUR_NAMES, COLOUR_NAMES, clientColourName } from './colour-names';

const NEUTRALS = ['Black', 'Charcoal', 'Grey', 'Silver', 'White'];

function hex(r: number, g: number, b: number): `#${string}` {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` as `#${string}`;
}

test('the six colours in the approved mock get their names', () => {
  assert.equal(clientColourName('#ED90DC'), 'Orchid pink');
  assert.equal(clientColourName('#C363DA'), 'Violet');
  assert.equal(clientColourName('#5456AC'), 'Indigo');
  assert.equal(clientColourName('#3E0E61'), 'Deep purple');
  assert.equal(clientColourName('#18181A'), 'Black');
  assert.equal(clientColourName('#F2F2F0'), 'White');
});

test('everyday colours read as their everyday names', () => {
  const cases: [string, string][] = [
    ['#FF0000', 'Red'],
    ['#DE3163', 'Cherry'],
    ['#800020', 'Burgundy'],
    ['#FF7F50', 'Coral'],
    ['#FFFF00', 'Yellow'],
    ['#008000', 'Green'],
    ['#14532D', 'Forest green'],
    ['#40E0D0', 'Turquoise'],
    ['#87CEEB', 'Sky blue'],
    ['#0000FF', 'Blue'],
    ['#4169E1', 'Royal blue'],
    ['#000080', 'Navy'],
    ['#1C2B3A', 'Navy'],
    ['#7B2CBF', 'Purple'],
    ['#E6E6FA', 'Lavender'],
    ['#FFC0CB', 'Pink'],
    ['#FF69B4', 'Hot pink'],
    ['#FF00FF', 'Magenta'],
  ];
  for (const [value, name] of cases) assert.equal(clientColourName(value as `#${string}`), name, value);
});

test('warm off-whites read as ecru or cream, not white', () => {
  assert.equal(clientColourName('#ECE5DA'), 'Ecru');
  assert.equal(clientColourName('#E8DFCB'), 'Ecru');
  assert.equal(clientColourName('#FFFDD0'), 'Cream');
  assert.equal(clientColourName('#F5EFD9'), 'Cream');
});

test('greys never come out as colours, and lighten in order', () => {
  let previous = -1;
  for (let v = 0; v <= 255; v++) {
    const name = clientColourName(hex(v, v, v));
    const rank = NEUTRALS.indexOf(name);
    assert.ok(rank >= 0, `grey ${v} came out as ${name}`);
    assert.ok(rank >= previous, `grey ${v} went back to ${name}`);
    previous = rank;
  }
  assert.equal(clientColourName('#808080'), 'Grey');
  assert.equal(clientColourName('#404040'), 'Charcoal');
  assert.equal(clientColourName('#C0C0C0'), 'Silver');
});

test('a faint tint on a grey still reads as a grey', () => {
  for (let v = 20; v <= 240; v += 4) {
    for (const dr of [-4, 0, 4]) {
      for (const db of [-4, 0, 4]) {
        const name = clientColourName(hex(v + dr, v, v + db));
        assert.ok(NEUTRALS.includes(name), `${hex(v + dr, v, v + db)} came out as ${name}`);
      }
    }
  }
});

test('the Lab D50 path agrees with the hex path', () => {
  assert.equal(clientColourName({ L: 54.29, a: 80.81, b: 69.89 }), 'Red');
  assert.equal(clientColourName({ L: 29.57, a: 68.29, b: -112.03 }), 'Blue');
  assert.equal(clientColourName({ L: 100, a: 0, b: 0 }), 'White');
  assert.equal(clientColourName({ L: 0, a: 0, b: 0 }), 'Black');
  assert.equal(clientColourName({ L: 53.39, a: 0, b: 0 }), 'Grey');
});

test('short hex and hex without the hash are accepted; junk is refused', () => {
  assert.equal(clientColourName('#FFF'), 'White');
  assert.equal(clientColourName('ED90DC' as `#${string}`), 'Orchid pink');
  assert.throws(() => clientColourName('#12345' as `#${string}`), /not a hex colour/);
  assert.throws(() => clientColourName('teal' as `#${string}`), /not a hex colour/);
});

test('every name can be reached', () => {
  const reached = new Set<string>();
  for (let r = 0; r < 256; r += 8) {
    for (let g = 0; g < 256; g += 8) {
      for (let b = 0; b < 256; b += 8) reached.add(clientColourName(hex(r, g, b)));
    }
  }
  for (const entry of COLOUR_NAMES) assert.ok(reached.has(entry.name), `${entry.name} is never chosen`);
});

test('the list is plain sentence-case English, with no codes and no Pantone names', () => {
  assert.deepEqual(CLIENT_COLOUR_NAMES, COLOUR_NAMES.map((entry) => entry.name));
  assert.equal(new Set(CLIENT_COLOUR_NAMES).size, CLIENT_COLOUR_NAMES.length, 'names are unique');
  assert.ok(CLIENT_COLOUR_NAMES.length >= 40 && CLIENT_COLOUR_NAMES.length <= 60, 'about 40 to 60 names');
  const pantoneNames = ['radiant orchid', 'marsala', 'living coral', 'ultra violet', 'classic blue', 'viva magenta', 'peach fuzz', 'very peri', 'mocha mousse', 'rose quartz', 'serenity', 'cerulean', 'illuminating', 'tangerine tango', 'chili pepper'];
  for (const name of CLIENT_COLOUR_NAMES) {
    assert.match(name, /^[A-Z][a-z]*( [a-z]+)*$/, `${name} is not sentence case`);
    assert.doesNotMatch(name, /pantone|\d/i, `${name} looks like a code`);
    assert.equal(pantoneNames.includes(name.toLowerCase()), false, `${name} is a Pantone name`);
  }
});

test('every region is a real range', () => {
  for (const entry of COLOUR_NAMES) {
    assert.ok(entry.l[0] <= entry.l[1], `${entry.name} lightness`);
    assert.ok(entry.c[0] <= entry.c[1], `${entry.name} chroma`);
    assert.ok(entry.l[0] >= 0 && entry.l[1] <= 1, `${entry.name} lightness bounds`);
    if (entry.h) assert.ok(entry.h.every((deg) => deg >= 0 && deg <= 360), `${entry.name} hue bounds`);
  }
});
