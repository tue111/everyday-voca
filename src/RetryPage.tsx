import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './state';
import { AnswerList, ErrorNote, StudyHeader } from './components';
import { QuizPanel } from './QuizPanel';

export function RetryPage() {
 const { view, run } = useApp(), navigate = useNavigate();
 const [busy, setBusy] = useState(false), [error, setError] = useState('');
 const [showResult, setShowResult] = useState(!view.retry?.question);
 const session = view.retry, wrong = view.progress!.answers.filter(a => !a.correct).length;
 const start = async () => {
  setBusy(true); setError('');
  try {
   await run({ action: 'startRetry', date: view.date, ...(session ? { previousSessionId: session.id } : {}) });
   setShowResult(false);
  } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 };
 if (!view.progress!.completedAt) return <><StudyHeader title="오늘의 퀴즈를 먼저 마쳐 주세요." sub="TRY AGAIN"/><button className="button primary" onClick={() => navigate('/quiz')}>퀴즈 이어가기</button></>;
 return <><StudyHeader title="틀린 표현, 다시 한 번." sub="TRY AGAIN"/><p className="small muted">첫 퀴즈 점수와 학습 완료, 예정된 복습 날짜는 바뀌지 않아요.</p>
  {session && !showResult ? <QuizPanel key={session.id} question={session.question} number={session.answers.length} total={session.total}
   onAnswer={async input => (await run({ action: 'answer', date: view.date, target: 'retry', sessionId: session.id, itemId: session.question!.id, input })).feedback!}
   onHint={async () => { await run({ action: 'hint', date: view.date, target: 'retry', sessionId: session.id, itemId: session.question!.id }); }}
   onFinish={() => setShowResult(true)}/> :
   <section className="empty-card"><h2>{!wrong ? '오늘은 틀린 문제가 없어요.' : session ? '오답 다시 풀기를 마쳤어요.' : '오늘 틀린 문제만 다시 풀어 봐요.'}</h2>
    <p>{session ? `${session.total}문제 중 ${session.answers.filter(a => a.correct).length}문제를 맞혔어요.` : wrong ? `${wrong}문제를 부담 없이 다시 확인해요.` : '모든 문제를 맞혔어요!'}</p>
    <ErrorNote message={error}/><div className="study-actions">{wrong > 0 && <button className="button primary" disabled={busy} onClick={start}>{busy ? '준비하는 중…' : session ? '오답 처음부터 다시 풀기' : '오답 풀이 시작'}</button>}
    <button className="button secondary" onClick={() => navigate('/result')}>오늘의 결과로 돌아가기</button></div></section>}
  {session && showResult && <AnswerList answers={session.answers}/>}</>;
}
