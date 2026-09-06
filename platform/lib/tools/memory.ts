import { z } from 'zod';
import { defineTool } from '@/lib/tools/types';
import { rememberFact } from '@/lib/services/memory';

export const rememberTool = defineTool({
  name: 'remember',
  description:
    "Save one short, durable fact about the artist's brand, taste, or past decisions for future conversations (e.g. 'prefers pastel palettes', 'never wants glitter print'). Use sparingly — only for preferences worth recalling later, not one-off request details. Returns no visible card.",
  input: z.object({ fact: z.string().min(3).max(300).describe('One short, self-contained fact, third person.') }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<{ data: { ok: boolean } }> => {
    if (!ctx.storeId) return { data: { ok: false } };
    await rememberFact(ctx.storeId, input.fact.trim());
    return { data: { ok: true } };
  },
});
