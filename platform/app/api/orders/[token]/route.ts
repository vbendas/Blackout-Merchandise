import { NextResponse } from 'next/server';
import { getPublicOrder } from '@/lib/storefront/orders';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getPublicOrder(token);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  return NextResponse.json(order);
}
