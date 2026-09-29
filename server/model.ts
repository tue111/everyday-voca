import type { Attempt, Bundle, Item, Subscription } from '../shared/contracts.js';
export type Lesson = Bundle & { date: string; source: 'ai' | 'fallback' };
export type Progress = { card: number; cardsDone: boolean; answers: Attempt[]; hints: string[]; completedAt?: string };
export type Review = { item: Item; due: string; stage: number; wrong: boolean; learnedAt: string; lastAt: string; observations: { date: string; correct: boolean; hinted: boolean; age: number }[] };
export type User = {
  id: string; name: string; createdAt: string; recoveryHash: string;
  sessions: { hash: string; expires: string }[];
  progress: Record<string, Progress>; reviews: Record<string, Review>;
  reviewSession?: { id: string; date: string; keys: string[]; answers: Attempt[]; hints: string[] };
  subscriptions: Subscription[];
};
export type State = {
  users: Record<string, User>; lessons: Record<string, Lesson>;
  jobs: Record<string, { status: 'running' | 'done' | 'failed'; owner: string; until: string; attempts: number; note?: string }>;
  budgets: Record<string, { reserved: number; spent: number }>;
  deliveries: Record<string, { status: 'pending' | 'sent' | 'expired' | 'uncertain'; at: string }>;
  limits: Record<string, { count: number; until: number }>;
};
export const initialState = (): State => ({ users: {}, lessons: {}, jobs: {}, budgets: {}, deliveries: {}, limits: {} });
