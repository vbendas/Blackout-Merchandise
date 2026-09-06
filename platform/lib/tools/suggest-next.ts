import { z } from 'zod';
import { defineTool } from '@/lib/tools/types';
import { chipSchema } from '@/lib/ui-cards/schemas';

export const suggestNextTool = defineTool({
  name: 'suggest_next',
  description:
    'Emit 2-5 short suggested next-step chips shown at the end of your turn so the user always has a clear next action. Call this once near the end of almost every response — unless another tool you already called this turn returned its own next-step chips, in which case skip it. Keep labels under ~24 characters and make prompts the exact message tapping the chip should send.',
  input: z
    .object({
      chips: z.array(chipSchema.strict()).min(1).max(5).describe('2-5 next-step suggestions.'),
    })
    .strict(),
  scope: 'both',
  readOnly: true,
  run: async (_ctx, input) => {
    return { data: { ok: true as const }, ui: { next: input.chips } };
  },
});
