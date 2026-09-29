import { randomUUID } from 'node:crypto';
import type { SpeechRequest, SpeechPending } from '../shared/speech.js';
import type { Item } from '../shared/contracts.js';
import type { Store } from './store.js';
import type { State } from './model.js';
import { type Clock, koreanDate } from './clock.js';
import { AppError, authenticate, hash } from './service.js';
import { speechVersion, type SpeechGenerator } from './speech-provider.js';
import type { AudioFile, AudioStore } from './speech-store.js';
export class SpeechService {
  constructor(private store: Store<State>, private clock: Clock, private audio: AudioStore, private generator: SpeechGenerator | undefined, private budget = 1) {}
  async request(token: string | undefined, request: SpeechRequest) {
    const state = await this.store.read();
    authenticate(state, token, this.clock.now());
    const item = request.date <= koreanDate(this.clock.now()) && state.lessons[request.date]?.items.find(i => i.id === request.itemId);
    if (!item) throw new AppError(404, '표현을 찾을 수 없어요.');
    return this.generate(item, request.target);
  }
  async generate(item: Item, target: SpeechRequest['target']): Promise<AudioFile | SpeechPending> {
    const text = item[target], context = item.example + ' Meaning: ' + item.meaning;
    const key = hash(JSON.stringify([speechVersion, text, context])), now = this.clock.now();
    const cached = await this.audio.get(key, now);
    if (cached) return cached;
    if (!this.generator) throw new AppError(503, '고품질 음성을 사용하려면 서버의 OpenAI API 키 설정이 필요해요.');
    const owner = randomUUID(), jobKey = 'speech:' + key, month = 'tts:' + koreanDate(now).slice(0, 7);
    // Conservative usage allowance, NOT a provider-enforced billing cap. Keep it charged
    // on success, timeout or process death; this API does not return reliable usage totals.
    const allowance = .0002 + (text.length + context.length * .05) * .00003;
    const status = await this.store.update(s => {
      const job = s.jobs[jobKey];
      if (job?.status === 'running' && job.until > now.toISOString()) return 'pending';
      const attempts = job?.status === 'done' ? 0 : job?.attempts ?? 0;
      if (attempts >= 2) return 'failed';
      const b = s.budgets[month] ??= { reserved: 0, spent: 0 };
      if (b.spent + b.reserved + allowance > this.budget) return 'budget';
      b.spent += allowance;
      s.jobs[jobKey] = { status: 'running', owner, until: new Date(now.getTime() + 60000).toISOString(), attempts: attempts + 1 };
      return 'claimed';
    });
    if (status === 'pending') return { status: 'pending', retryAfterMs: 1500 };
    if (status === 'budget') throw new AppError(429, '이번 달 음성 생성 예산을 모두 사용했어요. 저장된 음성은 계속 들을 수 있어요.');
    if (status === 'failed') throw new AppError(503, '이 음성의 생성 시도 한도에 도달했어요. 기기 음성으로 들을 수 있어요.');
    try {
      // Close the cache-read/claim race when another request just completed.
      const existing = await this.audio.get(key, this.clock.now());
      const result = existing ?? await this.generator.generate(text, context);
      if (!result.bytes.length || result.bytes.length > 1024 * 1024) throw new Error('Invalid audio size');
      if ((await this.store.read()).jobs[jobKey]?.owner !== owner) return { status: 'pending', retryAfterMs: 1500 };
      await this.audio.put(key, result, this.clock.now());
      await this.store.update(s => {
        if (s.jobs[jobKey]?.owner === owner) s.jobs[jobKey].status = 'done';
        if (existing) s.budgets[month].spent = Math.max(0, s.budgets[month].spent - allowance);
      });
      return result;
    } catch {
      await this.store.update(s => { if (s.jobs[jobKey]?.owner === owner) s.jobs[jobKey].status = 'failed'; });
      throw new AppError(503, '음성을 준비하지 못했어요. 다시 시도하거나 기기 음성으로 들어 주세요.');
    }
  }
  async warm(date: string, deadline: number) {
    if (!this.generator) return;
    const lesson = (await this.store.read()).lessons[date];
    if (!lesson) return;
    for (const item of lesson.items) for (const target of ['expression', 'example'] as const) {
      if (Date.now() + 30000 > deadline) return;
      try { await this.generate(item, target); }
      catch (e) { console.info(JSON.stringify({ event: 'speech_warm_failed', date, itemId: item.id, target, status: e instanceof AppError ? e.status : 500 })); if (e instanceof AppError && e.status === 429) return; }
    }
  }
}
