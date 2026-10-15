// A SigV4 signer written from the AWS specification, for tests to check R2
// requests and presigned URLs against, so they do not just trust aws4fetch to
// agree with itself. print-storage.test.ts proves it on the examples in the AWS
// documentation before anything is checked with it.
import { createHash, createHmac } from 'node:crypto';

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export interface SigningInput {
  method: string;
  host: string;
  /** as it appears on the wire (already percent-encoded) */
  path: string;
  query: [string, string][];
  /** lower-case names; must include every name in signedHeaders */
  headers: Record<string, string>;
  signedHeaders: string[];
  payloadHash: string;
  secret: string;
  region: string;
  service: string;
  datetime: string;
}

export function referenceSignature(i: SigningInput): string {
  const canonicalQuery = i.query
    .map(([k, v]) => [encode(k), encode(v)])
    .sort(([a1, b1], [a2, b2]) => (a1 < a2 ? -1 : a1 > a2 ? 1 : b1 < b2 ? -1 : b1 > b2 ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const names = [...i.signedHeaders].sort();
  const canonicalHeaders = names.map((n) => `${n}:${i.headers[n].trim().replace(/\s+/g, ' ')}\n`).join('');
  const canonicalRequest = [i.method, i.path, canonicalQuery, canonicalHeaders, names.join(';'), i.payloadHash].join('\n');
  const date = i.datetime.slice(0, 8);
  const scope = `${date}/${i.region}/${i.service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', i.datetime, scope, sha256(canonicalRequest)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${i.secret}`, date), i.region), i.service), 'aws4_request');
  return createHmac('sha256', key).update(stringToSign).digest('hex');
}

/** The signature a presigned URL should carry, worked out from the URL and the
 * headers the browser is told to send, next to the one it does carry. */
export function checkPresignedUrl(
  method: string,
  url: string,
  sentHeaders: Record<string, string>,
  secret: string,
): { expected: string; actual: string; signedHeaders: string[]; params: URLSearchParams } {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  const signedHeaders = (params.get('X-Amz-SignedHeaders') ?? '').split(';');
  const headers: Record<string, string> = { host: parsed.host };
  for (const [name, value] of Object.entries(sentHeaders)) headers[name.toLowerCase()] = value;
  const [, , region, service] = (params.get('X-Amz-Credential') ?? '').split('/');
  return {
    expected: referenceSignature({
      method,
      host: parsed.host,
      path: parsed.pathname,
      query: [...params].filter(([name]) => name !== 'X-Amz-Signature'),
      headers,
      signedHeaders,
      payloadHash: 'UNSIGNED-PAYLOAD',
      secret,
      region,
      service,
      datetime: params.get('X-Amz-Date') ?? '',
    }),
    actual: params.get('X-Amz-Signature') ?? '',
    signedHeaders,
    params,
  };
}

/** The example credentials and clock of the AWS signature documentation. */
export const AWS_EXAMPLE = {
  secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  service: 's3',
  datetime: '20130524T000000Z',
  host: 'examplebucket.s3.amazonaws.com',
};
