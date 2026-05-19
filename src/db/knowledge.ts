import { db } from './index';
import { appSettings } from './schema';
import { eq, sql } from 'drizzle-orm';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedPrompt: string | null = null;
let cachedAt = 0;

export async function getAllSettings() {
    return db.select().from(appSettings);
}

export async function getSetting(key: string) {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return row ?? null;
}

export async function updateSetting(key: string, value: string, valueJson?: unknown) {
    await db.insert(appSettings)
        .values({ key, value, valueJson: valueJson ?? null })
        .onConflictDoUpdate({
            target: appSettings.key,
            set: {
                value,
                valueJson: valueJson ?? null,
                updatedAt: sql`NOW()`,
            },
        });
}

export async function getKnowledgeForPrompt(): Promise<string> {
    const now = Date.now();
    if (cachedPrompt !== null && now - cachedAt < CACHE_TTL_MS) {
        return cachedPrompt;
    }

    const settings = await db.select().from(appSettings);

    if (settings.length === 0) {
        cachedPrompt = '';
        cachedAt = now;
        return '';
    }

    const lines: string[] = [
        '--- VERIFIED FACTS ABOUT MERCHFROM ---',
    ];

    for (const s of settings) {
        if (s.valueJson != null) {
            lines.push(`${s.key}: ${JSON.stringify(s.valueJson)}`);
        } else {
            lines.push(`${s.key}: ${s.value}`);
        }
    }

    lines.push('');
    lines.push('NOTE: Only use the facts above when answering. If unsure, say you don\'t know rather than guessing.');

    cachedPrompt = lines.join('\n');
    cachedAt = now;
    return cachedPrompt;
}

export function clearKnowledgeCache() {
    cachedPrompt = null;
    cachedAt = 0;
}
