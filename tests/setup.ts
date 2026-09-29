import { beforeEach, afterEach, vi } from 'vitest';
beforeEach(() => {
  vi.stubGlobal('fetch', () => { throw new Error('Harness: external fetch is disabled. Inject a fake provider.'); });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
