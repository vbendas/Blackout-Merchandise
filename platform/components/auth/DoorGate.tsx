'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import { siteHref } from '@/components/auth/door-links';
import {
  EMAIL_SHAPE,
  MESSAGES,
  fitToWidth,
  flip,
  focusAtEnd,
  prefersReducedMotion,
  settle,
  shake,
  type DoorFlow,
  type DoorVariant,
} from '@/components/auth/door-flow';

const KEY_LENGTH = 6;
const RESEND_SECONDS = 30;
const HINT_ID = 'door-hint';

const COPY: Record<
  DoorVariant,
  { caption: string; hint: string; keyHint: (email: string) => ReactNode; keySaid: (email: string) => string }
> = {
  'sign-in': {
    caption: 'By application',
    hint: 'Members receive a key by email.',
    keyHint: (email) => (
      <>
        Six digits, if <span className="door-lc">{email}</span> is on the list.
      </>
    ),
    keySaid: (email) => `Your key is on its way. Six digits, if ${email} is on the list.`,
  },
  'sign-up': {
    caption: 'By invitation',
    hint: 'Your key arrives by email.',
    keyHint: (email) => (
      <>
        Six digits, sent to <span className="door-lc">{email}</span>.
      </>
    ),
    keySaid: (email) => `Your key is on its way. Six digits, sent to ${email}.`,
  },
};

type Step = 'email' | 'key';
type Busy = 'sending' | 'checking' | 'resending' | 'opening' | null;

/** The website's lockSlogan: the key step's block is a little taller, so the
 * blank area above it (the layout's first grid row) keeps the height it had
 * and the statement doesn't move. Released for the email step and on resize. */
function holdStatement(hold: boolean): void {
  const top = document.querySelector<HTMLElement>('.door-top');
  const statement = top?.querySelector<HTMLElement>('.door-slogan');
  if (!top || !statement) return;
  if (!hold) top.style.gridTemplateRows = '';
  else if (!top.style.gridTemplateRows) top.style.gridTemplateRows = `${Math.round(statement.getBoundingClientRect().height)}px auto`;
}

export interface DoorGateProps {
  flow: DoorFlow;
  variant: DoorVariant;
  /** From ?email=: fills the field, never sends. */
  initialEmail: string;
  /** Clerk's bot check mounts here on sign-up. */
  captcha?: boolean;
}

/**
 * The website door's gate (mainpage/index.html, #gate), as the sign-in.
 * Step 1, "Your email.": Enter, or the Enter control beside the field, asks
 * the flow for a key; nothing is ever sent on load. Step 2, "Your key is on
 * its way.": six split-flap tiles over one real input (one-time-code, so
 * phones offer the code and pasting works), checked as the sixth digit lands.
 * Every refusal is one plain sentence on the hint line, announced to screen
 * readers.
 */
