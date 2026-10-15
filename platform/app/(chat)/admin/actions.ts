'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffAction } from '@/lib/auth';
import { recordStaffActivity } from '@/lib/services/team';
import { advance, setTracking } from '@/lib/services/production';
import { draftSupplierOrder, placeSupplierOrder, receiveSupplierOrder } from '@/lib/services/supplier';

// Server actions behind the Production and Supplier orders pages. Each one
// checks the caller's own access first (requireStaffAction: Production, Work)
// — never trust the page or the layout alone, a server action is a public
// endpoint — then calls straight into the owning service, and records what
// it did in the activity log. A failure the person can act on comes back as
// `error`; a refused permission throws (the pages only offer what the person
// may do).

export interface AdminActionResult {
  error?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function advanceProductionAction(orderId: string): Promise<AdminActionResult> {
  const { actor } = await requireStaffAction('production', 'work');
  if (!isId(orderId)) return { error: 'Order not found.' };
  const result = await advance(orderId);
  if (!result.ok) return { error: result.error };
  await recordStaffActivity(actor, {
    area: 'production',
    action: 'production.advance',
    itemType: 'order',
    itemId: orderId,
    detail: { to: result.value.productionStatus, summary: `Moved order ${result.value.reference} to ${result.value.productionStatus ?? 'the next step'}` },
  });
  revalidatePath('/admin/production');
  return {};
}

export async function setTrackingAction(orderId: string, carrier: string, code: string, url?: string): Promise<AdminActionResult> {
  const { actor } = await requireStaffAction('production', 'work');
  if (!isId(orderId)) return { error: 'Order not found.' };
  const cleanCarrier = text(carrier, 60);
  const cleanCode = text(code, 80);
  if (!cleanCarrier || !cleanCode) return { error: 'Add the carrier and the tracking code.' };
  const cleanUrl = text(url, 500);
  const result = await setTracking(orderId, { carrier: cleanCarrier, code: cleanCode, url: /^https?:\/\//i.test(cleanUrl) ? cleanUrl : undefined });
  if (!result.ok) return { error: result.error };
  await recordStaffActivity(actor, {
    area: 'production',
    action: 'production.tracking',
    itemType: 'order',
    itemId: orderId,
    detail: { carrier: cleanCarrier, summary: `Added ${cleanCarrier} tracking to order ${result.value.reference}` },
  });
  revalidatePath('/admin/production');
  return {};
}

export async function draftSupplierOrderAction(): Promise<AdminActionResult> {
  const { actor } = await requireStaffAction('production', 'work');
  const result = await draftSupplierOrder({});
  if (!result.ok) return { error: result.error };
  await recordStaffActivity(actor, {
    area: 'production',
    action: 'supplier.draft',
    itemType: 'supplier_order',
    itemId: result.value.id,
    detail: { summary: `Drafted supplier order ${result.value.poNumber}` },
  });
  revalidatePath('/admin/supplier');
  return {};
}

export async function placeSupplierOrderAction(id: string): Promise<AdminActionResult> {
  const { actor } = await requireStaffAction('production', 'work');
  if (!isId(id)) return { error: 'Supplier order not found.' };
  const result = await placeSupplierOrder(id);
  if (!result.ok) return { error: result.error };
  await recordStaffActivity(actor, {
    area: 'production',
    action: 'supplier.place',
    itemType: 'supplier_order',
    itemId: id,
    detail: { summary: `Placed supplier order ${result.value.poNumber}` },
  });
  revalidatePath('/admin/supplier');
  return {};
}

export async function receiveSupplierOrderAction(id: string): Promise<AdminActionResult> {
  const { actor } = await requireStaffAction('production', 'work');
  if (!isId(id)) return { error: 'Supplier order not found.' };
  const result = await receiveSupplierOrder(id);
  if (!result.ok) return { error: result.error };
  await recordStaffActivity(actor, {
    area: 'production',
    action: 'supplier.receive',
    itemType: 'supplier_order',
    itemId: id,
    detail: { summary: `Received supplier order ${result.value.poNumber}` },
  });
  revalidatePath('/admin/supplier');
  return {};
}
