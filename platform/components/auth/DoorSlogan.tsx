'use client';

import { useEffect, useRef, useState } from 'react';

const SENTENCE = 'We help artists, brands and creators to design, source and sell premium merchandise.';
const WORDS = ['DESIGN', 'SOURCE', 'SELL'];
const SLOTS = 6;
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const EVERY_MS = 3200;

/** A word centred on the six tiles: 'SELL' fills them as ' SELL '. */
function tilesFor(word: string): string[] {
  const left = Math.floor((SLOTS - word.length) / 2);
  return (' '.repeat(left) + word).padEnd(SLOTS, ' ').split('');
}

/**
 * The website door's statement (mainpage/index.html, #g-slogan): grey, centred,
 * the verb a press-board slot that flips DESIGN / SOURCE / SELL like a status
 * tile. The tiles start on DESIGN, so the first frame already reads; with
 * reduced motion door.css shows the plain sentence, the verbs in white, and
 * nothing flips. Screen readers get the sentence once, as text.
 */
export function DoorSlogan() {
  const [tiles, setTiles] = useState<string[]>(() => tilesFor(WORDS[0]));
  const tileRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timers = new Set<number>();
    const goal = tilesFor(WORDS[0]);
    let word = 0;

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const put = (index: number, char: string) => {
      setTiles((current) => (current[index] === char ? current : current.map((c, i) => (i === index ? char : c))));
      const tile = tileRefs.current[index];
      if (char !== ' ' && tile?.animate) {
        tile.animate([{ transform: 'scaleY(.25)' }, { transform: 'scaleY(1)' }], { duration: 80, easing: 'ease-out' });
      }
    };

    // Each tile runs through a few random characters before it settles.
    const flipTo = (index: number, char: string, delay: number, cycles: number) => {
      let step = 0;
      const next = () => {
        if (step >= cycles) {
          put(index, char);
          return;
        }
        put(index, CHARS.charAt(Math.floor(Math.random() * CHARS.length)));
        step += 1;
        later(next, 42 + Math.random() * 28);
      };
      later(next, delay);
    };

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      word = (word + 1) % WORDS.length;
      tilesFor(WORDS[word]).forEach((char, index) => {
        if (goal[index] === char) return;
        goal[index] = char;
        flipTo(index, char, index * 46, 3 + Math.floor(Math.random() * 3));
      });
    }, EVERY_MS);

    return () => {
      window.clearInterval(interval);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <p className="door-slogan">
      <span className="sr-only">{SENTENCE}</span>
      <span className="door-sl-in" aria-hidden="true">
        We help artists, brands and creators to{' '}
        <span className="door-slot">
          {tiles.map((char, index) => (
            <span
              key={index}
              ref={(el) => {
                tileRefs.current[index] = el;
              }}
            >
              {char === ' ' ? ' ' : char}
            </span>
          ))}
        </span>
        <span className="door-verbs">design, source and sell</span> premium merchandise.
      </span>
    </p>
  );
}
