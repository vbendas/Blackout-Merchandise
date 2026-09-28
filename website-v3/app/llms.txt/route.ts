import { SITE_URL } from '@/lib/site';

// A plain-text primer for LLM agents and crawlers, in the informal
// llms.txt convention — not HTML, not meant for a browser tab.
export async function GET() {
  const body = `# MerchFrom

MerchFrom is premium merchandise for artists, brands and companies —
tees, hoodies and more, designed, printed and shipped in-house from
Barcelona, Spain. OEKO-TEX tested blanks, organic cotton across most
of the range, many GOTS-certified.

MerchFrom is by application: a limited number of artists are accepted
each month, not an open storefront. One assistant handles onboarding,
design, mockups, quotes, production and shipping through a single
conversation — no separate account managers or ticket queues.

Two ways to sell:
- Shop: an artist's own store, printed on demand as it sells, no stock
  and no upfront cost.
- Run: a bulk order for a tour, festival or studio — screen printed or
  embroidered, folded, tagged and shipped.

Key pages:
- ${SITE_URL}/ — home
- ${SITE_URL}/catalog — the blank catalog
- ${SITE_URL}/gallery — printed work
- ${SITE_URL}/about — about MerchFrom
- ${SITE_URL}/contact — contact
- ${SITE_URL}/waitlist — apply

MCP server: coming soon.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
