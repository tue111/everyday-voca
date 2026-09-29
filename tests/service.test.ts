import { describe,it,expect } from 'vitest';
import { setup,register,complete } from './helpers';
import { addDays,koreanDate } from '../server/clock';
import { commandSchema,normalize,validateBundle } from '../shared/contracts';
import { fallbackBundle } from '../server/fixtures';
describe('AUTH-01/02 identity and recovery',()=>{
 it('isolates matching names and stores only hashed credentials',async()=>{
  const{service,store}=setup(),a=await register(service),b=await register(service);
  expect(a.id).not.toBe(b.id);
  await service.execute(a.token,{action:'rename',name:'수정'});
  expect((await service.view(b.token)).user!.name).toBe('지민');
  const state=JSON.stringify(await store.read());expect(state).not.toContain(a.token);expect(state).not.toContain(a.code);
  const recovered=await service.execute(undefined,{action:'recover',code:a.code});expect(recovered.reply.view.user!.id).toBe(a.id);
 });
 it('rotates recovery, expires sessions and logs out only the current session',async()=>{
  const{service,clock}=setup(),a=await register(service);
  const b=await service.execute(undefined,{action:'recover',code:a.code});
  const rotated=await service.execute(a.token,{action:'rotateRecovery'});
  await expect(service.execute(undefined,{action:'recover',code:a.code})).rejects.toThrow('복구 코드');
  expect((await service.execute(undefined,{action:'recover',code:rotated.reply.recoveryCode!})).reply.view.user!.id).toBe(a.id);
  await service.execute(a.token,{action:'logout'});
  await expect(service.view(a.token)).rejects.toMatchObject({status:401});
  expect((await service.view(b.token)).user!.id).toBe(a.id);
  clock.set('2027-01-01T00:00:00Z');await expect(service.view(b.token)).rejects.toMatchObject({status:401});
 });
 it('counts failed recoveries toward the rate limit',async()=>{
  const{service}=setup();
  for(let i=0;i<15;i++)await expect(service.execute(undefined,{action:'recover',code:'invalid-code-xxxxxxxxxxxx'})).rejects.toMatchObject({status:400});
  await expect(service.execute(undefined,{action:'register',name:'test'})).rejects.toMatchObject({status:429});
 });
});
describe('DAY / QUIZ / CARD',()=>{
 it('uses Korean midnight and calendar intervals',()=>{
  expect(koreanDate(new Date('2026-09-24T14:59:59Z'))).toBe('2026-09-24');
  expect(koreanDate(new Date('2026-09-24T15:00:00Z'))).toBe('2026-09-25');
  expect(addDays('2028-02-28',1)).toBe('2028-02-29');
 });
 it('has valid distinct card and quiz examples in all three fallback banks',()=>{
  for(let i=0;i<3;i++)expect(validateBundle(fallbackBundle(addDays('2026-09-24',i))).items).toHaveLength(10);
  const bad=fallbackBundle('2026-09-24');bad.items[1]=bad.items[0];expect(()=>validateBundle(bad)).toThrow();
 });
 it('shares a lesson without exposing quiz answers; preserves card progress',async()=>{
  const{service}=setup(),a=await register(service),b=await register(service);
  expect(a.view.lesson).toEqual(b.view.lesson);
  expect(JSON.stringify(a.view)).not.toContain('questionTranslation');
  await service.execute(a.token,{action:'card',date:a.view.date,index:4});
  expect((await service.view(a.token)).progress!.card).toBe(4);expect((await service.view(b.token)).progress!.card).toBe(0);
 });
 it('grades whitespace and case; persists hint use; rejects blank input at the contract',async()=>{
  const{service,store}=setup(),a=await register(service);await service.execute(a.token,{action:'startQuiz',date:a.view.date});
  const item=(await store.read()).lessons[a.view.date].items[0];
  await service.execute(a.token,{action:'hint',date:a.view.date,target:'daily',itemId:item.id});
  const r=await service.execute(a.token,{action:'answer',date:a.view.date,target:'daily',itemId:item.id,input:'  '+item.answers[0].toUpperCase().replaceAll(' ','   ')+'  '});
  expect(r.reply.feedback).toMatchObject({correct:true,hinted:true});
  expect(normalize(' Ａ  b ')).toBe('a b');
  expect(commandSchema.safeParse({action:'answer',date:a.view.date,target:'daily',itemId:item.id,input:' '}).success).toBe(false);
 });
 it('allows explicit grammatical variants and does not accept unlisted synonyms',async()=>{
  const{service,store}=setup(),a=await register(service);
  await store.update(s=>{s.lessons[a.view.date].items[0].answers=['picked up','has picked up'];});
  await service.execute(a.token,{action:'startQuiz',date:a.view.date});
  const id=a.view.lesson!.items[0].id;
  const r=await service.execute(a.token,{action:'answer',date:a.view.date,target:'daily',itemId:id,input:'HAS PICKED UP'});
  expect(r.reply.feedback!.correct).toBe(true);
 });
 it('handles concurrent duplicate submissions exactly once and completes only after 10',async()=>{
  const{service,store}=setup(),a=await register(service);
  await service.execute(a.token,{action:'startQuiz',date:a.view.date});
  const items=(await store.read()).lessons[a.view.date].items;
  const cmd={action:'answer' as const,date:a.view.date,target:'daily' as const,itemId:items[0].id,input:'wrong'};
  const replies=await Promise.all([service.execute(a.token,cmd),service.execute(a.token,cmd)]);
  expect(replies[0].reply.feedback).toEqual(replies[1].reply.feedback);
  expect((await service.view(a.token)).progress!.answers).toHaveLength(1);
  for(const i of items.slice(1,9))await service.execute(a.token,{...cmd,itemId:i.id});
  expect((await service.view(a.token)).progress!.completedAt).toBeUndefined();
  await service.execute(a.token,{...cmd,itemId:items[9].id});
  expect((await service.view(a.token)).progress!.completedAt).toBeTruthy();
 });
 it('rejects out-of-order submissions and stale dates, does not create missed-day assignments',async()=>{
  const{service,clock}=setup(),a=await register(service);
  await service.execute(a.token,{action:'startQuiz',date:a.view.date});
  await expect(service.execute(a.token,{action:'answer',date:a.view.date,target:'daily',itemId:'other',input:'x'})).rejects.toMatchObject({status:409});
  clock.set('2026-09-28T03:00:00Z');
  await expect(service.execute(a.token,{action:'card',date:a.view.date,index:1})).rejects.toMatchObject({status:409});
  const v=await service.view(a.token);expect(v.progress!.answers).toHaveLength(0);expect(v.lesson!.items).toHaveLength(10);
 });
});
describe('REVIEW-01/02',()=>{
 it('queues tomorrow, preserves completion, resumes max ten questions',async()=>{
  const{service,clock}=setup(),a=await register(service);
  await complete(service,a.token,false);expect((await service.view(a.token)).review!.due).toBe(0);
  expect((await service.view(a.token)).progress!.completedAt).toBeTruthy();
  clock.set('2026-09-25T03:00:00Z');
  const r=await service.execute(a.token,{action:'startReview'});
  expect(r.reply.view.review!.session!.total).toBe(10);
  expect((await service.execute(a.token,{action:'startReview'})).reply.view.review!.session!.id).toBe(r.reply.view.review!.session!.id);
  const session=r.reply.view.review!.session!;
  await service.execute(a.token,{action:'answer',date:r.reply.view.date,target:'review',sessionId:session.id,itemId:session.question!.id,input:'wrong'});
  expect((await service.view(a.token)).review!.session!.answers).toHaveLength(1);
  expect((await service.view(a.token)).progress!.completedAt).toBeUndefined();
 });
 it('advances 1 -> 3 -> 7 -> 14 and resets after a wrong answer',async()=>{
  const{service,store,clock}=setup(),a=await register(service);
  await complete(service,a.token);
  const expression=a.view.lesson!.items[0].expression,key=normalize(expression);
  let day='2026-09-25';
  for(const gap of [3,7,14]){
   clock.set(day+'T03:00:00Z');await store.update(s=>{for(const[k,r]of Object.entries(s.users[a.id].reviews))if(k!==key)r.due='2099-01-01';});
   const view=(await service.execute(a.token,{action:'startReview'})).reply.view,session=view.review!.session!;
   const answer=(await store.read()).users[a.id].reviews[key].item.answers[0];
   await service.execute(a.token,{action:'answer',date:day,target:'review',sessionId:session.id,itemId:session.question!.id,input:answer});
   const due=(await store.read()).users[a.id].reviews[key].due;expect(due).toBe(addDays(day,gap));day=due;
  }
  clock.set(day+'T03:00:00Z');const v=(await service.execute(a.token,{action:'startReview'})).reply.view,s=v.review!.session!;
  await service.execute(a.token,{action:'answer',date:day,target:'review',sessionId:s.id,itemId:s.question!.id,input:'wrong'});
  expect((await store.read()).users[a.id].reviews[key]).toMatchObject({stage:-1,due:addDays(day,1)});
 });
});
