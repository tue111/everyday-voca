import { rename } from 'node:fs/promises';
// Windows scanners may briefly hold the destination. Keep the previous file intact
// and retry only the atomic rename; never delete the destination to make it succeed.
export async function replaceFile(source: string, destination: string, move = rename) {
  for (let attempt = 0; ; attempt++) {
    try { await move(source, destination); return; }
    catch (e) {
      if (attempt >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes((e as NodeJS.ErrnoException).code ?? '')) throw e;
      await new Promise(resolve => setTimeout(resolve, 25 * 2 ** attempt));
    }
  }
}
