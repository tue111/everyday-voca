import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { ZodError } from 'zod';
import { commandSchema } from '../shared/contracts.js';
import { AppError } from './service.js';
import { getRuntime } from './runtime.js';
import { speechRequestSchema } from '../shared/speech.js';
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
function cookie(req: IncomingMessage){return req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('voca_session='))?.slice(13);}
function output(res:ServerResponse,status:number,value:unknown){res.statusCode=status;res.end(JSON.stringify(value));}
export async function handle(req:IncomingMessage,res:ServerResponse){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 const url=new URL(req.url || '/', 'http://localhost');
 const path=url.pathname;
 try{
   if(path==='/api/health'){output(res,200,{status:'ok'});return;}
   const rt=await getRuntime();
   if(path==='/api/cron'){
     if(req.method!=='GET')throw new AppError(405,'Method not allowed');
     const expected=process.env.CRON_SECRET;
     if(!expected || !equal(req.headers.authorization||'','Bearer '+expected))throw new AppError(401,'Unauthorized');
     const job=url.searchParams.get('job');
     if(job==='generate'){
       const deadline=Date.now()+240000;
       const result=await rt.jobs.generate();
       await rt.speech.warm(result.date,deadline);
       output(res,200,result);
     }
     else if(job==='morning'||job==='evening'){
       if(!rt.pushReady && rt.production)throw new AppError(503,'Push configuration is missing');
       output(res,200,await rt.jobs.remind(job));
     }else throw new AppError(400,'Unknown job');
     return;
   }
   if(path!=='/api/app' && path!=='/api/speech')throw new AppError(404,'찾을 수 없는 요청입니다.');
   if(req.method==='GET' && path==='/api/app'){output(res,200,{view:await rt.service.view(cookie(req))});return;}
   if(req.method!=='POST')throw new AppError(405,'Method not allowed');
   const origin=req.headers.origin;
   const allowed=process.env.APP_URL || 'http://127.0.0.1:5173';
   if(!origin || origin!==new URL(allowed).origin)throw new AppError(403,'허용되지 않은 요청입니다.');
   if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError(415,'JSON 요청이 필요합니다.');
   let parsed:unknown;
   const supplied=(req as IncomingMessage & {body?:unknown}).body;
   if(supplied!==undefined){
     if(Buffer.byteLength(typeof supplied==='string'?supplied:JSON.stringify(supplied))>16384)throw new AppError(413,'요청이 너무 큽니다.');
     try{parsed=typeof supplied==='string'?JSON.parse(supplied):supplied;}catch{throw new AppError(400,'잘못된 요청입니다.');}
   }else{
     const chunks:Buffer[]=[];let bytes=0;
     for await(const part of req){const chunk=Buffer.isBuffer(part)?part:Buffer.from(part);bytes+=chunk.length;if(bytes>16384)throw new AppError(413,'요청이 너무 큽니다.');chunks.push(chunk);}
     try{parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError(400,'잘못된 요청입니다.');}
   }
   if(path==='/api/speech'){
     const result=await rt.speech.request(cookie(req),speechRequestSchema.parse(parsed));
     if('bytes' in result){res.setHeader('Content-Type',result.mime);res.statusCode=200;res.end(Buffer.from(result.bytes));}
     else {res.setHeader('Retry-After','2');output(res,202,result);}
     return;
   }
   const cmd=commandSchema.parse(parsed);
   if(cmd.action==='subscribe'&&!rt.pushReady)throw new AppError(503,'서버 알림 설정이 아직 준비되지 않았습니다.');
   const ip=rt.production ? String(req.headers['x-vercel-forwarded-for']||req.socket.remoteAddress) : String(req.socket.remoteAddress);
   const result=await rt.service.execute(cookie(req),cmd,ip);
   if(result.token||result.clear)res.setHeader('Set-Cookie','voca_session='+(result.token||'')+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+(result.clear?0:90*86400)+(rt.production?'; Secure':''));
   output(res,200,result.reply);
 }catch(error){
   if(error instanceof ZodError){output(res,400,{error:{message:'입력 내용을 확인해 주세요.',code:'VALIDATION'}});return;}
   const status=error instanceof AppError?error.status:500;
   if(status===500)console.error(JSON.stringify({event:'request_error',message:error instanceof Error?error.message:'unknown'}));
   output(res,status,{error:{message:status===500?'잠시 문제가 생겼어요. 다시 시도해 주세요.':(error as Error).message,code:String(status)}});
 }
}
