import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { useApp } from './state';
import { AnswerList, ErrorNote, StudyHeader } from './components';
import { QuizPanel } from './QuizPanel';
import { SpeechPlayer } from './SpeechPlayer';
export function Learn(){
 const{view,run}=useApp(),navigate=useNavigate();const[busy,setBusy]=useState(false),[error,setError]=useState('');const index=view.progress!.card,item=view.lesson!.items[index];
 const move=async(next:number)=>{setBusy(true);setError('');try{await run({action:'card',date:view.date,index:next});}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const start=async()=>{setBusy(true);setError('');try{await run({action:'startQuiz',date:view.date});navigate(view.progress?.completedAt?'/result':'/quiz');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <><StudyHeader title="천천히, 한 표현씩." sub="MEET YOUR EXPRESSIONS"/><div className="progress-track"><span style={{width:((index+1)/10*100)+'%'}}/></div><section className="study-card"><div className="eyebrow">EXPRESSION <span>{String(index+1).padStart(2,'0')} / 10</span></div><span className="kind">{item.kind}</span><h2 className="expression">{item.expression}</h2><p className="meaning">{item.meaning}</p><SpeechPlayer key={view.date+item.id} date={view.date} item={item}/><div className="example"><div className="eyebrow">IN EVERYDAY LIFE</div><p>{item.example}</p><span>{item.translation}</span></div><ErrorNote message={error}/><div className="study-actions"><button className="button secondary" disabled={index===0||busy} onClick={()=>move(index-1)}><ArrowLeft size={17}/> 이전</button>{index<9?<button className="button primary" disabled={busy} onClick={()=>move(index+1)}>다음 표현<ArrowRight size={17}/></button>:<button className="button primary" disabled={busy} onClick={start}>{view.progress?.completedAt?'결과 보기':'퀴즈 시작'}<ArrowRight size={17}/></button>}</div></section><p className="study-footnote">완벽하게 외우지 않아도 괜찮아요. 문장 속에서 다시 만나 봐요.</p></>;
}
export function DailyQuiz(){
 const{view,run}=useApp(),navigate=useNavigate();
 if(!view.progress!.cardsDone)return <><StudyHeader title="표현부터 만나 볼까요?" sub="ONE STEP AT A TIME"/><button className="button primary" onClick={()=>navigate('/learn')}>카드 학습 시작<ArrowRight size={18}/></button></>;
 return <><StudyHeader title="얼마나 기억하고 있나요?" sub="A MOMENT TO REMEMBER"/><div className="progress-track"><span style={{width:view.progress!.answers.length*10+'%'}}/></div><QuizPanel question={view.question} number={view.progress!.answers.length} total={10} onAnswer={async input=>(await run({action:'answer',date:view.date,target:'daily',itemId:view.question!.id,input})).feedback!} onHint={async()=>{await run({action:'hint',date:view.date,target:'daily',itemId:view.question!.id});}} onFinish={()=>navigate('/result')}/></>;
}
export function Result(){
 const{view}=useApp(),navigate=useNavigate();const answers=view.progress!.answers;
 if(!view.progress!.completedAt)return <><StudyHeader title="아직 학습 중이에요." sub="KEEP GOING"/><button className="button primary" onClick={()=>navigate(view.progress!.cardsDone?'/quiz':'/learn')}>이어서 학습하기<ArrowRight size={18}/></button></>;
 return <><StudyHeader title="오늘도, 나를 위한 한 걸음." sub="TODAY, WELL DONE"/><section className="result-hero"><div className="icon-circle"><CheckCircle2 size={32}/></div><h2>오늘의 학습을 마쳤어요!</h2><p>틀린 표현도 배움의 일부예요. 복습에서 다시 만나면 돼요.</p><div className="result-numbers"><div><strong>10</strong><span>만나 본 표현</span></div><div><strong>{answers.filter(a=>a.correct).length}</strong><span>기억한 표현</span></div><div><strong>{view.stats!.completedDays}</strong><span>함께한 학습일</span></div></div><button className="button primary" onClick={()=>navigate('/review')}>가볍게 복습하기<ArrowRight size={18}/></button></section><div className="section-heading"><h2>오늘의 학습 돌아보기</h2></div><AnswerList answers={answers}/></>;
}
export function ReviewPage(){
 const{view,run}=useApp();const[started,setStarted]=useState(!!view.review?.session?.question),[done,setDone]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);const session=view.review?.session;
 const start=async()=>{setBusy(true);setError('');try{await run({action:'startReview'});setStarted(true);setDone(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <><StudyHeader title="다시 만나, 오래 기억해요." sub="REVISIT & REMEMBER"/>{started&&!done&&session&&session.total>0?<QuizPanel key={session.id} question={session.question} number={session.answers.length} total={session.total} onAnswer={async input=>(await run({action:'answer',date:view.date,target:'review',sessionId:session.id,itemId:session.question!.id,input})).feedback!} onHint={async()=>{await run({action:'hint',date:view.date,target:'review',sessionId:session.id,itemId:session.question!.id});}} onFinish={()=>{setDone(true);setStarted(false);}}/>:<section className="empty-card"><div className="icon-circle"><RefreshCw size={28}/></div><h2>{done?'기억이 조금 더 단단해졌어요.':view.review?.due?'지금 다시 만나면 좋은 표현들':'오늘은 복습할 표현이 없어요.'}</h2><p>{view.review?.due?view.review.due+'개 중 최대 10개를 가볍게 확인해요. 오답부터 먼저 만나요.':'학습한 표현은 내일부터 간격을 두고 다시 만나요.'}</p><p className="small muted">복습은 선택이에요. 오늘의 학습 완료에는 영향을 주지 않아요.</p><ErrorNote message={error}/>{!!view.review?.due&&<button className="button primary" onClick={start} disabled={busy}>{busy?'준비하는 중…':'복습 시작'}<ArrowRight size={18}/></button>}</section>}{done&&session&&<AnswerList answers={session.answers}/>}</>;
}
