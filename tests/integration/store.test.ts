import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { MongoStore } from '../../server/store.js';
import { MongoAudioStore } from '../../server/speech-store.js';
import { SpeechService } from '../../server/speech.js';
import { FakeSpeechGenerator } from '../../server/speech-provider.js';
import { setup, register } from '../helpers.js';
import { initialState } from '../../server/model.js';
let mongo: MongoMemoryServer;
let client: MongoClient;
beforeAll(async () => { mongo = await MongoMemoryServer.create(); client = await new MongoClient(mongo.getUri()).connect(); });
afterAll(async () => { await client?.close(); await mongo?.stop(); });
describe('real isolated MongoDB store', () => {
  it('reuses persisted audio across independent service instances and keeps bytes outside state', async () => {
    const db='speech_test', state=new MongoStore(client,db,initialState()), h=setup(state), user=await register(h.service);
    const provider=new FakeSpeechGenerator(), a=new SpeechService(state,h.clock,new MongoAudioStore(client,db),provider);
    const b=new SpeechService(new MongoStore(client,db,initialState()),h.clock,new MongoAudioStore(client,db),provider);
    const request={date:user.view.date,itemId:user.view.lesson!.items[0].id,target:'example' as const};
    await Promise.all([a.request(user.token,request),b.request(user.token,request)]);
    expect(await b.request(user.token,request)).toHaveProperty('bytes');
    expect(provider.calls).toBe(1);
    expect(await client.db(db).collection('speech_audio').countDocuments()).toBe(1);
    expect(JSON.stringify(await state.read())).not.toContain('audio/wav');
    const indexes=await client.db(db).collection('speech_audio').indexes();
    expect(indexes.some(i=>i.expireAfterSeconds===0)).toBe(true);
  });
  it('honors audio expiry even before Mongo TTL cleanup and extends access retention', async () => {
    const audio=new MongoAudioStore(client,'speech_expiry'), file=await new FakeSpeechGenerator().generate();
    await audio.put('sample',file,new Date('2030-01-01'));
    expect(await audio.get('sample',new Date('2030-01-25'))).toHaveProperty('bytes');
    expect(await audio.get('sample',new Date('2030-02-20'))).toHaveProperty('bytes');
    expect(await audio.get('sample',new Date('2030-04-01'))).toBeUndefined();
  });
  it('serializes concurrent writers without lost updates', async () => {
    const stores = Array.from({ length: 8 }, () => new MongoStore(client, 'harness_test', { count: 0 }));
    await Promise.all(stores.map(store => store.update(s => ++s.count)));
    expect((await stores[0].read()).count).toBe(8);
    expect(await client.db('harness_test').collection('application_state').countDocuments()).toBe(1);
  });
  it('does not persist a rejected mutation', async () => {
    const store = new MongoStore(client, 'rejection_test', { count: 0 });
    await expect(store.update(s => { s.count++; throw new Error('rejected'); })).rejects.toThrow('rejected');
    expect((await store.read()).count).toBe(0);
  });
});
