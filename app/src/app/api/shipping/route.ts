import { auth } from '@clerk/nextjs/server';
import { type NextRequest, NextResponse } from 'next/server';

interface ShippingQuote {
  carrier: string;
  service: string;
  price: number;
  estimatedDays: number;
}

const CTT_RATES: ShippingQuote[] = [
  { carrier: 'CTT', service: 'Standard', price: 450, estimatedDays: 3 },
  { carrier: 'CTT', service: 'Express', price: 750, estimatedDays: 1 },
  { carrier: 'CTT', service: 'Registered', price: 550, estimatedDays: 2 },
];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    const body = await request.json();
    const { action, destination, weight: _weight, dimensions: _dimensions } = body;

    switch (action) {
      case 'get-quotes': {
        // Public - anyone can get shipping quotes
        if (!destination) {
          return NextResponse.json({ error: 'Destination required' }, { status: 400 });
        }

        const country = destination.country?.toUpperCase() || 'PT';

        let rates = [...CTT_RATES];

        if (country !== 'PT') {
          rates = rates.map((r) => ({
            ...r,
            price: r.price + 500,
            estimatedDays: r.estimatedDays + 2,
          }));
        }

        rates.push(
          { carrier: 'DHL', service: 'Express Worldwide', price: 1500, estimatedDays: 2 },
          { carrier: 'UPS', service: 'Standard', price: 1200, estimatedDays: 3 }
        );

        return NextResponse.json({ rates });
      }

      case 'validate-address': {
        const { address } = body;

        if (!address) {
          return NextResponse.json({ error: 'Address required' }, { status: 400 });
        }

        return NextResponse.json({
          valid: true,
          normalized: {
            street: address.street || '',
            city: address.city || '',
            postalCode: address.postalCode || '',
            country: address.country || 'PT',
          },
        });
      }

      case 'create-shipment': {
        // Require authentication for creating shipments
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId, carrier, service } = body;

        if (!orderId || !carrier || !service) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          shipmentId: `SHP-${Date.now()}`,
          trackingNumber: `CTT${Date.now()}`,
          labelUrl: 'https://example.com/label.pdf',
        });
      }

      case 'get-tracking': {
        const { trackingNumber } = body;

        if (!trackingNumber) {
          return NextResponse.json({ error: 'Tracking number required' }, { status: 400 });
        }

        return NextResponse.json({
          trackingNumber,
          status: 'in_transit',
          events: [
            {
              date: new Date().toISOString(),
              location: 'Lisbon, Portugal',
              description: 'In transit',
            },
            {
              date: new Date(Date.now() - 86400000).toISOString(),
              location: 'Lisbon, Portugal',
              description: 'Processed at facility',
            },
          ],
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Shipping API error:', error);
    return NextResponse.json({ error: 'Shipping operation failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    carriers: ['CTT', 'DHL', 'UPS'],
    services: {
      CTT: ['Standard', 'Express', 'Registered'],
      DHL: ['Express Worldwide'],
      UPS: ['Standard', 'Express'],
    },
  });
}
