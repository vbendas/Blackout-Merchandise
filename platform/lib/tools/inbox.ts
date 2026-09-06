import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool } from '@/lib/tools/types';
import { describeNotification, listNotifications, markRead, notificationPrompt } from '@/lib/services/inbox';

export const getInboxTool = defineTool({
  name: 'get_inbox',
  description:
    "Show the signed-in user's notification inbox (sales, proofs, admin items, system messages). Call this when they ask 'what's new', 'check my inbox/notifications', or right after onboarding to surface anything pending.",
  input: z.object({ unreadOnly: z.boolean().optional().describe('Only show unread items, default false.') }).strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx, input) => {
    const rows = await listNotifications(ctx.userId, input.unreadOnly ?? false);
    return {
      data: { count: rows.length, unread: rows.filter((r) => !r.readAt).length },
      ui: {
        cards: [
          {
            id: `inbox_${randomUUID()}`,
            kind: 'inbox',
            items: rows.map((r) => ({
              id: r.id,
              at: r.createdAt.toISOString(),
              text: describeNotification(r),
              unread: !r.readAt,
              prompt: notificationPrompt(r),
            })),
          },
        ],
      },
    };
  },
});

export const markInboxReadTool = defineTool({
  name: 'mark_inbox_read',
  description:
    "Mark inbox notifications as read. Call with specific ids after the user opens/acts on them, or all: true when they say 'mark everything read' / 'clear my inbox'.",
  input: z.object({ ids: z.array(z.string()).max(50).optional(), all: z.boolean().optional() }).strict(),
  scope: 'both',
  readOnly: false,
  run: async (ctx, input) => {
    const updated = await markRead(ctx.userId, input.all ? 'all' : (input.ids ?? []));
    return { data: { updated } };
  },
});
