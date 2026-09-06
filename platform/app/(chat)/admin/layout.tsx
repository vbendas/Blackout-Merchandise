import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import '@/components/chat/tokens.css';

// Admin surface: the morning queue lives in chat, but bulk tables (this
// layout's children) are dedicated pages. Gated here so both pages inherit
// the same check — role !== 'admin' bounces straight back to chat.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  if (session.role !== 'admin') redirect('/chat');

  return (
    <div style={{ minHeight: '100dvh' }}>
      <header className="mf-hairline-b flex items-center justify-between px-6 py-4">
        <div className="mf-label mf-display">MerchFrom · Admin</div>
        <nav className="flex items-center gap-5 text-[13px]">
          <Link href="/chat" className="mf-dimmed hover:opacity-100">
            Chat
          </Link>
          <Link href="/admin/production" className="mf-dimmed hover:opacity-100">
            Production
          </Link>
          <Link href="/admin/supplier" className="mf-dimmed hover:opacity-100">
            Supplier
          </Link>
        </nav>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
