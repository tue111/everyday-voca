import { NICKNAME_MAX_LENGTH } from '../shared/contracts';
import { useState } from 'react';
import { Bell, BellOff, Headphones, LogOut, RefreshCw } from 'lucide-react';
import { useApp } from './state';
import { ErrorNote, StudyHeader } from './components';
async function registration(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('아이폰은 Safari에서 홈 화면에 추가한 뒤 다시 열어 주세요.');
 const registered=await navigator.serviceWorker.getRegistration('/');
 if(!registered)throw new Error('앱 설치 준비가 끝나지 않았어요. 새로고침 후 다시 시도해 주세요.');
 return registered;
}
export function Settings(){
 const{view,run}=useApp();const[name,setName]=useState(view.user!.name),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const act=async(fn:()=>Promise<unknown>,ok:string)=>{setBusy(true);setError('');setMessage('');try{await fn();setMessage(ok);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const enable=async()=>{
   if(!view.pushPublicKey)throw new Error('서버의 푸시 알림 설정이 아직 준비되지 않았어요.');
   const reg=await registration();
   const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('브라우저 설정에서 알림을 허용해 주세요.');
   const key=Uint8Array.from(atob(view.pushPublicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
   const json=sub.toJSON();await run({action:'subscribe',subscription:{endpoint:sub.endpoint,keys:{p256dh:json.keys!.p256dh,auth:json.keys!.auth}}});
 };
 const disable=async()=>{const reg=await registration();const sub=await reg.pushManager.getSubscription();if(sub){await run({action:'unsubscribe',endpoint:sub.endpoint});await sub.unsubscribe();}};
 return <><StudyHeader title="내 속도에 맞춰요." sub="MAKE IT YOURS"/><ErrorNote message={error}/>{message&&<div className="success" role="status">{message}</div>}<section className="panel"><h2>프로필</h2><form className="inline-form" onSubmit={e=>{e.preventDefault();void act(()=>run({action:'rename',name}),'이름을 변경했어요.');}}><label htmlFor="name">이름</label><input id="name" value={name} onChange={e=>setName(e.target.value)} maxLength={NICKNAME_MAX_LENGTH} aria-describedby="nickname-help" required/><button className="button primary" disabled={busy}>저장</button></form><p id="nickname-help" className="small muted">이름은 최대 {NICKNAME_MAX_LENGTH}자까지 입력할 수 있어요.</p></section><section className="panel"><div className="panel-title"><Bell size={21}/><h2>나를 위한 작은 알림</h2></div><p>오전 9시대, 그리고 학습을 마치지 않은 날 오후 9시대에 알려 드려요.</p><p className="small muted">무료 예약 실행과 기기 상태에 따라 수신 시각이 달라질 수 있어요.</p><div className="settings-actions"><button className="button primary" onClick={()=>void act(enable,'이 기기의 알림을 켰어요.')} disabled={busy}><Bell size={17}/> 이 기기 알림 켜기</button><button className="button secondary" onClick={()=>void act(disable,'이 기기의 알림을 껐어요.')} disabled={busy}><BellOff size={17}/> 끄기</button></div></section><section className="panel"><div className="panel-title"><Headphones size={21}/><h2>홈 화면에 두고, 가볍게 시작해요.</h2></div><p>아이폰: Safari의 공유 → 홈 화면에 추가<br/>안드로이드: 브라우저 메뉴 → 앱 설치 또는 홈 화면에 추가</p><p className="small muted">아이폰 알림은 홈 화면에 추가한 앱에서 설정해 주세요. 발음은 기기의 영어 음성을 사용해요.</p></section><section className="panel"><h2>학습 기록 복구</h2><p>복구 코드를 잃어버렸다면 새로 발급할 수 있어요. 기존 코드는 더 이상 사용할 수 없어요.</p><button className="button secondary" disabled={busy} onClick={()=>void act(()=>run({action:'rotateRecovery'}),'새 복구 코드를 안전하게 보관해 주세요.')}><RefreshCw size={17}/> 복구 코드 재발급</button></section><button className="text-button muted" disabled={busy} onClick={()=>void act(()=>run({action:'logout'}),'')}><LogOut size={16}/> 이 기기에서 로그아웃</button></>;
}
