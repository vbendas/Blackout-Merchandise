import { blankDisplayName } from '@/lib/catalog/display-names';

/** The name fans see for a product. A product made without a name was given
 * the supplier's model name ('Cruiser 2.0'); fans read the garment's display
 * name instead. */
export function fanProductName(
  productName: string,
  blank: { code: string; name: string; supplierName: string | null },
): string {
  const supplierName = blank.supplierName?.trim().toLowerCase();
  if (supplierName && productName.trim().toLowerCase() === supplierName) {
    return blankDisplayName(blank.code, blank.name);
  }
  return productName;
}
