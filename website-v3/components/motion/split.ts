// Tiny DOM splitters for the motion pack. Both operate on an element whose
// only child is a single text node (what React renders for `{t('key')}`),
// swap that node for wrapper spans, and put the very same node back on
// revert() so React's reference to it stays valid. Nothing here runs during
// SSR: the resting DOM is always plain text.

export interface Split {
  parts: HTMLElement[];
  revert: () => void;
}

function soleText(el: HTMLElement): Text | null {
  const node = el.firstChild;
  return node && node.nodeType === Node.TEXT_NODE && el.childNodes.length === 1 ? (node as Text) : null;
}

/**
 * One inline-block span per letter. inline-block drops kerning between
 * neighbours, which would make a fitted word wider than what FittedWord
 * measured, so each glyph's original x is recorded first and any drift
 * is folded back into a margin (in em, so a later refit still scales).
 */
export function splitLetters(el: HTMLElement): Split | null {
  const node = soleText(el);
  if (!node) return null;
  const text = node.textContent ?? '';
  const range = document.createRange();
  const lefts = text.split('').map((_, i) => {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    return range.getBoundingClientRect().left;
  });

  const hadLabel = el.hasAttribute('aria-label');
  if (!hadLabel && !el.hasAttribute('aria-hidden')) el.setAttribute('aria-label', text);
  const spans = text.split('').map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.setAttribute('aria-hidden', 'true');
    s.style.display = 'inline-block';
    s.style.whiteSpace = 'pre';
    return s;
  });
  el.replaceChildren(...spans);

  const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
  spans.forEach((s, i) => {
    const drift = lefts[i] - s.getBoundingClientRect().left;
    if (Math.abs(drift) > 0.05) s.style.marginLeft = `${drift / fs}em`;
  });

  return {
    parts: spans,
    revert: () => {
      el.replaceChildren(node);
      if (!hadLabel) el.removeAttribute('aria-label');
    },
  };
}

/** Lines of a wrapped heading, each in an overflow-hidden mask; `parts` are the sliding inner blocks. */
export function splitLines(el: HTMLElement): Split | null {
  const node = soleText(el);
  if (!node) return null;
  const text = (node.textContent ?? '').trim();
  const words = text.split(/\s+/);
  const probes = words.map((w) => {
    const s = document.createElement('span');
    s.textContent = w;
    return s;
  });
  const frag: Node[] = [];
  probes.forEach((p, i) => {
    if (i) frag.push(document.createTextNode(' '));
    frag.push(p);
  });
  el.replaceChildren(...frag);

  const lines: string[][] = [];
  let top = Number.NEGATIVE_INFINITY;
  probes.forEach((p, i) => {
    const t = Math.round(p.getBoundingClientRect().top);
    if (Math.abs(t - top) > 4) {
      lines.push([]);
      top = t;
    }
    lines[lines.length - 1].push(words[i]);
  });

  const hadLabel = el.hasAttribute('aria-label');
  if (!hadLabel) el.setAttribute('aria-label', text);
  const inners: HTMLElement[] = [];
  const masks = lines.map((ws) => {
    const mask = document.createElement('span');
    mask.setAttribute('aria-hidden', 'true');
    // The small bottom pad keeps descenders inside the mask.
    mask.style.cssText = 'display:block;overflow:hidden;padding-bottom:0.12em;margin-bottom:-0.12em';
    const inner = document.createElement('span');
    inner.style.display = 'block';
    inner.textContent = ws.join(' ');
    mask.appendChild(inner);
    inners.push(inner);
    return mask;
  });
  el.replaceChildren(...masks);

  return {
    parts: inners,
    revert: () => {
      el.replaceChildren(node);
      if (!hadLabel) el.removeAttribute('aria-label');
    },
  };
}
