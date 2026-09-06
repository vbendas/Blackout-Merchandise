import type { ReactNode } from 'react';
import { RegisterMark } from '@/components/RegisterMark';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3">
        <RegisterMark className="h-6 w-6 text-signal" />
        <span className="label mf-dim">MERCHFROM</span>
      </div>
      {children}
    </div>
  );
}
