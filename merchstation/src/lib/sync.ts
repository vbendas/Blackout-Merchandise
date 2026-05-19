import type { MerchStationConfig } from './config';

/**
 * Ping the app server's Typesense reindex API.
 * Non-blocking — shows warning if server isn't running but doesn't fail the save.
 */
export async function pingReindex(
  config: MerchStationConfig,
  resource?: string
): Promise<{ ok: boolean; message: string }> {
  const url = `${config.appServerUrl}/api/search/admin/reindex`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.typesenseApiKey) {
      headers['Authorization'] = `Bearer ${config.typesenseApiKey}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ resource: resource ?? 'all' }),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return { ok: true, message: 'Reindex triggered successfully' };
    }
    return { ok: false, message: `Reindex returned ${response.status}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Could not reach reindex API (${msg}). Is the app server running?`,
    };
  }
}
