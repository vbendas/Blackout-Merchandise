'use client';

import { useRouter } from 'next/navigation';
import { DoorGate } from '@/components/auth/DoorGate';
import { OPENING, SENT, safeNext, wait, type DoorFlow, type DoorVariant } from '@/components/auth/door-flow';

interface PreviewDoorProps {
  variant: DoorVariant;
  initialEmail: string;
  /** Where the key leads: the Studio, or /register for an invitation. */
  next: string;
  redirectUrl: string | null;
}

/** The door with nothing behind it, for local work under AUTH_DEV_BYPASS
 * (which lib/auth.ts refuses in production): no Clerk calls, no email. Any
 * address reaches step 2 and any six digits open the Studio as the dev user. */
export function PreviewDoor({ variant, initialEmail, next, redirectUrl }: PreviewDoorProps) {
  const router = useRouter();

  const flow: DoorFlow = {
    async send() {
      await wait(700);
      return SENT;
    },
    async verify() {
      await wait(900);
      router.push(safeNext(redirectUrl, next));
      return OPENING;
    },
    reset() {},
  };

  return <DoorGate flow={flow} variant={variant} initialEmail={initialEmail} />;
}
