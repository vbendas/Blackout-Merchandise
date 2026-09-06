import { ChatShell } from '@/components/chat/ChatShell';
import { DEV_BYPASS, requireRegistered } from '@/lib/auth';

export default async function ChatPage() {
  await requireRegistered();
  return <ChatShell showUser={!DEV_BYPASS} />;
}
