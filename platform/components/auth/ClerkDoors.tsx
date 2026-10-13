'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { DoorGate } from '@/components/auth/DoorGate';
import {
  MESSAGES,
  OPENING,
  SENT,
  atLeast,
  classify,
  logTrouble,
  messageFor,
  refuse,
  safeNext,
  wait,
  withTimeout,
  type DoorFlow,
  type DoorResult,
} from '@/components/auth/door-flow';

// Clerk v7's SignInFuture / SignUpFuture (useSignIn / useSignUp): each call
// resolves to { error } instead of throwing. Methods called before Clerk's
// script has loaded wait for it.
type SignInFuture = ReturnType<typeof useSignIn>['signIn'];
type Router = ReturnType<typeof useRouter>;
type Reply = { error: unknown };
type FinalizeParams = NonNullable<Parameters<SignInFuture['finalize']>[0]>;

// A key request and a key check take at least this long, whatever Clerk
// answers, so a quick "no such account" can't be told from a sent key by
// timing; an address that can't sign in waits a little longer still.
const SEND_FLOOR_MS = 900;
const CHECK_FLOOR_MS = 600;
const TIMEOUT_MS = 20_000;

async function ask(work: Promise<Reply>, floor: number): Promise<Reply | 'timeout'> {
  return atLeast(floor, withTimeout(TIMEOUT_MS, work));
}

function jitter(): number {
  return Math.random() * 300;
}

/** Already signed in on this browser: straight through. */
function goStraightIn(destination: string): DoorResult {
  window.location.assign(destination);
  return OPENING;
}

/** Makes the new session the active one, then opens the destination
 * (decorateUrl may return an absolute URL for Safari's cookie refresh). */
async function finish(finalize: (params: FinalizeParams) => Promise<Reply>, destination: string, router: Router): Promise<DoorResult> {
  let pendingTask = false;
  const reply = await withTimeout(
    TIMEOUT_MS,
    finalize({
      navigate: async ({ session, decorateUrl }) => {
        // A session task (an organisation to choose, a password to reset) is
        // not part of this door; the session stays pending and we say so.
        if (session.currentTask) {
          pendingTask = true;
          return;
        }
        const url = decorateUrl(destination);
        if (url.startsWith('http')) window.location.href = url;
        else router.push(url);
      },
    }),
  );
  if (reply === 'timeout') return refuse(MESSAGES.slow);
  if (reply.error) logTrouble('finalize', reply.error);
  if (reply.error || pendingTask) return refuse(MESSAGES.stuck);
  return OPENING;
}

/** Checks an email code on a sign-in that is under way, then opens. */
async function verifySignIn(signIn: SignInFuture, code: string, destination: string, router: Router): Promise<DoorResult> {
  const reply = await ask(signIn.emailCode.verifyCode({ code }), CHECK_FLOOR_MS);
  if (reply === 'timeout') return refuse(MESSAGES.slow);
  if (reply.error) {
    const trouble = classify(reply.error);
    if (trouble === 'signed-in') return goStraightIn(destination);
    if (trouble !== 'wrong-key') logTrouble('verify', reply.error);
    return refuse(messageFor(trouble, 'verify'));
  }
  return finish((params) => signIn.finalize(params), destination, router);
}

interface ClerkSignInDoorProps {
  initialEmail: string;
  /** Clerk's ?redirect_url=: where the visitor was going when the door stopped them. */
  redirectUrl: string | null;
}

/**
 * The door as Clerk's email-code sign-in. Step 1 sends the code
 * (signIn.emailCode.sendCode); step 2 checks it (verifyCode) and makes the
 * session active (finalize), then opens the Studio. An address that can't
 * sign in gets the same step 2 and, after the same wait, the same "That key
 * didn't work." as a wrong key: no reply tells who is a member.
 */
export function ClerkSignInDoor({ initialEmail, redirectUrl }: ClerkSignInDoorProps) {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [ghost, setGhost] = useState(false);
  const destination = () => safeNext(redirectUrl, '/studio');

  const flow: DoorFlow = {
    async send(email) {
      const reply = await ask(signIn.emailCode.sendCode({ emailAddress: email }), SEND_FLOOR_MS);
      if (reply === 'timeout') return refuse(MESSAGES.slow);
      if (!reply.error) {
        setGhost(false);
        return SENT;
      }
      const trouble = classify(reply.error);
      if (trouble === 'unknown') {
        await wait(jitter());
        setGhost(true);
        return SENT;
      }
      if (trouble === 'signed-in') return goStraightIn(destination());
      logTrouble('send', reply.error);
      return refuse(messageFor(trouble, 'send'));
    },
    async verify(code) {
      if (ghost) {
        await wait(CHECK_FLOOR_MS + jitter());
        return refuse(MESSAGES.wrongKey);
      }
      return verifySignIn(signIn, code, destination(), router);
    },
    reset() {
      setGhost(false);
      void signIn.reset();
    },
  };

  return <DoorGate flow={flow} variant="sign-in" initialEmail={initialEmail} />;
}

/**
 * The door for an invited artist (/sign-up?invite=...): Clerk's email-code
 * sign-up (signUp.create, verifications.sendEmailCode, verifyEmailCode,
 * finalize), then /register, which reads the invitation from its cookie. An
 * address that already has an account signs in instead, on the same screens.
 */
export function ClerkSignUpDoor({ initialEmail }: { initialEmail: string }) {
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [via, setVia] = useState<'sign-up' | 'sign-in'>('sign-up');
  const destination = '/register';

  const flow: DoorFlow = {
    async send(email) {
      const created = await ask(
        (async (): Promise<Reply> => {
          const made = await signUp.create({ emailAddress: email });
          if (made.error) return made;
          return signUp.verifications.sendEmailCode();
        })(),
        SEND_FLOOR_MS,
      );
      if (created === 'timeout') return refuse(MESSAGES.slow);
      if (!created.error) {
        setVia('sign-up');
        return SENT;
      }

      let trouble = classify(created.error);
      let error = created.error;
      if (trouble === 'exists') {
        const reply = await ask(signIn.emailCode.sendCode({ emailAddress: email }), 0);
        if (reply === 'timeout') return refuse(MESSAGES.slow);
        if (!reply.error) {
          setVia('sign-in');
          return SENT;
        }
        trouble = classify(reply.error);
        error = reply.error;
      }
      if (trouble === 'signed-in') return goStraightIn(destination);
      logTrouble('send', error);
      return refuse(messageFor(trouble, 'send'));
    },
    async verify(code) {
      if (via === 'sign-in') return verifySignIn(signIn, code, destination, router);
      const reply = await ask(signUp.verifications.verifyEmailCode({ code }), CHECK_FLOOR_MS);
      if (reply === 'timeout') return refuse(MESSAGES.slow);
      if (reply.error) {
        const trouble = classify(reply.error);
        if (trouble === 'signed-in') return goStraightIn(destination);
        if (trouble !== 'wrong-key') logTrouble('verify', reply.error);
        return refuse(messageFor(trouble, 'verify'));
      }
      return finish((params) => signUp.finalize(params), destination, router);
    },
    reset() {
      setVia('sign-up');
      void signUp.reset();
      void signIn.reset();
    },
  };

  return <DoorGate flow={flow} variant="sign-up" initialEmail={initialEmail} captcha />;
}
