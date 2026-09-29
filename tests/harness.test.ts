import { describe, it, expect } from 'vitest';
describe('H-01 harness', () => {
  it('blocks an unexpected paid API call', () => {
    expect(() => fetch('https://api.openai.com/v1/responses')).toThrow('external fetch is disabled');
  });
  it('detects assertion failures', () => {
    expect(() => expect(1).toBe(2)).toThrow();
  });
});

if (process.env.HARNESS_PROBE === '1') it('intentional failure probe', () => expect(1).toBe(2));
