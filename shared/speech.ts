import { z } from 'zod';
export const speechRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemId: z.string().min(1).max(80),
  target: z.enum(['expression', 'example']),
}).strict();
export type SpeechRequest = z.infer<typeof speechRequestSchema>;
export type SpeechPending = { status: 'pending'; retryAfterMs: number };
