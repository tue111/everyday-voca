import { randomUUID } from 'node:crypto';
import { validateBundle, normalize } from '../shared/contracts.js';
import { addDays, koreanDate, type Clock } from './clock.js';
import { fallbackBundle } from './fixtures.js';
import type { State } from './model.js';
import type { Store } from './store.js';
import type { Generator, PushSender } from './providers.js';
import { hash } from './service.js';
export class Jobs {
 constructor(private store: Store<State>, private clock: Clock, private generator: Generator, private push: PushSender, private budget = 3, private maxCallCost = .02) {}
 async generate() {
   const now = this.clock.now(), date=addDays(koreanDate(now),1), month=koreanDate(now).slice(0,7), owner=randomUUID(), key='generate:'+date;
   const claimed = await this.store.update(s => {
     if (s.lessons[date] || (s.jobs[key]?.status==='running' && s.jobs[key].until>now.toISOString())) return false;
     s.jobs[key]={status:'running',owner,until:new Date(now.getTime()+5*60000).toISOString(),attempts:s.jobs[key]?.attempts ?? 0};
     return true;
   });
   if (!claimed) return {status:'skipped',date};
   let bundle: ReturnType<typeof fallbackBundle> | undefined, note='generation failed';
   while (!bundle) {
     const canSpend = await this.store.update(s => {
       const job=s.jobs[key], b=s.budgets[month] ??= {reserved:0,spent:0};
       if (job.owner!==owner || job.attempts>=3 || b.spent+b.reserved+this.maxCallCost>this.budget) return false;
       job.attempts++; b.reserved+=this.maxCallCost; return true;
     });
     if (!canSpend) { note='budget or attempts limit'; break; }
     let cost=this.maxCallCost;
     try {
       const state=await this.store.read();
       const recent=Object.values(state.lessons).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30).flatMap(l=>l.items.map(i=>i.expression));
       const generated=await this.generator.generate(date,recent);
       cost=Number.isFinite(generated.cost) && generated.cost>=0 ? generated.cost : this.maxCallCost;
       const valid=validateBundle(generated.bundle);
       const recentSet=new Set(recent.map(normalize));
       // Real AI must produce novel expressions; local fixtures deliberately rotate a small reviewed bank.
       if (generated.cost>0 && valid.items.some(i=>recentSet.has(normalize(i.expression)))) throw new Error('Repeated recent expression');
       bundle=valid;
     } catch (e) { note=e instanceof Error ? e.message.slice(0,160) : 'generation error'; }
     finally {
       await this.store.update(s => { const b=s.budgets[month]; b.reserved=Math.max(0,b.reserved-this.maxCallCost); b.spent+=cost; });
     }
   }
   const generated=bundle;
   const result=await this.store.update(s=>{
     if(s.jobs[key].owner!==owner) return {status:'superseded',date};
     s.lessons[date] ??= {...(generated ?? fallbackBundle(date)),date,source:generated?'ai':'fallback'};
     s.jobs[key]={...s.jobs[key],status:'done',note:generated?'published':note};
     return {status:s.lessons[date].source,date};
   });
   console.info(JSON.stringify({event:'generation',...result}));
   return result;
 }
 async remind(slot: 'morning'|'evening') {
   const date=koreanDate(this.clock.now()), now=this.clock.now().toISOString();
   const state=await this.store.read();
   let sent=0, skipped=0, failed=0;
   for (const u of Object.values(state.users)) for(const sub of u.subscriptions) {
     const key=hash(date+':'+slot+':'+sub.endpoint);
     const claim=await this.store.update(s=>{
       const current=s.users[u.id];
       if (!current || current.progress[date]?.completedAt || !current.subscriptions.some(x=>x.endpoint===sub.endpoint) || s.deliveries[key]) return false;
       // Keep only 35 days of delivery evidence. Old slots cannot be invoked via user-controlled dates.
       for(const [k,v] of Object.entries(s.deliveries)) if(v.at<new Date(this.clock.now().getTime()-35*86400000).toISOString()) delete s.deliveries[k];
       s.deliveries[key]={status:'pending',at:now};
       return true;
     });
     if(!claim){skipped++;continue;}
     try {
       // Recheck immediately before sending; completion can change since the job started.
       const latest=await this.store.read();
       if(latest.users[u.id]?.progress[date]?.completedAt || !latest.users[u.id]?.subscriptions.some(s=>s.endpoint===sub.endpoint)) {
         await this.store.update(s=>{delete s.deliveries[key];}); skipped++;continue;
       }
       await this.push.send(sub,{title:slot==='morning'?'오늘의 작은 영어, 틈':'오늘의 영어를 마무리해 볼까요?',body:'일상 표현 10개가 기다리고 있어요.',url:'/',tag:'voca-'+date+'-'+slot});
       await this.store.update(s=>{s.deliveries[key].status='sent';});sent++;
     } catch(e) {
       const expired=[404,410].includes((e as {statusCode?:number}).statusCode ?? 0);
       await this.store.update(s=>{
         s.deliveries[key].status=expired?'expired':'uncertain';
         if(expired) s.users[u.id].subscriptions=s.users[u.id].subscriptions.filter(x=>x.endpoint!==sub.endpoint);
       });failed++;
     }
   }
   console.info(JSON.stringify({event:'reminder',date,slot,sent,skipped,failed}));
   return {date,slot,sent,skipped,failed};
 }
}
