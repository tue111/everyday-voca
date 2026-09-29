import { it, expect, vi } from 'vitest';
import { replaceFile } from '../server/atomic-file';
it('retries transient Windows locks without changing source/destination',async()=>{
  const move=vi.fn().mockRejectedValueOnce(Object.assign(new Error('locked'),{code:'EPERM'})).mockResolvedValue(undefined);
  await replaceFile('source.tmp','state.json',move);
  expect(move.mock.calls).toEqual([['source.tmp','state.json'],['source.tmp','state.json']]);
});
it('propagates permanent filesystem errors without retry',async()=>{
  const error=Object.assign(new Error('missing'),{code:'ENOENT'}),move=vi.fn().mockRejectedValue(error);
  await expect(replaceFile('source.tmp','state.json',move)).rejects.toBe(error);
  expect(move).toHaveBeenCalledTimes(1);
});
