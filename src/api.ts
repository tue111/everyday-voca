import type { Command, Reply } from '../shared/contracts';
export class ApiError extends Error { constructor(public status: number, message: string){super(message);} }
export async function api(command?: Command):Promise<Reply>{
 const response=await fetch('/api/app',{method:command?'POST':'GET',credentials:'same-origin',headers:command?{'Content-Type':'application/json'}:undefined,body:command?JSON.stringify(command):undefined,signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok)throw new ApiError(response.status,result.error?.message||'요청을 처리하지 못했습니다.');
 return result;
}
