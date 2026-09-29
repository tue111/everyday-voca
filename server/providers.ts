import OpenAI from 'openai';
import webpush from 'web-push';
import { z } from 'zod';
import { bundleSchema, validateBundle, type Bundle, type Subscription } from '../shared/contracts.js';
import { fallbackBundle } from './fixtures.js';
export interface Generator { generate(date: string, recent: string[]): Promise<{ bundle: Bundle; cost: number }> }
export interface PushSender { send(subscription: Subscription, payload: { title: string; body: string; url: string; tag: string }): Promise<void> }
export class FakeGenerator implements Generator {
  calls = 0;
  async generate(date: string) { this.calls++; return {bundle:fallbackBundle(date),cost:0}; }
}
export class FakePush implements PushSender {
  sent: { endpoint: string; body: unknown }[] = [];
  async send(s: Subscription, payload: unknown) { this.sent.push({endpoint:s.endpoint,body:payload}); }
}
export class OpenAIGenerator implements Generator {
 private client: OpenAI;
 constructor(key: string, private model: string, private inputRate: number, private outputRate: number) {
   this.client = new OpenAI({apiKey:key,timeout:45000,maxRetries:0});
 }
 async generate(date: string, recent: string[]) {
   const prompt = 'Create exactly 10 useful everyday English expressions for Korean adults. Exclude specialist terms. Mix nouns, verbs, adjectives and phrasal verbs. Each item: stable lowercase ASCII id, expression, Korean kind, Korean meaning, natural English card example and Korean translation, DIFFERENT natural quiz sentence with exactly one ___ replacing the whole expression in its grammatical form, Korean questionTranslation, answers (all accepted grammatical forms for THIS sentence). Do not add unconstrained synonyms. Topic in Korean. Every answer must fit the quiz. Avoid these recently used expressions: ' + recent.slice(-300).join(', ') + '. Date: ' + date;
   if (Buffer.byteLength(prompt,'utf8') > 28000) throw new Error('Prompt exceeds bounded input');
   const response = await this.client.responses.create({
     model:this.model,store:false,reasoning:{effort:'low'},max_output_tokens:8000,
     input:prompt,
     text:{format:{type:'json_schema',name:'daily_lesson',strict:true,schema:z.toJSONSchema(bundleSchema,{target:'draft-7'})}},
   });
   if (response.status !== 'completed' || !response.output_text) throw new Error('Incomplete or refused generation');
   const cost = ((response.usage?.input_tokens ?? 40000)*this.inputRate + (response.usage?.output_tokens ?? 8000)*this.outputRate)/1e6;
   return {bundle:validateBundle(JSON.parse(response.output_text)),cost};
 }
}
export class WebPushSender implements PushSender {
 constructor(private subject: string, private publicKey: string, private privateKey: string) {}
 async send(s: Subscription, payload: {title:string;body:string;url:string;tag:string}) {
   await webpush.sendNotification(s,JSON.stringify(payload),{TTL:3600,timeout:10000,vapidDetails:{subject:this.subject,publicKey:this.publicKey,privateKey:this.privateKey}});
 }
}
