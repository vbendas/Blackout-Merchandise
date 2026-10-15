'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffAction } from '@/lib/auth';
import { normalisePermissions } from '@/lib/auth/permissions';
import {
  inviteStaff,
  removeStaff,
  resendInvite,
  revokeInvite,
  setOwner,
  setSuspended,
  updatePermissions,
  updateTitle,
} from '@/lib/services/team';

// Server actions behind /admin/team. Team is the owner's area alone: each
// action checks that first (requireStaffAction), then hands the work to
// lib/services/team.ts, which checks again and records the activity. Every
// argument is treated as untrusted (a server action is a public endpoint).
// What the owner can act on comes back as `error`.

export interface TeamActionResult {
  error?: string;
  /** invites: the link, shown once so the owner can send it by hand */
  acceptUrl?: string;
  emailSent?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function refresh(): void {
  revalidatePath('/admin/team', 'layout');
}

export async function inviteStaffAction(input: { email: string; title?: string; permissions: Record<string, string> }): Promise<TeamActionResult> {
  const { actor } = await requireStaffAction('team', 'manage');
  const result = await inviteStaff(actor, {
    email: typeof input?.email === 'string' ? input.email : '',
    title: typeof input?.title === 'string' ? input.title : undefined,
    permissions: normalisePermissions(input?.permissions),
  });
  if (!result.ok) return { error: result.error };
  refresh();
  return { acceptUrl: result.value.acceptUrl, emailSent: result.value.emailSent };
}

export async function resendInviteAction(inviteId: string): Promise<TeamActionResult> {
  const { actor } = await requireStaffAction('team', 'manage');
  if (!isId(inviteId)) return { error: 'That invite was not found.' };
  const result = await resendInvite(actor, inviteId);
  if (!result.ok) return { error: result.error };
  refresh();
  return { acceptUrl: result.value.acceptUrl, emailSent: result.value.emailSent };
}

export async function revokeInviteAction(inviteId: string): Promise<TeamActionResult> {
  const { actor } = await requireStaffAction('team', 'manage');
  if (!isId(inviteId)) return { error: 'That invite was not found.' };
  const result = await revokeInvite(actor, inviteId);
  if (!result.ok) return { error: result.error };
  refresh();
  return {};
}

export async function saveMemberAction(userId: string, input: { permissions: Record<string, string>; title?: string }): Promise<TeamActionResult> {
  const { actor } = await requireStaffAction('team', 'manage');
  if (!isId(userId)) return { error: "That person isn't on the team." };
  const access = await updatePermissions(actor, userId, normalisePermissions(input?.permissions));
  if (!access.ok) return { error: access.error };
  if (typeof input?.title === 'string') {
    const title = await updateTitle(actor, userId, input.title);
    if (!title.ok) return { error: title.error };
  }
  refresh();
  return {};
}

export async function setSuspendedAction(userId: string, suspended: boolean): Promise<TeamActionResult> {
  const { actor } = await requireStaffAction('team', 'manage');
  if (!isId(userId)) return { error: "That person isn't on the team." };
  const result = await setSuspended(actor, userId, suspended === true);
  if (!result.ok) return { error: result.error };
  refresh();
  return {};
}

export async function setOwnerAction(userId: string, owner: boolean): Promise<TeamActionResult> {
  const { actor } = await requireStaffAction('team', 'manage');
  if (!isId(userId)) return { error: "That person isn't on the team." };
  const result = await setOwner(actor, userId, owner === true);
  if (!result.ok) return { error: result.error };
  refresh();
  return {};
}

export async function removeMemberAction(userId: string): Promise<TeamActionResult> {
  const { actor } = await requireStaffAction('team', 'manage');
  if (!isId(userId)) return { error: "That person isn't on the team." };
  const result = await removeStaff(actor, userId);
  if (!result.ok) return { error: result.error };
  refresh();
  return {};
}
