import { ChatShell } from '@/components/chat/ChatShell';
import { DEV_BYPASS, requireRegistered } from '@/lib/auth';

export default async function ChatPage() {
  const { role } = await requireRegistered();
  return <ChatShell showUser={!DEV_BYPASS} role={role} />;
}
