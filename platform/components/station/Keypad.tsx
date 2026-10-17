'use client';

// An exact count on a big keypad: the number is typed on keys of 72 px, held between 0 and the line's total, and set with one press.
// "All" sets the whole line. Nothing is sent until Set is pressed.
import { useState } from 'react';
import type { ProgressLine } from '@/lib/services/production-progress';
import { IconBackspace } from './icons';
import { allCount, keypadCount, KEYPAD_KEYS, pressKey, type KeypadKey } from './counter';
import { Dialog } from './Dialog';

const KEY_LABEL: Record<KeypadKey, string> = { '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', clear: 'Clear', back: '' };

export function Keypad({ line, onSet, onClose }: { line: ProgressLine; onSet: (value: number) => void; onClose: () => void }) {
  const [text, setText] = useState(String(line.printed));
  // The first key replaces what is shown, as on a calculator: the old count is only there to be read.
  const [fresh, setFresh] = useState(true);
  const value = keypadCount(text, line.total);

  const press = (key: KeypadKey) => {
    setText((current) => pressKey(fresh && key !== 'back' && key !== 'clear' ? '' : current, key, line.total));
    setFresh(false);
  };

  return (
    <Dialog title="How many are printed?" onClose={onClose}>
      <p className="st-dialog-sub">
        {line.blankName} · {line.colourName} · size <b>{line.size}</b>
        <br />
        <span className="st-dim">
          {line.orderRef}
          {line.position ? ` · ${line.position}` : ''}
        </span>
      </p>
      <p className="st-keypad-display" aria-live="polite">
        <output aria-label="Printed count">{text === '' ? '0' : text}</output>
        <span> / {line.total}</span>
      </p>
      <div className="st-keypad" role="group" aria-label="Keypad">
        {KEYPAD_KEYS.map((key) => (
          <button key={key} type="button" className="st-key" data-kind={key === 'clear' || key === 'back' ? 'edit' : 'digit'} onClick={() => press(key)} aria-label={key === 'back' ? 'Delete the last digit' : key === 'clear' ? 'Clear' : key}>
            {key === 'back' ? <IconBackspace width={30} height={30} /> : KEY_LABEL[key]}
          </button>
        ))}
      </div>
      <div className="st-dialog-actions">
        <button type="button" className="st-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="st-btn" onClick={() => onSet(allCount(line.total))}>
          All {line.total}
        </button>
        <button type="button" className="st-btn st-btn-primary" data-autofocus disabled={value === null} onClick={() => value !== null && onSet(value)}>
          Set {value === null ? '' : value}
        </button>
      </div>
    </Dialog>
  );
}
