import { ChatShell } from '@/components/chat/ChatShell';

/** /studio/s/<id>: opens that session. Keyed by id so switching sessions
 * remounts the conversation state cleanly. */
export default async function StudioSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <ChatShell key={sessionId} sessionId={sessionId} />;
}
