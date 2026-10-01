import { it, expect } from 'vitest';
import { setup, register, complete } from './helpers';

it('retry selects only original mistakes, resumes hints and preserves daily results and review schedule', async () => {
 const { service, store } = setup(), a = await register(service), date = a.view.date;
 await expect(service.execute(a.token,{action:'startRetry',date})).rejects.toMatchObject({status:409});
 await service.execute(a.token,{action:'startQuiz',date});
 const items=(await store.read()).lessons[date].items;
 for(const [index,item] of items.entries()) await service.execute(a.token,{action:'answer',date,target:'daily',itemId:item.id,input:index===1||index===3?'wrong':item.answers[0]});
 const before=await store.read(), original=await service.view(a.token);
 const started=await service.execute(a.token,{action:'startRetry',date});
 const id=started.reply.view.retry!.id;
 expect(started.reply.view.retry!.total).toBe(2);expect(started.reply.view.retry!.question!.id).toBe(items[1].id);
 expect((await service.execute(a.token,{action:'startRetry',date})).reply.view.retry!.id).toBe(id);
 await expect(service.execute(a.token,{action:'answer',date,target:'retry',sessionId:id,itemId:items[0].id,input:'wrong'})).rejects.toMatchObject({status:409});
 await service.execute(a.token,{action:'hint',date,target:'retry',sessionId:id,itemId:items[1].id});
 expect((await setup(store).service.view(a.token)).retry!.question!.hint).toBe(items[1].meaning);
 const cmd={action:'answer' as const,date,target:'retry' as const,sessionId:id,itemId:items[1].id,input:items[1].answers[0]};
 const responses=await Promise.all([service.execute(a.token,cmd),service.execute(a.token,{...cmd,input:'wrong'})]);
 expect(responses[1].reply.feedback).toEqual(responses[0].reply.feedback);
 expect((await service.view(a.token)).retry!.answers).toHaveLength(1);
 await service.execute(a.token,{...cmd,itemId:items[3].id});
 const after=await service.view(a.token);
 expect(after.retry!.question).toBeUndefined();expect(after.progress).toEqual(original.progress);expect(after.stats).toEqual(original.stats);
 expect((await store.read()).users[a.id].reviews).toEqual(before.users[a.id].reviews);
 const restart={action:'startRetry' as const,date,previousSessionId:id};
 const again=await service.execute(a.token,restart);
 expect(again.reply.view.retry!.id).not.toBe(id);expect(again.reply.view.retry!.answers).toHaveLength(0);
 expect((await service.execute(a.token,restart)).reply.view.retry!.id).toBe(again.reply.view.retry!.id);
 await expect(service.execute(a.token,cmd)).rejects.toMatchObject({status:409});
});

it('retry enforces owner/day boundaries, excludes perfect scores and leaves scheduled review independent',async()=>{
 const {service,clock}=setup(),a=await register(service),b=await register(service);
 await complete(service,a.token,true);await expect(service.execute(a.token,{action:'startRetry',date:a.view.date})).rejects.toMatchObject({status:409});
 await complete(service,b.token,false);
 const session=(await service.execute(b.token,{action:'startRetry',date:b.view.date})).reply.view.retry!;
 await expect(service.execute(a.token,{action:'answer',date:a.view.date,target:'retry',sessionId:session.id,itemId:session.question!.id,input:'wrong'})).rejects.toMatchObject({status:409});
 clock.set('2026-09-25T03:00:00Z');
 await expect(service.execute(b.token,{action:'startRetry',date:b.view.date})).rejects.toMatchObject({status:409});
 expect((await service.view(b.token)).retry).toBeUndefined();
 expect((await service.execute(b.token,{action:'startReview'})).reply.view.review!.session!.total).toBe(10);
});
