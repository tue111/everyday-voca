import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { Card } from '../shared/contracts';
import type { SpeechRequest } from '../shared/speech';
export function SpeechPlayer({ date, item }: { date: string; item: Card }) {
  const [rate, setRate] = useState(1), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [failed, setFailed] = useState(false);
  const target = useRef<SpeechRequest['target']>('expression'), controller = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null), urls = useRef(new Map<string, string>()), sequence = useRef(0);
  const stop = () => {
    sequence.current++; controller.current?.abort(); audio.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };
  useEffect(() => {
    const cache = urls.current;
    return () => { stop(); for (const url of cache.values()) URL.revokeObjectURL(url); cache.clear(); };
  }, []);
  async function listen(kind: SpeechRequest['target']) {
    stop(); const id = sequence.current;
    target.current = kind; setBusy(true); setFailed(false); 
    setNote('음성을 준비하고 있어요…');
    const abort = new AbortController(); controller.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 55000);
    try {
      let url = urls.current.get(kind);
      if (!url) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const response = await fetch('/api/speech', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, itemId: item.id, target: kind }), signal: abort.signal });
          if (response.status === 202) {
            await new Promise<void>((resolve, reject) => {
              const cancel = () => { clearTimeout(wait); reject(new Error('cancelled')); };
              const wait = setTimeout(() => { abort.signal.removeEventListener('abort', cancel); resolve(); }, 1500);
              abort.signal.addEventListener('abort', cancel, { once: true });
              if (abort.signal.aborted) cancel();
            });
            continue;
          }
          if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message || '음성을 불러오지 못했어요.'); }
          const blob = await response.blob();
          if (!blob.type.startsWith('audio/') || !blob.size) throw new Error('음성 파일을 재생할 수 없어요.');
          if (id !== sequence.current) return;
          url = URL.createObjectURL(blob); urls.current.set(kind, url); break;
        }
      }
      if (id !== sequence.current) return;
      if (!url) throw new Error('음성 준비가 지연되고 있어요. 잠시 후 다시 시도해 주세요.');
      const player = new Audio(url); audio.current = player;
      player.playbackRate = rate; player.preservesPitch = true;
      player.onended = () => { if (id === sequence.current) setNote(''); };
      player.onerror = () => { if (id === sequence.current) { setNote('음성을 재생하지 못했어요. 다시 시도해 주세요.'); setFailed(true); } };
      await player.play();
      if (id === sequence.current) setNote(kind === 'expression' ? '표현을 듣고 있어요.' : '예문을 듣고 있어요.');
    } catch (e) {
      if (id === sequence.current) { setFailed(true); setNote(abort.signal.aborted ? '음성 준비 시간이 길어졌어요. 다시 시도해 주세요.' : e instanceof Error && e.name === 'NotAllowedError' ? '음성이 준비됐어요. 듣기 버튼을 한 번 더 눌러 주세요.' : e instanceof Error ? e.message : '음성을 불러오지 못했어요.'); }
    } finally { clearTimeout(timer); if (id === sequence.current) setBusy(false); }
  }
  async function deviceVoice() {
    stop(); const id = sequence.current; setBusy(false);
    if (!('speechSynthesis' in window)) { setNote('이 기기에서는 기본 음성을 사용할 수 없어요.'); return; }
    const synth = window.speechSynthesis;
    if (!synth.getVoices().length) await new Promise<void>(resolve => {
      const done = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', done); resolve(); };
      const timer = setTimeout(done, 1000); synth.addEventListener('voiceschanged', done, { once: true });
    });
    if (id !== sequence.current) return;
    const voice = synth.getVoices().find(v => v.lang.replace('_', '-').toLowerCase() === 'en-us');
    if (!voice) { setNote('기기에 미국식 영어 음성이 없어요. 기기 음성 설정을 확인해 주세요.'); return; }
    const utterance = new SpeechSynthesisUtterance(item[target.current]);
    utterance.voice = voice; utterance.lang = 'en-US'; utterance.rate = rate;
    utterance.onerror = () => { if (id === sequence.current) setNote('기기 음성을 재생하지 못했어요.'); };
    synth.speak(utterance); setNote('기기 기본 음성으로 재생합니다.');
  }
  return <div className="speech-player">
    <div className="speech-controls">
      <button className="listen" disabled={busy} onClick={() => void listen('expression')}><Volume2 size={17}/> 표현 듣기</button>
      <button className="listen" disabled={busy} onClick={() => void listen('example')}><Volume2 size={17}/> 예문 듣기</button>
      <label className="small">속도 <select aria-label="음성 재생 속도" value={rate} onChange={e => { const value = Number(e.target.value); setRate(value); if (audio.current) audio.current.playbackRate = value; }}><option value={1}>1.0×</option><option value={0.85}>0.85×</option></select></label>
    </div>
    <p className="small muted">미국식 영어 · AI 생성 음성</p>
    <p className="small muted" role="status" aria-live="polite">{note}</p>
    {failed && <div className="speech-controls"><button className="listen" onClick={() => void listen(target.current)}>다시 시도</button><button className="listen" onClick={() => void deviceVoice()}>기기 음성으로 듣기</button></div>}
  </div>;
}
