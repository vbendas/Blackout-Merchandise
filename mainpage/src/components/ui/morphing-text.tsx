'use client';

import { useCallback, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

const morphTime = 3;
const cooldownTime = 2;

const useMorphingText = (texts: string[], start: boolean = true, textColors?: string[]) => {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(cooldownTime);
  const timeRef = useRef(new Date());

  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const setStyles = useCallback(
    (fraction: number) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current];
      if (!current1 || !current2) return;

      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      current2.style.opacity = `${fraction ** 0.4 * 100}%`;

      const invertedFraction = 1 - fraction;
      current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
      current1.style.opacity = `${invertedFraction ** 0.4 * 100}%`;

      const currentIdx = textIndexRef.current % texts.length;
      const nextIdx = (textIndexRef.current + 1) % texts.length;

      current1.textContent = texts[currentIdx];
      current2.textContent = texts[nextIdx];

      // Sync colors with text content
      if (textColors) {
        current1.style.color = textColors[currentIdx] ?? 'inherit';
        current2.style.color = textColors[nextIdx] ?? 'inherit';
      }
    },
    [texts, textColors]
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;

    let fraction = morphRef.current / morphTime;

    if (fraction > 1) {
      cooldownRef.current = cooldownTime;
      fraction = 1;
    }

    setStyles(fraction);

    if (fraction === 1) {
      textIndexRef.current++;
    }
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (current1 && current2) {
      // Check if we're in initial state (before first morph has completed)
      // In initial state, keep text1 (current text) visible, text2 hidden
      // After a morph completes, textIndexRef will have incremented
      const isInitialState = textIndexRef.current === 0;

      if (isInitialState) {
        // Keep first text visible during initial cooldown
        current1.style.filter = 'none';
        current1.style.opacity = '100%';
        current2.style.filter = 'none';
        current2.style.opacity = '0%';
      } else {
        // After morph: show current text (text2), hide previous (text1)
        current2.style.filter = 'none';
        current2.style.opacity = '100%';
        current1.style.filter = 'none';
        current1.style.opacity = '0%';
      }
    }
  }, []);

  useEffect(() => {
    // Set initial static state with correct colors
    if (text1Ref.current && text2Ref.current) {
      text1Ref.current.style.filter = 'none';
      text1Ref.current.style.opacity = '100%';
      text1Ref.current.textContent = texts[textIndexRef.current % texts.length];
      // Apply initial color for first text
      if (textColors) {
        text1Ref.current.style.color = textColors[0] ?? 'inherit';
      }

      text2Ref.current.style.filter = 'none';
      text2Ref.current.style.opacity = '0%';
      text2Ref.current.textContent = texts[(textIndexRef.current + 1) % texts.length];
      // Apply initial color for second text
      if (textColors) {
        text2Ref.current.style.color = textColors[1] ?? 'inherit';
      }
    }

    if (!start) return;

    // Reset timing when animation starts to prevent skipping first morph
    timeRef.current = new Date();
    cooldownRef.current = cooldownTime;

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;

      cooldownRef.current -= dt;

      if (cooldownRef.current <= 0) doMorph();
      else doCooldown();
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [doMorph, doCooldown, start, texts]);

  return { text1Ref, text2Ref };
};

interface MorphingTextProps {
  className?: string;
  texts: string[];
  textColors?: string[];
  start?: boolean;
}

interface TextsProps {
  texts: string[];
  textColors?: string[];
  start?: boolean;
}

const Texts: React.FC<TextsProps> = ({ texts, textColors, start }) => {
  const { text1Ref, text2Ref } = useMorphingText(texts, start, textColors);
  return (
    <>
      <span className="absolute inset-x-0 top-0 m-auto inline-block w-full" ref={text1Ref} />
      <span className="absolute inset-x-0 top-0 m-auto inline-block w-full" ref={text2Ref} />
    </>
  );
};

const SvgFilters: React.FC = () => (
  <svg id="filters" className="fixed h-0 w-0" preserveAspectRatio="xMidYMid slice">
    <defs>
      <filter id="threshold">
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 255 -140"
        />
      </filter>
    </defs>
  </svg>
);

export const MorphingText: React.FC<MorphingTextProps> = ({ texts, className, textColors, start = true }) => (
  <div
    className={cn(
      'relative mx-auto h-16 w-full max-w-screen-md text-center font-sans text-[40pt] leading-none font-bold [filter:url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]',
      className
    )}
  >
    <Texts texts={texts} textColors={textColors} start={start} />
    <SvgFilters />
  </div>
);
