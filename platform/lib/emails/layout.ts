// Shared layout for every notification email: charcoal header band with the
// wordmark, white body for inbox-client deliverability (a fully dark body
// renders badly in Outlook and trips some spam heuristics), one CTA button,
// hairline rules between rows. Templates only supply copy + rows.
const CHARCOAL = '#221f1c';
const CREAM = '#ede4dd';
const INK = '#2a2622';
const DIM = '#8b8378';
const HAIRLINE = '#e7e2db';

export interface EmailRow {
  label: string;
  value: string;
}

export interface EmailContent {
  preheader?: string;
  heading: string;
  paragraphs: string[];
  rows?: EmailRow[];
  buttonLabel?: string;
  buttonUrl?: string;
  footerNote?: string;
}

export function escapeHtml(input: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return input.replace(/[&<>"']/g, (ch) => map[ch]);
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, '');
}

export function appUrl(path = '/'): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3006').replace(/\/$/, '');
  return `${base}${path}`;
}

export function formatCents(cents: number | undefined, currency = 'EUR'): string {
  if (cents === undefined) return '—';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency });
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const rowsHtml = content.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0;">
        ${content.rows
          .map(
            (row) =>
              `<tr><td style="padding:9px 0;border-top:1px solid ${HAIRLINE};color:${DIM};font-size:13px;">${escapeHtml(row.label)}</td><td style="padding:9px 0;border-top:1px solid ${HAIRLINE};color:${INK};font-size:13px;text-align:right;">${escapeHtml(row.value)}</td></tr>`,
          )
          .join('')}
      </table>`
    : '';

  const buttonHtml =
    content.buttonLabel && content.buttonUrl
      ? `<a href="${content.buttonUrl}" style="display:inline-block;margin-top:8px;padding:12px 26px;background:${CHARCOAL};color:${CREAM};text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.02em;">${escapeHtml(content.buttonLabel)}</a>`
      : '';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#f4f1ec;font-family:Helvetica,Arial,sans-serif;">
    ${content.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>` : ''}
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:${CHARCOAL};padding:22px 32px;">
        <span style="color:${CREAM};font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">MerchFrom</span>
      </div>
      <div style="padding:32px;color:${INK};">
        <h1 style="margin:0 0 14px;font-size:19px;font-weight:700;color:${INK};">${escapeHtml(content.heading)}</h1>
        ${content.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${INK};">${p}</p>`).join('')}
        ${rowsHtml}
        ${buttonHtml}
      </div>
      <div style="padding:18px 32px;border-top:1px solid ${HAIRLINE};">
        <p style="margin:0;font-size:11px;color:${DIM};">${escapeHtml(content.footerNote ?? 'MerchFrom — premium merch for artists.')}</p>
      </div>
    </div>
  </body>
</html>`;

  const textLines = [content.heading, '', ...content.paragraphs.map(stripTags)];
  if (content.rows?.length) textLines.push('', ...content.rows.map((row) => `${row.label}: ${row.value}`));
  if (content.buttonLabel && content.buttonUrl) textLines.push('', `${content.buttonLabel}: ${content.buttonUrl}`);
  textLines.push('', content.footerNote ?? 'MerchFrom — premium merch for artists.');

  return { html, text: textLines.join('\n') };
}
