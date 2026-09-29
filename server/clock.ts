export interface Clock { now(): Date }
export const systemClock: Clock = { now: () => new Date() };
export class FixedClock implements Clock {
  constructor(private time: string) {}
  now() { return new Date(this.time); }
  set(time: string) { this.time = time; }
}
export function koreanDate(date: Date) { return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10); }
export function addDays(day: string, count: number) { return new Date(Date.parse(day + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10); }