export function DoorGate({ flow, variant, initialEmail, captcha = false }: DoorGateProps) {
  const copy = COPY[variant];
  const emailRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const keyRowRef = useRef<HTMLDivElement>(null);
  const resendAt = useRef(0);
  const sayTimer = useRef(0);

  const [step, setStep] = useState<Step>('email');
  const [moved, setMoved] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<{ text: string; err: boolean } | null>(null);
  const [opened, setOpened] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [said, setSaid] = useState('');

  // Each step's field takes focus: the email on arrival (prefilled or not),
  // the key once it is on its way, the email again for another address.
  useEffect(() => {
    if (step === 'email') focusAtEnd(emailRef.current);
    else keyRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Long addresses shrink to fit the field, as on the website.
  useEffect(() => {
    const el = emailRef.current;
    if (step !== 'email' || !el) return;
    let live = true;
    const fit = () => {
      if (live) fitToWidth(el);
    };
    fit();
    window.addEventListener('resize', fit);
    void document.fonts?.ready.then(fit);
    return () => {
      live = false;
      window.removeEventListener('resize', fit);
    };
  }, [step, email]);

  useEffect(() => {
    const release = () => holdStatement(false);
    window.addEventListener('resize', release);
    return () => {
      window.removeEventListener('resize', release);
      release();
    };
  }, []);

  // Send again waits 30 seconds; the count follows the clock, so it is right
  // after the visitor comes back from their mail app.
  const cooling = cooldown > 0;
  useEffect(() => {
    if (!cooling) return;
    const tick = () => setCooldown(Math.max(0, Math.ceil((resendAt.current - Date.now()) / 1000)));
    const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [cooling]);

  function say(text: string) {
    window.clearTimeout(sayTimer.current);
    setSaid('');
    sayTimer.current = window.setTimeout(() => setSaid(text), 40);
  }

  function startCooldown() {
    resendAt.current = Date.now() + RESEND_SECONDS * 1000;
    setCooldown(RESEND_SECONDS);
  }

  function goTo(next: Step) {
    holdStatement(next === 'key');
    setMoved(true);
    setStep(next);
  }

  function open() {
    setBusy('opening');
    setOpened(true);
    setNote({ text: 'Opening the door.', err: false });
    say('Opening the door.');
  }

  function refuseEmail(message: string) {
    setNote({ text: message, err: true });
    say(message);
    shake(fieldRef.current);
    emailRef.current?.focus({ preventScroll: true });
  }

  function refuseKey(message: string) {
    setNote({ text: message, err: true });
    say(message);
    shake(keyRowRef.current);
    keyRef.current?.focus({ preventScroll: true });
  }

  async function sendKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!value) return refuseEmail(MESSAGES.noEmail);
    if (!EMAIL_SHAPE.test(value)) return refuseEmail(MESSAGES.badEmail);

    const address = value.toLowerCase();
    setBusy('sending');
    setNote({ text: 'One moment.', err: false });
    const result = await settle(flow.send(address));
    if (result.kind === 'opening') return open();
    setBusy(null);
    if (result.kind === 'error') return refuseEmail(result.message);

    setSentTo(address);
    setCode('');
    setNote(null);
    startCooldown();
    goTo('key');
    say(copy.keySaid(address));
  }

  async function checkKey(digits: string) {
    setBusy('checking');
    say('Checking.');
    const result = await settle(flow.verify(digits));
    if (result.kind === 'opening') return open();
    setBusy(null);
    setCode('');
    refuseKey(result.kind === 'error' ? result.message : MESSAGES.wrongKey);
  }

  function changeKey(raw: string) {
    if (busy) return;
    const digits = raw.replace(/\D/g, '').slice(0, KEY_LENGTH);
    setCode(digits);
    if (note?.err) setNote(null);
    if (digits.length === KEY_LENGTH) void checkKey(digits);
  }

  async function sendAgain() {
    if (busy || cooling) return;
    setBusy('resending');
    const result = await settle(flow.send(sentTo));
    if (result.kind === 'opening') return open();
    setBusy(null);
    if (result.kind === 'error') return refuseKey(result.message);
    setCode('');
    setNote(null);
    startCooldown();
    say('A new key is on its way.');
    keyRef.current?.focus({ preventScroll: true });
  }

  function changeEmail() {
    if (busy) return;
    flow.reset();
    setCode('');
    setNote(null);
    setEmail(sentTo || email);
    goTo('email');
  }

  const err = note?.err ?? false;
  const hint = note ? note.text : step === 'email' ? copy.hint : copy.keyHint(sentTo);
  const swap = moved ? ' door-swap' : '';

  return (
    <>
      {step === 'email' ? (
        <form key="email" className={`door-gate${swap}`} data-door-step="email" noValidate autoComplete="off" onSubmit={sendKey}>
          <p className="door-label door-cap">{copy.caption}</p>
          <h1 className="door-head">
            <label htmlFor="door-email">Your email.</label>
          </h1>
          <div ref={fieldRef} className="door-field">
            <input
              ref={emailRef}
              id="door-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (note?.err) setNote(null);
              }}
              readOnly={busy !== null}
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              enterKeyHint="go"
              maxLength={120}
              placeholder="you@yourname.com"
              aria-invalid={err || undefined}
              aria-describedby={HINT_ID}
            />
            <button type="submit" className="door-ulink door-go" hidden={!email.trim() || busy !== null}>
              Enter
            </button>
            <span className="door-rule" aria-hidden="true" />
          </div>
          <div className="door-meta">
            <p id={HINT_ID} className={`door-label door-hint${err ? ' is-err' : ''}`}>
              {hint}
            </p>
          </div>
        </form>
      ) : (
        <form
          key="key"
          className={`door-gate${swap}`}
          data-door-step="key"
          noValidate
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && code.length < KEY_LENGTH) refuseKey(MESSAGES.shortKey);
          }}
        >
          <h1 className="door-head">Your key is on its way.</h1>
          <KeyTiles
            value={code}
            inputRef={keyRef}
            rowRef={keyRowRef}
            checking={busy === 'checking'}
            opened={opened}
            readOnly={busy !== null}
            invalid={err}
            onChange={changeKey}
          />
          <div className="door-meta">
            <p id={HINT_ID} className={`door-label door-hint${err ? ' is-err' : ''}`}>
              {hint}
            </p>
          </div>
          <div className="door-acts">
            <button
              type="button"
              className="door-ulink"
              aria-disabled={busy !== null || cooling || undefined}
              onClick={() => void sendAgain()}
            >
              {busy === 'resending' ? 'Sending' : 'Send again'}
              {cooling && busy !== 'resending' ? (
                <span className="door-timer" aria-hidden="true">
                  0:{String(cooldown).padStart(2, '0')}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="door-ulink is-dim"
              aria-disabled={busy !== null || undefined}
              onClick={changeEmail}
            >
              Use another email
            </button>
          </div>
        </form>
      )}

      {captcha ? <div id="clerk-captcha" className="door-captcha" /> : null}

      <nav key={`links-${step}`} className={`door-links door-label${swap}`} aria-label="Other ways in">
        {variant === 'sign-up' && step === 'email' ? (
          <Link href="/sign-in">
            <span className="door-dim">Already a member?</span>
            <span className="door-u">Sign in.</span>
          </Link>
        ) : null}
        {variant === 'sign-in' ? (
          <a href={siteHref('/#apply')}>
            <span className="door-dim">Not a member?</span>
            <span className="door-u">Apply.</span>
          </a>
        ) : null}
        {step === 'email' || variant === 'sign-up' ? (
          <a href={siteHref('/#ask')}>
            <span className="door-dim">Questions?</span>
            <span className="door-u">Ask.</span>
          </a>
        ) : null}
      </nav>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {said}
      </p>
    </>
  );
}

