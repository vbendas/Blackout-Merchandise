import type { ElementType } from 'react';

interface OutlinedWordProps {
  children: string;
  /** Wrapping tag — 'h2' when this word doubles as the section heading. */
  as?: ElementType;
  className?: string;
}

/**
 * Giant outlined word (CLOTH / Zero / Apply). Renders the real,
 * accessible text once as a stroked outline, with a solid fill copy
 * stacked on top via CSS grid — aria-hidden and marked [data-fill] so
 * R6-B can reveal it later by animating its clip-path. This component
 * only ever renders the resting, fully-outlined state; see
 * .home-outline-word* in app/globals.css for the stacking/clip rules.
 */
export function OutlinedWord({ children, as: Tag = 'span', className }: OutlinedWordProps) {
  const classes = className ? `home-outline-word ${className}` : 'home-outline-word';
  return (
    <Tag className={classes}>
      <span className="home-outline-word-outline">{children}</span>
      <span className="home-outline-word-fill" data-fill aria-hidden="true">
        {children}
      </span>
    </Tag>
  );
}
