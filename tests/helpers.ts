import { FixedClock } from '../server/clock';
import { MemoryStore } from '../server/store';
import { initialState, type State } from '../server/model';
import { AppService } from '../server/service';
import type { Store } from '../server/store';
export function setup(store: Store<State> = new MemoryStore(initialState())) {
 const clock=new FixedClock('2026-09-24T03:00:00Z'),service=new AppService(store,clock);
 return {clock,store,service};
}
export async function register(service:AppService,name='지민',ip='local'){
 const r=await service.execute(undefined,{action:'register',name},ip);
 return {token:r.token!,code:r.reply.recoveryCode!,view:r.reply.view,id:r.reply.view.user!.id};
}
export async function complete(service:AppService,token:string,correct=true){
 const v=await service.view(token);await service.execute(token,{action:'startQuiz',date:v.date});
 const state=await service.store.read();
 for(const item of state.lessons[v.date].items)await service.execute(token,{action:'answer',date:v.date,target:'daily',itemId:item.id,input:correct?item.answers[0]:'not the answer'});
 return service.view(token);
}
