'use client';

import type { ReactNode } from 'react';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';

/** A link-styled button that opens a fresh Studio session and sends `prompt`
 * there (the artist's own click, so it sends; see askStudio). */
export function AskStudioLink({
  prompt,
  className,
  label,
  children,
}: {
  prompt: string;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const { askStudio } = useStudioSidebar();
  return (
    <button type="button" className={className} aria-label={label} onClick={() => askStudio(prompt)}>
      {children}
    </button>
  );
}