interface KeyTilesProps {
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  rowRef: RefObject<HTMLDivElement | null>;
  checking: boolean;
  opened: boolean;
  readOnly: boolean;
  invalid: boolean;
  onChange: (raw: string) => void;
}

/** Six split-flap tiles drawn over one transparent input, so typing, pasting,
 * Backspace and the phone's code suggestion all work as in any field. */
function KeyTiles({ value, inputRef, rowRef, checking, opened, readOnly, invalid, onChange }: KeyTilesProps) {
  const cellRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const lastValue = useRef(value);
  const [spin, setSpin] = useState<string[] | null>(null);

  // A digit flips in as it lands.
  useEffect(() => {
    const before = lastValue.current;
    lastValue.current = value;
    for (let i = before.length; i < value.length; i++) flip(cellRefs.current[i], 110);
  }, [value]);

  // While the key is checked, the tiles run through digits like the press board.
  useEffect(() => {
    if (!checking || prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setSpin(Array.from({ length: KEY_LENGTH }, () => String(Math.floor(Math.random() * 10))));
      cellRefs.current.forEach((cell) => flip(cell, 70));
    }, 64);
    return () => window.clearInterval(id);
  }, [checking]);

  const shown = checking && spin ? spin : value.split('');
  const current = !checking && !opened && value.length < KEY_LENGTH ? value.length : -1;

  return (
    <>
      <label htmlFor="door-key" className="sr-only">
        Your key, six digits
      </label>
      <div ref={rowRef} className={`door-key${opened ? ' is-ok' : ''}`}>
        {Array.from({ length: KEY_LENGTH }, (_, index) => (
          <span
            key={index}
            ref={(el) => {
              cellRefs.current[index] = el;
            }}
            className={`door-cell${index === current ? ' is-cur' : ''}`}
            aria-hidden="true"
          >
            {shown[index] ?? ''}
          </span>
        ))}
        <input
          ref={inputRef}
          id="door-key"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          enterKeyHint="go"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={HINT_ID}
        />
      </div>
    </>
  );
}
