import { describe, expect, it } from 'vitest';
import { feedbackTranslation, validateBundle } from '../shared/contracts';
import { fallbackBundle } from '../server/fixtures';
import { Jobs } from '../server/jobs';
import { FakePush } from '../server/providers';
import { register, setup } from './helpers';

describe('AI-03 completed Korean translations', () => {
  it.each(['오늘 _ 주세요.', '오늘 _ _ _ 주세요.', '오늘 □ 주세요.', '오늘 ___ 주세요.', '오늘 ＿＿＿ 주세요.', '오늘 □□ 주세요.', '오늘 [ ] 주세요.', '오늘 ( ) 주세요.', '   '])('rejects incomplete generated translation: %s', translation => {
    for (const field of ['translation', 'questionTranslation'] as const) {
      const bundle = fallbackBundle('2026-09-24');
      bundle.items[0][field] = translation;
      expect(() => validateBundle(bundle)).toThrow('빈칸 없는');
    }
  });
  it('preserves complete translations including punctuation', () => {
    const complete = '그는 시간을 냈어요 (친구를 위해).';
    expect(feedbackTranslation(complete)).toBe(complete);
    expect(validateBundle(fallbackBundle('2026-09-24')).items).toHaveLength(10);
  });
  it('rejects invalid AI output on each attempt and publishes validated fallback', async () => {
    const { store, clock } = setup();
    let calls = 0;
    const generator = { async generate(date: string) {
      calls++;
      const bundle = fallbackBundle(date);
      bundle.items[0].questionTranslation = '내일 ___ 주세요.';
      return { bundle, cost: 0 };
    } };
    const result = await new Jobs(store, clock, generator, new FakePush()).generate();
    expect(calls).toBe(3);
    expect(result.status).toBe('fallback');
    expect(validateBundle((await store.read()).lessons[result.date]).items).toHaveLength(10);
  });
  it('shows honest feedback for legacy content without changing the published lesson', async () => {
    const { store, service } = setup();
    const user = await register(service);
    await store.update(s => { s.lessons[user.view.date].items[0].questionTranslation = '오늘 ___ 주세요.'; });
    const lesson = structuredClone((await store.read()).lessons[user.view.date]);
    await service.execute(user.token, { action: 'startQuiz', date: user.view.date });
    const reply = await service.execute(user.token, { action: 'answer', date: user.view.date, target: 'daily', itemId: lesson.items[0].id, input: lesson.items[0].answers[0] });
    expect(reply.reply.feedback?.translation).toBe(feedbackTranslation('오늘 ___ 주세요.'));
    expect(reply.reply.feedback?.translation).toContain('해석을 준비하지 못했어요');
    expect((await store.read()).lessons[user.view.date]).toEqual(lesson);
  });
});
