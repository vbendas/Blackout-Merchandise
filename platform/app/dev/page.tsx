import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEV_BYPASS, getSession } from '@/lib/auth';
import { localDemoDir } from '@/lib/dev/local-demo';
import { DEV_IDENTITIES } from '@/lib/dev/identities';
import { loadDemoLinks, type DemoLinks } from '@/lib/services/dev-demo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dev', robots: { index: false, follow: false } };

/** A link that signs in as `key` first (the mf_dev_as cookie, /dev/as/<key>) and then opens `next`. A plain
 * <a>: a <Link> would prefetch it, and the prefetch would switch identity. */
function goAs(key: string, next: string): string {
  return `/dev/as/${key}?next=${encodeURIComponent(next)}`;
}

function Row({ href, label, note }: { href: string; label: string; note?: string }) {
  return (
    <li>
      <a href={href} className="mf-hairline flex min-h-11 items-center justify-between gap-4 rounded-[2px] px-3 py-2 hover:bg-[var(--tint-4)]">
        <span>{label}</span>
        {note ? <span className="mf-mono-note whitespace-nowrap">{note}</span> : null}
      </a>
    </li>
  );
}

function Group({ title, who, children }: { title: string; who: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="mf-label">{title}</h2>
        <span className="mf-mono-note">{who}</span>
      </div>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

function Pages({ links }: { links: DemoLinks }) {
  const { shop, designs } = links;
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Group title="Artist" who="as Artist">
        {designs.map((design) => (
          <Row
            key={design.designId}
            href={goAs('artist', `/studio/approve/${design.designId}`)}
            label={`Approve artwork · ${design.name}`}
            note={design.approved ? 'approved' : 'ready to approve'}
          />
        ))}
        <Row href={goAs('artist', '/studio')} label="Studio home" note="needs you, shop block" />
        <Row href={goAs('artist', '/studio?prompt=Show%20my%20products')} label="Studio products" note="press Enter to ask" />
        <Row href={goAs('artist', '/studio/billing')} label="Billing" note="payouts, runs" />
        {shop ? <Row href={`/${shop.slug}`} label={`Fan shop · ${shop.name}`} note={`/${shop.slug}`} /> : null}
      </Group>

      <Group title="Pre-press" who="as Pre-press (the Owner sees the same)">
        <Row href={goAs('prepress', '/admin/prepress')} label="Queue" note="waiting" />
        <Row href={goAs('prepress', '/admin/prepress?tab=approved')} label="Queue, approved" />
        {designs.flatMap((design) =>
          design.packs.map((pack) => (
            <Row key={pack.packId} href={goAs('prepress', `/admin/prepress/${pack.packId}`)} label={`${design.name} · ${pack.label}`} note={pack.audit} />
          )),
        )}
        <Row href={goAs('prepress', '/admin/ink-system')} label="Ink system" note="the shop's inks" />
        {designs.map((design) => (
          <Row key={design.designId} href={goAs('prepress', `/api/job-sheets/${design.designId}`)} label={`Job sheet · ${design.name}`} note="PDF" />
        ))}
      </Group>

      <Group title="Production" who="as Production">
        <Row href={goAs('production', '/admin/production')} label="Production" note="orders and runs" />
        <Row href={goAs('production', '/admin/supplier')} label="Supplier orders" />
      </Group>

      <Group title="Team" who="as Owner">
        <Row href={goAs('owner', '/admin/team')} label="Team" note="access by area" />
        <Row href={goAs('owner', '/admin/team/activity')} label="Activity" />
        <Row href={goAs('owner', '/admin/team/invites')} label="Invites" />
      </Group>
    </div>
  );
}

/** /dev (local demo mode): who the dev bypass signs in as, and the key pages of the print-prep build, each
 * link signing in as the right person first. Only while AUTH_DEV_BYPASS is on; anywhere else it is a 404
 * (and in production the proxy asks for sign-in before it gets that far). */
export default async function DevPage() {
  if (!DEV_BYPASS) notFound();

  const session = await getSession();
  const demoDir = localDemoDir();
  const links = demoDir ? await loadDemoLinks() : null;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-3">
        <p className="mf-mono-note">Dev only · AUTH_DEV_BYPASS</p>
        <h1 className="mf-display text-3xl">Sign in as</h1>
        <p className="mf-dimmed max-w-2xl text-sm">
          {session ? (
            <>
              You are <strong>{session.user.displayName ?? session.user.email}</strong> ({session.user.email}, {session.role === 'admin' ? 'owner' : session.role}).{' '}
            </>
          ) : null}
          {demoDir ? 'The data is the local demo database, not Neon.' : 'This is not local demo mode: the data is whatever DATABASE_URL points at.'}
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="who">
        <h2 id="who" className="mf-label">
          Identities
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEV_IDENTITIES.map((identity) => {
            const current = session?.user.clerkId === identity.clerkId;
            return (
              <li key={identity.key}>
                <a
                  href={`/dev/as/${identity.key}?next=/dev`}
                  aria-current={current ? 'true' : undefined}
                  className={`mf-hairline flex h-full flex-col gap-2 rounded-[2px] p-4 ${current ? 'bg-[var(--tint-8)]' : 'hover:bg-[var(--tint-4)]'}`}
                  style={current ? { border: 'var(--hairline-strong)' } : undefined}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-semibold">{identity.label}</span>
                    {current ? <span className="mf-mono-note">you</span> : null}
                  </span>
                  <span className="text-[13px] leading-5 opacity-80">{identity.blurb}</span>
                  <span className="mf-mono-note normal-case tracking-normal">{identity.displayName} · {identity.email}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="text-[13px]">
          {/* A plain anchor, never a <Link>: a prefetch of this address would clear the cookie. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/dev/as/default?next=/dev" className="mf-ulink">
            Back to the fixed dev user
          </a>
        </p>
      </section>

      {links ? (
        <section className="flex flex-col gap-6" aria-labelledby="pages">
          <h2 id="pages" className="mf-label">
            Key pages
          </h2>
          <Pages links={links} />
        </section>
      ) : demoDir ? (
        <p className="mf-dimmed max-w-2xl text-sm">No demo data was found in the local database. Build it with <code>npm run demo:local</code> (the dev server must be stopped first).</p>
      ) : null}
    </main>
  );
}
