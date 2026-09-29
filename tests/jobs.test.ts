import {describe,it,expect} from 'vitest';
import {setup,register,complete} from './helpers';
import {Jobs} from '../server/jobs';
import {FakeGenerator,FakePush,type Generator,type PushSender} from '../server/providers';
import type {Subscription} from '../shared/contracts';
const sub:Subscription={endpoint:'https://fcm.googleapis.com/send/example',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
describe('AI / JOB / BUDGET',()=>{
 it('publishes tomorrow once despite concurrent invocation',async()=>{
  const{store,clock}=setup(),generator=new FakeGenerator(),jobs=new Jobs(store,clock,generator,new FakePush());
  await Promise.all([jobs.generate(),jobs.generate()]);expect(generator.calls).toBe(1);
  const s=await store.read();expect(s.lessons['2026-09-25'].items).toHaveLength(10);
  await jobs.generate();expect(generator.calls).toBe(1);
 });
 it('makes at most three failed attempts then publishes reviewed fallback',async()=>{
  const{store,clock}=setup();let calls=0;
  const generator:Generator={async generate(){calls++;throw new Error('timeout');}};
  await new Jobs(store,clock,generator,new FakePush()).generate();
  expect(calls).toBe(3);const s=await store.read();expect(s.lessons['2026-09-25'].source).toBe('fallback');expect(s.budgets['2026-09'].spent).toBeCloseTo(.06);expect(s.budgets['2026-09'].reserved).toBe(0);
 });
 it('reserves worst-case cost and stops before exceeding the budget',async()=>{
  const{store,clock}=setup(),g=new FakeGenerator();
  await new Jobs(store,clock,g,new FakePush(),.01,.02).generate();
  expect(g.calls).toBe(0);expect((await store.read()).lessons['2026-09-25'].source).toBe('fallback');
 });
 it('does not overwrite published content or retry uncertain reservations without budget',async()=>{
  const{store,clock}=setup(),g=new FakeGenerator();
  await store.update(s=>{s.budgets['2026-09']={spent:2.99,reserved:.02};});
  await new Jobs(store,clock,g,new FakePush()).generate();expect(g.calls).toBe(0);
 });
});
describe('PUSH-01/02',()=>{
 it('filters complete users, sends once per slot and supports unsubscribe',async()=>{
  const{store,clock,service}=setup(),a=await register(service),b=await register(service,'나래'),push=new FakePush(),jobs=new Jobs(store,clock,new FakeGenerator(),push);
  await service.execute(a.token,{action:'subscribe',subscription:sub});
  await service.execute(b.token,{action:'subscribe',subscription:{...sub,endpoint:sub.endpoint+'2'}});
  await complete(service,b.token);
  await Promise.all([jobs.remind('morning'),jobs.remind('morning')]);expect(push.sent).toHaveLength(1);
  await jobs.remind('evening');expect(push.sent).toHaveLength(2);
  await service.execute(a.token,{action:'unsubscribe',endpoint:sub.endpoint});
  clock.set('2026-09-25T03:00:00Z');await jobs.remind('morning');expect(push.sent).toHaveLength(3);
 });
 it('removes expired endpoints and records transient errors without blind retry',async()=>{
  const{service,store,clock}=setup(),a=await register(service);await service.execute(a.token,{action:'subscribe',subscription:sub});
  const broken:PushSender={async send(){throw {statusCode:410};}};
  await new Jobs(store,clock,new FakeGenerator(),broken).remind('morning');
  expect((await store.read()).users[a.id].subscriptions).toHaveLength(0);
  await service.execute(a.token,{action:'subscribe',subscription:sub});let calls=0;
  const uncertain:PushSender={async send(){calls++;throw new Error('timeout');}};
  const jobs=new Jobs(store,clock,new FakeGenerator(),uncertain);await jobs.remind('evening');await jobs.remind('evening');
  expect(calls).toBe(1);expect(Object.values((await store.read()).deliveries).some(x=>x.status==='uncertain')).toBe(true);
 });
 it('rejects arbitrary URL targets and moves a device subscription on identity change',async()=>{
  const{service,store}=setup(),a=await register(service),b=await register(service);
  await expect(service.execute(a.token,{action:'subscribe',subscription:{...sub,endpoint:'https://localhost/private'}})).rejects.toMatchObject({status:400});
  await service.execute(a.token,{action:'subscribe',subscription:sub});await service.execute(b.token,{action:'subscribe',subscription:sub});
  expect((await store.read()).users[a.id].subscriptions).toHaveLength(0);
 });
});
