'use client';

import { ChatShell } from '@/components/chat/ChatShell';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';

/** The /studio home. Keyed by the sidebar's New session counter: after the
 * first message the URL moves to /studio/s/<id> in place (no navigation), so
 * a later New session click must remount the shell to start over. */
export function StudioHome() {
  const { homeNonce } = useStudioSidebar();
  return <ChatShell key={homeNonce} />;
}
