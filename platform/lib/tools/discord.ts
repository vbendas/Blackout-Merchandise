import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type ToolResult } from '@/lib/tools/types';
import { linkStatus, setPrefs, unlink } from '@/lib/services/discord';
import type { Card } from '@/lib/ui-cards/schemas';

const LINK_URL = '/api/discord/link';

function linkCard(id: string, status: { linked: boolean; username: string | null; discordDm: boolean }): Card {
  return {
    id,
    kind: 'discord_link',
    linked: status.linked,
    discordUsername: status.username ?? undefined,
    dmEnabled: status.discordDm,
    linkUrl: status.linked ? undefined : LINK_URL,
  };
}

function noticeCard(id: string, tone: 'info' | 'success' | 'warning' | 'error', text: string): Card {
  return { id, kind: 'notice', tone, text };
}

interface ConnectDiscordData {
  linked: boolean;
}

export const connectDiscordTool = defineTool({
  name: 'connect_discord',
  description:
    "Show whether the artist's Discord account is linked, and how to link it if not. Blackout Merchandise can DM proofs ready, new sales, shipping updates and payouts to Discord — it's optional and can be turned off any time with update_notification_prefs. Call this when the artist asks to connect/link Discord, or wants to see their Discord status.",
  input: z.object({}).strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx): Promise<ToolResult<ConnectDiscordData>> => {
    const status = await linkStatus(ctx.userId);
    return { data: { linked: status.linked }, ui: { cards: [linkCard(`discord_link_${ctx.userId}`, status)] } };
  },
});

interface DisconnectDiscordData {
  ok: true;
}

export const disconnectDiscordTool = defineTool({
  name: 'disconnect_discord',
  description:
    'Unlink the Discord account and stop Discord DMs. Sensitive action: shows a confirm card and only executes once the human clicks confirm.',
  input: z.object({}).strict(),
  scope: 'both',
  confirm: true,
  summarize: () => 'Disconnect Discord and stop Discord DMs.',
  run: async (ctx): Promise<ToolResult<DisconnectDiscordData>> => {
    await unlink(ctx.userId);
    return {
      data: { ok: true },
      ui: { cards: [linkCard(`discord_link_${ctx.userId}`, { linked: false, username: null, discordDm: false })] },
    };
  },
});

interface UpdatePrefsData {
  discordDm: boolean;
  email: boolean;
}

export const updateNotificationPrefsTool = defineTool({
  name: 'update_notification_prefs',
  description:
    "Turn Discord DMs and/or email notifications on or off, e.g. 'turn off Discord DMs' or 'stop emailing me about sales'. Omit a field to leave it unchanged. Call with no fields to just show the current settings.",
  input: z.object({ discordDm: z.boolean().optional(), email: z.boolean().optional() }).strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult<UpdatePrefsData>> => {
    const hasPatch = input.discordDm !== undefined || input.email !== undefined;
    if (hasPatch) await setPrefs(ctx.userId, input);

    const status = await linkStatus(ctx.userId);
    const notice = noticeCard(
      `notice_${randomUUID()}`,
      'success',
      hasPatch ? 'Notification settings updated.' : 'Here are your current notification settings.',
    );
    return {
      data: { discordDm: status.discordDm, email: status.email },
      ui: { cards: [linkCard(`discord_link_${ctx.userId}`, status), notice] },
    };
  },
});

export const DISCORD_TOOLS = [connectDiscordTool, disconnectDiscordTool, updateNotificationPrefsTool];
