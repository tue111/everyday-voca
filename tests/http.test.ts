import { beforeAll,afterAll,it,expect,vi } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,dirname,basename } from 'node:path';
import { handle } from '../server/http';
let server:Server,port:number,dir:string;
beforeAll(async()=>{
 dir=await mkdtemp(join(tmpdir(),'voca-http-test-'));
 vi.stubEnv('APP_MODE','test');vi.stubEnv('APP_URL','http://127.0.0.1:5180');vi.stubEnv('DATA_FILE',join(dir,'state.json'));
 server=createServer(async(req,res)=>{
  if(req.headers['x-simulate-vercel']==='1'){
   const buffers:Buffer[]=[];for await(const p of req)buffers.push(Buffer.from(p));
   (req as typeof req & {body?:unknown}).body=JSON.parse(Buffer.concat(buffers).toString('utf8'));
  }
  await handle(req,res);
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));port=(server.address() as {port:number}).port;
});
afterAll(async()=>{
 await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));vi.unstubAllEnvs();
 if(dirname(resolve(dir))!==resolve(tmpdir())||!basename(dir).startsWith('voca-http-test-'))throw new Error('Unsafe test cleanup path');
 await rm(dir,{recursive:true,force:true});
});
function send(parsed:boolean,body:string,origin='http://127.0.0.1:5180'){
 return new Promise<{status:number;body:string;cookie:string[]|undefined}>((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port,path:'/api/app',method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(parsed?{'x-simulate-vercel':'1'}:{})}},res=>{
   let text='';res.on('data',d=>text+=d);res.on('end',()=>resolve({status:res.statusCode!,body:text,cookie:res.headers['set-cookie']}));
  });req.on('error',reject);
  const bytes=Buffer.from(body);for(let n=0;n<bytes.length;n+=2)req.write(bytes.subarray(n,n+2));req.end();
 });
}
it('OPS-01 accepts Vercel parsed bodies and sets an HttpOnly session',async()=>{
 const r=await send(true,JSON.stringify({action:'register',name:'서버리스'}));
 expect(r.status).toBe(200);expect(JSON.parse(r.body).view.user.name).toBe('서버리스');
 expect(r.cookie?.[0]).toContain('HttpOnly');expect(r.cookie?.[0]).toContain('SameSite=Lax');
});
it('preserves Korean UTF-8 across arbitrary incoming chunks',async()=>{
 const r=await send(false,JSON.stringify({action:'register',name:'한글이름'}));expect(r.status).toBe(200);expect(JSON.parse(r.body).view.user.name).toBe('한글이름');
});
it('rejects oversized and cross-origin bodies',async()=>{
 expect((await send(false,JSON.stringify({action:'register',name:'x'.repeat(17000)}))).status).toBe(413);
 expect((await send(false,'{}','https://untrusted.example')).status).toBe(403);
});
