import { type NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

interface SendEmailParams {
  to: string;
  subject: string;
  template: 'order-confirmation' | 'order-shipped' | 'order-fulfilled' | 'artist-new-order';
  data: Record<string, unknown>;
}

const TEMPLATES = {
  'order-confirmation': {
    subject: '🎉 Your order is confirmed!',
    html: (data: Record<string, unknown>) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #E11D48;">Order Confirmed!</h1>
          <p>Thank you for your order, ${data.customerName || 'there'}!</p>
          <p>Order #${data.orderId}</p>
          <p>Total: €${((data.total as number) / 100).toFixed(2)}</p>
          <p>We'll send you another email when your order ships.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Blackout Merchandise - Premium Creator Commerce</p>
        </body>
      </html>
    `,
  },
  'order-shipped': {
    subject: '📦 Your order has shipped!',
    html: (data: Record<string, unknown>) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #E11D48;">Order Shipped!</h1>
          <p>Great news, ${data.customerName || 'there'}!</p>
          <p>Your order #${data.orderId} is on its way!</p>
          <p>Tracking: ${data.trackingNumber || 'N/A'}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Blackout Merchandise - Premium Creator Commerce</p>
        </body>
      </html>
    `,
  },
  'order-fulfilled': {
    subject: '✨ Your order has been delivered!',
    html: (data: Record<string, unknown>) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #E11D48;">Order Delivered!</h1>
          <p>Your order #${data.orderId} has been delivered!</p>
          <p>We hope you love your merch!</p>
          <p>Leave a review to earn rewards on your next order.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Blackout Merchandise - Premium Creator Commerce</p>
        </body>
      </html>
    `,
  },
  'artist-new-order': {
    subject: '💰 New order received!',
    html: (data: Record<string, unknown>) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #E11D48;">New Order!</h1>
          <p>You've received a new order, ${data.artistName || 'there'}!</p>
          <p>Order #${data.orderId}</p>
          <p>Earnings: €${((data.artistEarnings as number) / 100).toFixed(2)}</p>
          <p>Log in to your dashboard to start production.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Blackout Merchandise - Premium Creator Commerce</p>
        </body>
      </html>
    `,
  },
};

export async function sendEmail({ to, template, data }: SendEmailParams) {
  try {
    const templateConfig = TEMPLATES[template];
    if (!templateConfig) {
      throw new Error(`Unknown email template: ${template}`);
    }

    const result = await resend.emails.send({
      from: 'Blackout Merchandise <orders@blackoutmerch.example>',
      to,
      subject: templateConfig.subject,
      html: templateConfig.html(data),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'send': {
        const result = await sendEmail({
          to: params.to as string,
          template: params.template as SendEmailParams['template'],
          subject: params.subject as string,
          data: params.data as Record<string, unknown>,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
