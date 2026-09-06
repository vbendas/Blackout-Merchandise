'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { advance, setTracking, type ProductionStatus } from '@/lib/services/production';
import { draftSupplierOrder, placeSupplierOrder, receiveSupplierOrder } from '@/lib/services/supplier';

// Server actions behind the two admin table pages. Each re-checks the admin
// role itself — never trust the layout gate alone for a mutating action —
// then calls straight into the owning service (no tool layer needed; these
// are direct human clicks, not model-issued calls).

async function requireAdmin(): Promise<void> {
  const session = await requireUser();
  if (session.role !== 'admin') throw new Error('Admin only.');
}

export async function advanceProductionAction(orderId: string, to?: ProductionStatus): Promise<void> {
  await requireAdmin();
  const result = await advance(orderId, to);
  revalidatePath('/admin/production');
  if (!result.ok) throw new Error(result.error);
}

export async function setTrackingAction(orderId: string, carrier: string, code: string, url?: string): Promise<void> {
  await requireAdmin();
  const result = await setTracking(orderId, { carrier, code, url: url || undefined });
  revalidatePath('/admin/production');
  if (!result.ok) throw new Error(result.error);
}

export async function draftSupplierOrderAction(orderIds?: string[]): Promise<void> {
  await requireAdmin();
  const result = await draftSupplierOrder({ orderIds });
  revalidatePath('/admin/supplier');
  if (!result.ok) throw new Error(result.error);
}

export async function placeSupplierOrderAction(id: string): Promise<void> {
  await requireAdmin();
  const result = await placeSupplierOrder(id);
  revalidatePath('/admin/supplier');
  if (!result.ok) throw new Error(result.error);
}

export async function receiveSupplierOrderAction(id: string): Promise<void> {
  await requireAdmin();
  const result = await receiveSupplierOrder(id);
  revalidatePath('/admin/supplier');
  if (!result.ok) throw new Error(result.error);
}
