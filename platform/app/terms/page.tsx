import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-2xl">Terms of Service</h1>
      <p className="mf-dim mt-4">Coming soon.</p>
    </div>
  );
}
