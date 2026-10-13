import type { CatalogueDetail, CatalogueIndex } from '@/lib/catalog/catalogue-index';

// Fetching for the catalogue panel. The index (all 122 blanks, ~100 KB) is
// fetched once per page load and kept; each blank's detail is fetched the
// first time it is looked at (or hovered) and kept too. A failed request is
// forgotten, so Try again asks again.

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  // Signed out, the API redirects to the sign-in page: HTML, not JSON, and this throws.
  return (await response.json()) as T;
}

let indexRequest: Promise<CatalogueIndex> | null = null;
let indexValue: CatalogueIndex | null = null;

/** The index if it has already arrived, so a reopened panel shows it at once. */
export function peekCatalogueIndex(): CatalogueIndex | null {
  return indexValue;
}

export function loadCatalogueIndex(): Promise<CatalogueIndex> {
  indexRequest ??= getJson<CatalogueIndex>('/api/catalogue').then(
    (index) => (indexValue = index),
    (error: unknown) => {
      indexRequest = null;
      throw error;
    },
  );
  return indexRequest;
}

const detailRequests = new Map<string, Promise<CatalogueDetail>>();
const detailValues = new Map<string, CatalogueDetail>();

/** A detail that has already arrived. */
export function peekCatalogueDetail(code: string): CatalogueDetail | undefined {
  return detailValues.get(code);
}

export function loadCatalogueDetail(code: string): Promise<CatalogueDetail> {
  let request = detailRequests.get(code);
  if (!request) {
    request = getJson<CatalogueDetail>(`/api/catalogue/${encodeURIComponent(code)}`).then(
      (detail) => {
        detailValues.set(code, detail);
        return detail;
      },
      (error: unknown) => {
        detailRequests.delete(code);
        throw error;
      },
    );
    detailRequests.set(code, request);
  }
  return request;
}
