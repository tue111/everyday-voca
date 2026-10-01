import { describe, expect, it } from 'vitest';
import { commandSchema, NICKNAME_MAX_LENGTH } from '../shared/contracts';

describe('AUTH-03 nickname boundaries', () => {
  for (const action of ['register', 'rename'] as const) {
    it(`${action} accepts ten Korean characters and trims surrounding whitespace`, () => {
      const name = '가'.repeat(NICKNAME_MAX_LENGTH);
      expect(commandSchema.parse({ action, name: `  ${name}  ` })).toEqual({ action, name });
    });
    it(`${action} rejects empty names and overlong direct API input`, () => {
      for (const name of ['   ', '가'.repeat(11), 'a'.repeat(11)]) {
        expect(commandSchema.safeParse({ action, name }).success).toBe(false);
      }
    });
  }
});
