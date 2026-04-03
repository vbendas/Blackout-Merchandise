'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo } from 'react';

interface WordRevealProps {
  text: string;
  className?: string;
  range?: [number, number];
}

function AnimatedWord({
  word,
  scrollY,
  start,
  end,
}: {
  word: string;
  scrollY: ReturnType<typeof useScroll>['scrollY'];
  start: number;
  end: number;
}) {
  const opacity = useTransform(scrollY, [start, end], [0.2, 1]);
  const blur = useTransform(scrollY, [start, end], ['4px', '0px']);

  return (
    <motion.span style={{ opacity, filter: `blur(${blur})` }} className="inline-block mr-[0.25em]">
      {word}
    </motion.span>
  );
}

export function WordReveal({ text, className, range = [0, 100] }: WordRevealProps) {
  const { scrollY } = useScroll();
  const words = useMemo(() => text.split(' '), [text]);
  const step = (range[1] - range[0]) / words.length;

  return (
    <div className={className}>
      {words.map((word, i) => {
        const start = range[0] + step * i;
        const end = start + step + 20;

        return <AnimatedWord key={i} word={word} scrollY={scrollY} start={start} end={end} />;
      })}
    </div>
  );
}
