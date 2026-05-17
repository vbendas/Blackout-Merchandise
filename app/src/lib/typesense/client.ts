/**
 * Typesense Client — Server-side and client-side factories.
 *
 * The server client uses the admin API key (full access, sync + indexing).
 * The browser client uses the search-only API key (public, queries only).
 *
 * Both are lazy singletons — the connection is established on first use.
 */

import Typesense from 'typesense';

/**
 * Server-side Typesense client with admin privileges.
 * Used for: indexing, syncing, collection management, server-side search.
 * NEVER expose this key to the client.
 */
export function getServerClient() {
  const apiKey = process.env.TYPESENSE_API_KEY;
  const host = process.env.TYPESENSE_HOST;
  const port = process.env.TYPESENSE_PORT || '443';
  const protocol = process.env.TYPESENSE_PROTOCOL || 'https';

  if (!apiKey || !host) {
    throw new Error(
      'Typesense not configured. Set TYPESENSE_API_KEY and TYPESENSE_HOST in .env.local'
    );
  }

  return new Typesense.Client({
    nodes: [
      {
        host,
        port: Number(port),
        protocol: protocol as 'http' | 'https',
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 30,
    retryIntervalSeconds: 1,
  });
}

/**
 * Lazy singleton server client — reuses the same instance.
 */
let _serverClient: InstanceType<typeof Typesense.Client> | null = null;

export function getSharedServerClient() {
  if (!_serverClient) {
    _serverClient = getServerClient();
  }
  return _serverClient;
}

/**
 * Build a client-side-safe Typesense config using the search-only key.
 * Use this in components that need to call Typesense directly.
 * The search-only key should be safe to expose in the browser.
 */
export function getBrowserClientConfig() {
  const apiKey = process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY;
  const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST;
  const port = process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443';
  const protocol = process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https';

  if (!apiKey || !host) {
    return null; // Graceful fallback when Typesense isn't configured
  }

  return {
    nodes: [{ host, port: Number(port), protocol: protocol as 'http' | 'https' }],
    apiKey,
    connectionTimeoutSeconds: 3,
  };
}

/**
 * Check if Typesense is configured and ready to use.
 */
export function isTypesenseConfigured(): boolean {
  return !!(process.env.TYPESENSE_API_KEY && process.env.TYPESENSE_HOST);
}
