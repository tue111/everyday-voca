import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';
import { FileStore, MongoStore } from './store.js';
import { initialState } from './model.js';
import { FixedClock, systemClock } from './clock.js';
import { AppService } from './service.js';
import { FakeGenerator, FakePush, OpenAIGenerator, WebPushSender } from './providers.js';
import { Jobs } from './jobs.js';
import { SpeechService } from './speech.js';
import { FileAudioStore, MongoAudioStore } from './speech-store.js';
import { FakeSpeechGenerator, OpenAISpeechGenerator } from './speech-provider.js';
if (!process.env.VERCEL && process.env.APP_MODE !== 'test' && existsSync('.env')) process.loadEnvFile('.env');
let runtime: ReturnType<typeof makeRuntime> | undefined;
async function makeRuntime() {
 const production=Boolean(process.env.VERCEL) || process.env.APP_MODE==='production';
 const test=process.env.APP_MODE==='test';
 if(test && (process.env.OPENAI_API_KEY || process.env.MONGODB_URI || process.env.VAPID_PRIVATE_KEY)) throw new Error('Test mode rejects real provider credentials.');
 if(production && (!process.env.MONGODB_URI || !process.env.APP_URL?.startsWith('https://') || (process.env.CRON_SECRET?.length ?? 0)<32)) throw new Error('Production requires MONGODB_URI, HTTPS APP_URL and 32+ character CRON_SECRET.');
 if(production && process.env.FIXED_NOW) throw new Error('Production cannot use a fixed clock.');
 const clock=process.env.FIXED_NOW && !production ? new FixedClock(process.env.FIXED_NOW) : systemClock;
 const db=process.env.MONGODB_DATABASE || 'everyday_voca';
 const mongo=process.env.MONGODB_URI ? await new MongoClient(process.env.MONGODB_URI,{maxPoolSize:5,serverSelectionTimeoutMS:5000}).connect() : undefined;
 const store=mongo
   ? new MongoStore(mongo,db,initialState())
   : await FileStore.open(resolve(process.env.DATA_FILE || '.data/state.json'),initialState());
 const inputRate=Number(process.env.AI_INPUT_USD_PER_MILLION || '.1'), outputRate=Number(process.env.AI_OUTPUT_USD_PER_MILLION || '.5');
 const budget=Number(process.env.AI_MONTHLY_BUDGET_USD || '3');
 if (![inputRate,outputRate,budget].every(x=>Number.isFinite(x)&&x>=0)) throw new Error('Invalid AI cost configuration');
 const generator=process.env.OPENAI_API_KEY ? new OpenAIGenerator(process.env.OPENAI_API_KEY,process.env.OPENAI_MODEL||'gpt-6-luna',inputRate,outputRate) : production ? {async generate():Promise<never>{throw new Error('AI key missing; using prepared content');}} : new FakeGenerator();
 const pushReady=!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);
 const push=pushReady ? new WebPushSender(process.env.VAPID_SUBJECT!,process.env.VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!) : new FakePush();
 const speechBudget=Number(process.env.TTS_MONTHLY_BUDGET_USD || '1');
 if (!Number.isFinite(speechBudget) || speechBudget<0) throw new Error('Invalid speech budget');
 const audio=mongo ? new MongoAudioStore(mongo,db) : new FileAudioStore(resolve(process.env.DATA_FILE || '.data/state.json')+'.speech');
 const speechGenerator=test ? new FakeSpeechGenerator() : process.env.OPENAI_API_KEY ? new OpenAISpeechGenerator(process.env.OPENAI_API_KEY) : undefined;
 const speech=new SpeechService(store,clock,audio,speechGenerator,speechBudget);
 return {service:new AppService(store,clock,pushReady?process.env.VAPID_PUBLIC_KEY:''),speech,jobs:new Jobs(store,clock,generator,push,budget,Math.max(.02,(40000*inputRate+8000*outputRate)/1e6)),production,pushReady};
}
export function getRuntime(){return runtime ??= makeRuntime().catch(e=>{runtime=undefined;throw e;});}
