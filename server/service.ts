import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Store } from './store.js';
import { addDays, koreanDate, type Clock } from './clock.js';
import { fallbackBundle } from './fixtures.js';
import { feedbackTranslation, normalize, type Attempt, type Command, type Item, type Question, type Reply, type View } from '../shared/contracts.js';
import type { Progress, State, User } from './model.js';
export class AppError extends Error { constructor(public status: number, message: string) { super(message); } }
export const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const secret = () => randomBytes(24).toString('base64url');
const emptyProgress = (): Progress => ({ card: 0, cardsDone: false, answers: [], hints: [] });
export function ensureLesson(s: State, date: string) {
  return s.lessons[date] ??= { ...fallbackBundle(date), date, source: 'fallback' };
}
function question(item: Item | undefined, hints: string[]): Question | undefined {
  return item ? { id: item.id, sentence: item.question, ...(hints.includes(item.id) ? { hint: item.meaning } : {}) } : undefined;
}
function dueKeys(u: User, date: string) {
  return Object.keys(u.reviews).filter(k => u.reviews[k].due <= date).sort((a,b) => Number(u.reviews[b].wrong) - Number(u.reviews[a].wrong) || u.reviews[a].due.localeCompare(u.reviews[b].due));
}
export function authenticate(s: State, token: string | undefined, now: Date) {
  if (!token) throw new AppError(401, '다시 시작하거나 복구 코드를 입력해 주세요.');
  const digest = hash(token);
  const user = Object.values(s.users).find(u => u.sessions.some(t => t.hash === digest && t.expires > now.toISOString()));
  if (!user) throw new AppError(401, '세션이 만료되었습니다. 복구 코드로 이어가세요.');
  return user;
}
type Execution = { reply: Reply; token?: string; clear?: boolean };
type Outcome = Execution | { failure: { status: number; message: string } };
export class AppService {
 constructor(public store: Store<State>, public clock: Clock, private pushPublicKey = '') {}
 private snapshot(s: State, u: User | null): View {
   const date = koreanDate(this.clock.now());
   if (!u) return { date, user: null };
   const l = ensureLesson(s, date), p = u.progress[date] ?? emptyProgress();
   const session = u.reviewSession?.date === date ? u.reviewSession : undefined;
   const observations = Object.values(u.reviews).flatMap(r => r.observations);
   const recall = (age: number) => { const o = observations.filter(x => x.age === age && !x.hinted); return { total: o.length, correct: o.filter(x => x.correct).length }; };
   return {
     date, user: { id: u.id, name: u.name }, lesson: { topic: l.topic, source: l.source, items: l.items.map(({id,expression,kind,meaning,example,translation}) => ({id,expression,kind,meaning,example,translation})) },
     progress: { card: p.card, cardsDone: p.cardsDone, answers: p.answers, completedAt: p.completedAt },
     question: p.cardsDone ? question(l.items[p.answers.length], p.hints) : undefined,
     retry: p.retrySession ? { id:p.retrySession.id, total:p.retrySession.itemIds.length, answers:p.retrySession.answers, question:question(l.items.find(i=>i.id===p.retrySession!.itemIds[p.retrySession!.answers.length]),p.retrySession.hints) } : undefined,
     review: { due: dueKeys(u,date).length, session: session ? { id:session.id, total: session.keys.length, answers:session.answers, question:question(u.reviews[session.keys[session.answers.length]]?.item, session.hints) } : undefined },
     stats: { completedDays:Object.values(u.progress).filter(p => p.completedAt).length, learned: Object.keys(u.reviews).length, recent:Object.entries(u.progress).sort(([a],[b]) => b.localeCompare(a)).slice(0,14).map(([date,p]) => ({date,count:p.answers.length,correct:p.answers.filter(a=>a.correct).length})), recall3:recall(3), recall7:recall(7) },
     pushPublicKey: this.pushPublicKey, pushEnabled:u.subscriptions.length > 0,
   };
 }
 async view(token?: string): Promise<View> {
   return this.store.update(s => {
     if (!token) return this.snapshot(s,null);
     const u = authenticate(s,token,this.clock.now());
     return this.snapshot(s,u);
   });
 }
 async execute(token: string | undefined, cmd: Command, clientKey = 'local'): Promise<{ reply: Reply; token?: string; clear?: boolean }> {
   const now = this.clock.now(), today = koreanDate(now);
   const freshToken = secret(), recovery = secret(), newId = randomUUID();
   return this.store.update<Outcome>(s => {
     // Expired anonymous rate-limit buckets and sessions must not accumulate indefinitely.
     for (const [k,v] of Object.entries(s.limits)) if (v.until < now.getTime()) delete s.limits[k];
     if (cmd.action === 'register' || cmd.action === 'recover') {
       const key = hash(clientKey), entry = s.limits[key] ??= { count: 0, until: now.getTime()+15*60000 };
       if (entry.count >= 15) return { failure: {status:429,message:'잠시 후 다시 시도해 주세요.'} };
       entry.count++;
       let u: User;
       if (cmd.action === 'register') {
         u = { id:newId, name:cmd.name, createdAt:now.toISOString(), recoveryHash:hash(recovery), sessions:[], progress:{}, reviews:{}, subscriptions:[] };
         s.users[u.id] = u;
       } else {
         const found = Object.values(s.users).find(u => u.recoveryHash === hash(cmd.code));
         if (!found) return { failure: {status:400,message:'복구 코드를 확인해 주세요.'} };
         u = found;
       }
       u.sessions = u.sessions.filter(t => t.expires > now.toISOString()).slice(-9);
       u.sessions.push({ hash:hash(freshToken), expires:new Date(now.getTime()+90*86400000).toISOString() });
       return { token:freshToken, reply:{ view:this.snapshot(s,u), ...(cmd.action==='register' ? {recoveryCode:recovery}: {}) } };
     }
     const u = authenticate(s,token,now);
     if ('date' in cmd && cmd.date !== today) throw new AppError(409,'날짜가 바뀌었습니다. 홈에서 오늘의 학습을 시작해 주세요.');
     let feedback: Attempt | undefined;
     if (cmd.action === 'logout') {
       u.sessions = u.sessions.filter(t => t.hash !== hash(token!));
       return { clear:true, reply:{view:this.snapshot(s,null)} };
     }
     if (cmd.action === 'rename') u.name = cmd.name;
     if (cmd.action === 'rotateRecovery') { u.recoveryHash = hash(recovery); return {reply:{view:this.snapshot(s,u),recoveryCode:recovery}}; }
     const lesson = ensureLesson(s,today), p = u.progress[today] ??= emptyProgress();
     if (cmd.action === 'card') p.card = cmd.index;
     if (cmd.action === 'startQuiz') p.cardsDone = true;
     if (cmd.action === 'startRetry') {
       if (!p.completedAt) throw new AppError(409,'오늘의 퀴즈를 먼저 완료해 주세요.');
       const itemIds = p.answers.filter(a=>!a.correct).map(a=>a.itemId);
       if (!itemIds.length) throw new AppError(409,'다시 풀 오답이 없어요.');
       const previous = p.retrySession;
       // Replayed starts resume; only a completed session's exact ID can restart it.
       if (!previous || (previous.id===cmd.previousSessionId && previous.answers.length===previous.itemIds.length)) {
         p.retrySession = {id:newId,itemIds,answers:[],hints:[]};
       }
     }
     if (cmd.action === 'startReview') {
       if (!u.reviewSession || u.reviewSession.date !== today || u.reviewSession.answers.length === u.reviewSession.keys.length) {
         u.reviewSession = {id:newId,date:today,keys:dueKeys(u,today).slice(0,10),answers:[],hints:[]};
       }
     }
     if (cmd.action === 'answer' || cmd.action === 'hint') {
       const review = cmd.target === 'review';
       const retry = cmd.target === 'retry';
       const session = u.reviewSession;
       const retrySession = p.retrySession;
       if (retry && (!p.completedAt || !retrySession || retrySession.id !== cmd.sessionId)) throw new AppError(409,'오답 다시 풀기를 다시 열어 주세요.');
       if (review && (!session || session.date !== today || session.id !== cmd.sessionId)) throw new AppError(409,'복습을 다시 시작해 주세요.');
       if (!review && !p.cardsDone) throw new AppError(409,'카드를 먼저 확인해 주세요.');
       const answers = retry ? retrySession!.answers : review ? session!.answers : p.answers;
       const hints = retry ? retrySession!.hints : review ? session!.hints : p.hints;
       const old = answers.find(a => a.itemId === cmd.itemId);
       if (old) feedback = old;
       else {
         const key = review ? session!.keys[answers.length] : undefined;
         const item = retry ? lesson.items.find(i=>i.id===retrySession!.itemIds[answers.length]) : review ? u.reviews[key!]?.item : lesson.items[answers.length];
         if (!item || item.id !== cmd.itemId) throw new AppError(409,'현재 문제와 일치하지 않습니다. 다시 불러와 주세요.');
         if (cmd.action === 'hint') { if (!hints.includes(item.id)) hints.push(item.id); }
         else {
           feedback = {itemId:item.id,expression:item.expression,input:cmd.input,correct:item.answers.some(a => normalize(a)===normalize(cmd.input)), expected:item.answers[0],sentence:item.question.replace('___',item.answers[0]),translation:feedbackTranslation(item.questionTranslation),hinted:hints.includes(item.id),at:now.toISOString()};
           answers.push(feedback);
           if (!retry) {
           const rk = normalize(item.expression), prev = u.reviews[rk];
           const stage = feedback.correct ? (review ? Math.min((prev?.stage ?? -1)+1,3) : 0) : -1;
           const gap = feedback.correct ? [1,3,7,14][stage] : 1;
           const learnedAt = prev?.learnedAt ?? today;
           const observations = prev?.observations ?? [];
           const age = Math.round((Date.parse(today)-Date.parse(learnedAt))/86400000);
           if (review && !observations.some(o=>o.date===today)) observations.push({date:today,correct:feedback.correct,hinted:feedback.hinted,age});
           u.reviews[rk] = {item,stage,due:addDays(today,gap),wrong:!feedback.correct,learnedAt,lastAt:today,observations};
           if (!review && answers.length===10) p.completedAt ??= now.toISOString();
           }
         }
       }
     }
     if (cmd.action === 'subscribe') {
       const url = new URL(cmd.subscription.endpoint);
       const allowed = ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','notify.windows.com'];
       if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed.some(h=>url.hostname===h || url.hostname.endsWith('.'+h))) throw new AppError(400,'지원하지 않는 푸시 주소입니다.');
       for (const person of Object.values(s.users)) person.subscriptions = person.subscriptions.filter(x=>x.endpoint!==cmd.subscription.endpoint);
       if (u.subscriptions.length >= 5) throw new AppError(400,'연결된 기기가 너무 많습니다.');
       u.subscriptions.push(cmd.subscription);
     }
     if (cmd.action === 'unsubscribe') u.subscriptions = u.subscriptions.filter(x=>x.endpoint!==cmd.endpoint);
     return {reply:{view:this.snapshot(s,u),feedback}};
   }).then(result => {
     if ('failure' in result) throw new AppError(result.failure.status,result.failure.message);
     return result;
   });
 }
}
