import { z } from 'zod';
export const itemSchema = z.object({
  id: z.string().min(1).max(80), expression: z.string().min(1).max(80),
  kind: z.enum(['명사', '동사', '형용사', '부사', '표현', '구동사']),
  meaning: z.string().min(1).max(160), example: z.string().min(1).max(300),
  translation: z.string().min(1).max(300), question: z.string().min(1).max(300),
  questionTranslation: z.string().min(1).max(300), answers: z.array(z.string().min(1).max(100)).min(1).max(8),
});
export type Item = z.infer<typeof itemSchema>;
export const bundleSchema = z.object({ topic: z.string().min(1).max(60), items: z.array(itemSchema).length(10) });
export type Bundle = z.infer<typeof bundleSchema>;
export function normalize(s: string) { return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(); }
// Detect explicit cloze placeholders without inventing a missing Korean translation.
export function hasTranslationBlank(value: string): boolean {
  return /_|[□▢◻]|\[\s*\]|\(\s*\)/u.test(value.normalize('NFKC')) || !value.trim();
}
export function feedbackTranslation(value: string): string {
  return hasTranslationBlank(value) ? '이 문제의 해석을 준비하지 못했어요. 완성된 영어 예문과 정답을 확인해 주세요.' : value;
}
export function validateBundle(input: unknown): Bundle {
  const result = bundleSchema.parse(input);
  if (new Set(result.items.map(i => normalize(i.expression))).size !== 10 || new Set(result.items.map(i => i.id)).size !== 10) throw new Error('중복된 표현 또는 ID');
  for (const i of result.items) {
    if (hasTranslationBlank(i.questionTranslation) || hasTranslationBlank(i.translation)) throw new Error('해석에는 빈칸 없는 완성된 한국어 문장이 필요합니다.');
    if (i.question.split('___').length !== 2 || normalize(i.example) === normalize(i.question.replace('___', i.answers[0]))) throw new Error('퀴즈는 빈칸 하나와 새로운 예문이 필요합니다.');
    if (!i.answers.some(a => normalize(i.question.replace('___', a)) !== normalize(i.example))) throw new Error('예문 중복');
  }
  return result;
}
export type Card = Pick<Item, 'id' | 'expression' | 'kind' | 'meaning' | 'example' | 'translation'>;
export type Attempt = { itemId: string; expression: string; input: string; correct: boolean; expected: string; sentence: string; translation: string; hinted: boolean; at: string };
export type Question = { id: string; sentence: string; hint?: string };
export type View = {
  date: string; user: null | { name: string; id: string };
  lesson?: { topic: string; source: 'ai' | 'fallback'; items: Card[] };
  progress?: { card: number; cardsDone: boolean; answers: Attempt[]; completedAt?: string };
  question?: Question;
  retry?: { id: string; total: number; answers: Attempt[]; question?: Question };
  review?: { due: number; session?: { id: string; total: number; answers: Attempt[]; question?: Question } };
  stats?: { completedDays: number; learned: number; recent: { date: string; count: number; correct: number }[]; recall3: { total: number; correct: number }; recall7: { total: number; correct: number } };
  pushPublicKey?: string; pushEnabled?: boolean;
};
export type Reply = { view: View; feedback?: Attempt; recoveryCode?: string };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const target = z.enum(['daily', 'review', 'retry']);
export const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).min(80).max(100), auth: z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).min(20).max(30) }),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
export const NICKNAME_MAX_LENGTH = 10;
const nicknameSchema = z.string().trim().min(1).max(NICKNAME_MAX_LENGTH);
export const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('register'), name: nicknameSchema }),
  z.object({ action: z.literal('recover'), code: z.string().trim().min(20).max(100) }),
  z.object({ action: z.literal('rename'), name: nicknameSchema }),
  z.object({ action: z.literal('rotateRecovery') }),
  z.object({ action: z.literal('card'), date, index: z.number().int().min(0).max(9) }),
  z.object({ action: z.literal('startQuiz'), date }),
  z.object({ action: z.literal('hint'), date, target, itemId: z.string().max(80), sessionId: z.string().optional() }),
  z.object({ action: z.literal('answer'), date, target, itemId: z.string().max(80), input: z.string().trim().min(1).max(120), sessionId: z.string().optional() }),
  z.object({ action: z.literal('startReview') }),
  z.object({ action: z.literal('startRetry'), date, previousSessionId: z.string().optional() }),
  z.object({ action: z.literal('subscribe'), subscription: subscriptionSchema }),
  z.object({ action: z.literal('unsubscribe'), endpoint: z.string().url().max(2000) }),
  z.object({ action: z.literal('logout') }),
]);
export type Command = z.infer<typeof commandSchema>;
