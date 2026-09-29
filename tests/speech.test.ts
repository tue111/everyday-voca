import { describe, it, expect } from 'vitest';
import { setup, register } from './helpers';
import { SpeechService } from '../server/speech';
import { MemoryAudioStore } from '../server/speech-store';
import { FakeSpeechGenerator, type SpeechGenerator } from '../server/speech-provider';
function harness(generator: SpeechGenerator = new FakeSpeechGenerator(), budget = 1) {
  const h = setup(), audio = new MemoryAudioStore();
  return { ...h, audio, generator, speech: new SpeechService(h.store, h.clock, audio, generator, budget) };
}
describe('SPEECH-01/02', () => {
  it('shares audio between users and prevents concurrent paid generation', async () => {
    const h = harness(), a = await register(h.service), b = await register(h.service, '나래');
    const request = { date: a.view.date, itemId: a.view.lesson!.items[0].id, target: 'expression' as const };
    const results = await Promise.all([h.speech.request(a.token, request), h.speech.request(b.token, request)]);
    expect(results.some(r => 'bytes' in r)).toBe(true);
    expect((h.generator as FakeSpeechGenerator).calls).toBe(1);
    expect(await h.speech.request(b.token, request)).toHaveProperty('bytes');
    expect((h.generator as FakeSpeechGenerator).calls).toBe(1);
  });
  it('rejects anonymous requests and future content without calling a provider', async () => {
    const h = harness(), a = await register(h.service);
    const request = { date: a.view.date, itemId: a.view.lesson!.items[0].id, target: 'example' as const };
    await expect(h.speech.request(undefined, request)).rejects.toMatchObject({ status: 401 });
    await expect(h.speech.request(a.token, { ...request, date: '2026-09-25' })).rejects.toMatchObject({ status: 404 });
    expect((h.generator as FakeSpeechGenerator).calls).toBe(0);
  });
  it('blocks spending before a call and retains learning data', async () => {
    const h = harness(new FakeSpeechGenerator(), 0), a = await register(h.service), before = await h.service.view(a.token);
    await expect(h.speech.request(a.token, { date: a.view.date, itemId: a.view.lesson!.items[0].id, target: 'example' })).rejects.toMatchObject({ status: 429 });
    expect((h.generator as FakeSpeechGenerator).calls).toBe(0);
    expect(await h.service.view(a.token)).toEqual(before);
  });
  it('charges uncertain failures, limits retries, and never serves failed output', async () => {
    let calls = 0;
    const h = harness({ async generate() { calls++; throw new Error('timeout'); } }), a = await register(h.service);
    const request = { date: a.view.date, itemId: a.view.lesson!.items[0].id, target: 'expression' as const };
    await expect(h.speech.request(a.token, request)).rejects.toMatchObject({ status: 503 });
    await expect(h.speech.request(a.token, request)).rejects.toMatchObject({ status: 503 });
    await expect(h.speech.request(a.token, request)).rejects.toMatchObject({ status: 503 });
    expect(calls).toBe(2); expect(h.audio.entries.size).toBe(0);
    expect((await h.store.read()).budgets['tts:2026-09'].spent).toBeGreaterThan(0);
  });
  it('expires audio after 30 idle days but refreshes retention on access', async () => {
    const store = new MemoryAudioStore(), file = await new FakeSpeechGenerator().generate();
    await store.put('key', file, new Date('2026-01-01'));
    expect(await store.get('key', new Date('2026-01-29'))).toEqual(file);
    expect(await store.get('key', new Date('2026-03-01'))).toBeUndefined();
  });
});
