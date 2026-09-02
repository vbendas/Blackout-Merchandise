import { ViewShell } from '@/components/ViewShell';
import { ListView } from '@/components/ListView';

// Partners roster — the site root. Static: no searchParams read here.
// Old deep links (?view=grid/gallery, or any catalog param) are handled
// by the redirects in next.config.ts so they still resolve to the right
// route.
export default function Page() {
  return (
    <ViewShell view="list">
      <ListView />
    </ViewShell>
  );
}
