import {beforeAll,afterAll,it,expect} from 'vitest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {MongoStore,FileStore} from '../../server/store';
import {initialState} from '../../server/model';
import {setup,register} from '../helpers';
import {Jobs} from '../../server/jobs';
import {FakeGenerator,FakePush} from '../../server/providers';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
let mongo:MongoMemoryServer,client:MongoClient;
beforeAll(async()=>{mongo=await MongoMemoryServer.create();client=await new MongoClient(mongo.getUri()).connect();});
afterAll(async()=>{await client?.close();await mongo?.stop();});
it('QUIZ-02 real Mongo concurrent duplicate answers persist once and survive new service instances',async()=>{
 const store=new MongoStore(client,'voca_test',initialState()),{service}=setup(store),a=await register(service);
 await service.execute(a.token,{action:'startQuiz',date:a.view.date});
 const item=(await store.read()).lessons[a.view.date].items[0];
 const cmd={action:'answer' as const,date:a.view.date,target:'daily' as const,itemId:item.id,input:item.answers[0]};
 const instances=Array.from({length:5},()=>setup(new MongoStore(client,'voca_test',initialState())).service);
 await Promise.all(instances.map(s=>s.execute(a.token,cmd)));
 const next=setup(new MongoStore(client,'voca_test',initialState())).service;
 const restored=await next.execute(undefined,{action:'recover',code:a.code});
 expect(restored.reply.view.progress!.answers).toHaveLength(1);
 expect(restored.reply.view.progress!.answers[0].correct).toBe(true);
});
it('JOB-01 only one real Mongo writer claims generation',async()=>{
 const store=new MongoStore(client,'jobs_test',initialState()),{clock}=setup(store),gen=new FakeGenerator();
 const jobs=Array.from({length:4},()=>new Jobs(new MongoStore(client,'jobs_test',initialState()),clock,gen,new FakePush()));
 await Promise.all(jobs.map(j=>j.generate()));expect(gen.calls).toBe(1);
});
it('local JSON persists recovery and progress across restarts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'voca-test-'));
 if(dirname(resolve(dir))!==resolve(tmpdir())||!basename(dir).startsWith('voca-test-'))throw new Error('Unsafe test cleanup path');
 try{
  const path=join(dir,'state.json'),store=await FileStore.open(path,initialState()),{service}=setup(store),a=await register(service);
  await service.execute(a.token,{action:'card',date:a.view.date,index:6});
  const restored=setup(await FileStore.open(path,initialState())).service;
  const result=await restored.execute(undefined,{action:'recover',code:a.code});
  expect(result.reply.view.progress!.card).toBe(6);
 }finally{await rm(dir,{recursive:true,force:true});}
});
