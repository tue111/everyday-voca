// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SpeechPlayer } from '../src/SpeechPlayer';
import type { Card } from '../shared/contracts';
const item: Card = { id:'x',expression:'catch up',kind:'구동사',meaning:'따라잡다',example:'I need to catch up.',translation:'따라잡아야 해요.' };
afterEach(cleanup);
it('cancels a pending request on card departure and ignores its late response',async()=>{
  let finish!: (r: Response) => void;
  const fetcher=vi.fn().mockImplementation(()=>new Promise<Response>(r=>{finish=r;}));
  vi.stubGlobal('fetch',fetcher);
  const create=vi.fn();vi.stubGlobal('URL',{createObjectURL:create,revokeObjectURL:vi.fn()});
  const page=render(<SpeechPlayer date="2026-09-24" item={item}/>);
  fireEvent.click(screen.getByRole('button',{name:'표현 듣기'}));
  const signal=fetcher.mock.calls[0][1].signal as AbortSignal;
  page.unmount();expect(signal.aborted).toBe(true);
  await act(async()=>{finish({ok:true,status:200,blob:async()=>new Blob(['audio'],{type:'audio/mpeg'})} as Response);});
  expect(create).not.toHaveBeenCalled();
});
it('reuses downloaded audio, preserves pitch and pauses playback on unmount',async()=>{
  const play=vi.fn().mockResolvedValue(undefined),pause=vi.fn(),instances:{playbackRate:number;preservesPitch:boolean}[]=[];
  class Player { playbackRate=1;preservesPitch=false;play=play;pause=pause; constructor(){instances.push(this);} }
  vi.stubGlobal('Audio',Player);
  const revoke=vi.fn();vi.stubGlobal('URL',{createObjectURL:()=> 'blob:fixture',revokeObjectURL:revoke});
  const fetcher=vi.fn().mockResolvedValue({ok:true,status:200,blob:async()=>new Blob(['audio'],{type:'audio/mpeg'})});vi.stubGlobal('fetch',fetcher);
  const page=render(<SpeechPlayer date="2026-09-24" item={item}/>);
  fireEvent.change(screen.getByLabelText('음성 재생 속도'),{target:{value:'0.85'}});
  fireEvent.click(screen.getByRole('button',{name:'표현 듣기'}));
  await waitFor(()=>expect(play).toHaveBeenCalledTimes(1));
  expect(instances[0]).toMatchObject({playbackRate:.85,preservesPitch:true});
  await waitFor(()=>expect(screen.getByRole('button',{name:'표현 듣기'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'표현 듣기'}));
  await waitFor(()=>expect(play).toHaveBeenCalledTimes(2));expect(fetcher).toHaveBeenCalledTimes(1);
  page.unmount();expect(pause).toHaveBeenCalled();expect(revoke).toHaveBeenCalledWith('blob:fixture');
});
it('exposes retry and explicit device fallback after provider failure',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503,json:async()=>({error:{message:'API 키 설정이 필요해요.'}})}));
  render(<SpeechPlayer date="2026-09-24" item={item}/>);
  fireEvent.click(screen.getByRole('button',{name:'예문 듣기'}));
  expect(await screen.findByText('API 키 설정이 필요해요.')).toBeVisible();
  expect(screen.getByRole('button',{name:'다시 시도'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'기기 음성으로 듣기'})).toBeVisible();
});
