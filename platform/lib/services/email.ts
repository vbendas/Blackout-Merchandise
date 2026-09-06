// Email transport: Resend when RESEND_API_KEY is set, otherwise a dev
// outbox that writes the rendered email to disk so notifications can be
// exercised end to end without a real provider key.
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { Resend } from 'resend';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** notification event, used only to name the dev outbox file */
  event?: string;
}

export interface EmailSendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface EmailGateway {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

class ResendEmailGateway implements EmailGateway {
  constructor(private readonly client: Resend) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = process.env.EMAIL_FROM;
    if (!from) return { ok: false, error: 'EMAIL_FROM is not configured' };

    try {
      const { data, error } = await this.client.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown Resend error' };
    }
  }
}

class OutboxEmailGateway implements EmailGateway {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const dir = path.join(process.cwd(), 'var', 'outbox');
    await mkdir(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const slug = (message.event ?? 'email').replace(/[^a-z0-9_.-]/gi, '_');
    const file = path.join(dir, `${stamp}-${slug}.html`);
    await writeFile(file, message.html, 'utf8');

    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    console.log(`[email:outbox] ${message.event ?? 'email'} -> ${to} (${file})`);
    return { ok: true, id: file };
  }
}

/** RESEND_API_KEY presence decides the transport; never logged. */
export function getEmailGateway(): EmailGateway {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) return new ResendEmailGateway(new Resend(apiKey));
  return new OutboxEmailGateway();
}
