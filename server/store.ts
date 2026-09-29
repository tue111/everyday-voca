import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { replaceFile } from './atomic-file.js';
import { dirname } from 'node:path';
import { BSON, MongoClient, type Collection } from 'mongodb';

export interface Store<T> { read(): Promise<T>; update<R>(mutate: (state: T) => R): Promise<R>; }
export class MemoryStore<T> implements Store<T> {
  protected value: T;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(initial: T) { this.value = structuredClone(initial); }
  async read() { await this.queue; return structuredClone(this.value); }
  protected async persist(_next: T) {}
  update<R>(mutate: (state: T) => R): Promise<R> {
    const task = this.queue.then(async () => {
      const next = structuredClone(this.value);
      const result = mutate(next);
      await this.persist(next);
      this.value = next;
      return structuredClone(result);
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
export class FileStore<T> extends MemoryStore<T> {
  private constructor(initial: T, private path: string) { super(initial); }
  static async open<T>(path: string, initial: T) {
    let value = initial;
    try { value = JSON.parse(await readFile(path, 'utf8')) as T; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    return new FileStore(value, path);
  }
  protected async persist(next: T) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path + '.tmp', JSON.stringify(next), { mode: 0o600 });
    await replaceFile(this.path + '.tmp', this.path);
  }
}
type StateDocument<T> = { _id: string; revision: number; value: T };
export class MongoStore<T> implements Store<T> {
  private collection: Collection<StateDocument<T>>;
  constructor(client: MongoClient, db: string, private initial: T) {
    this.collection = client.db(db).collection<StateDocument<T>>('application_state');
  }
  private async document() {
    const existing = await this.collection.findOne({ _id: 'main' });
    if (existing) return existing;
    try { await this.collection.insertOne({ _id: 'main', revision: 0, value: structuredClone(this.initial) }); }
    catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
    const created = await this.collection.findOne({ _id: 'main' });
    if (!created) throw new Error('State initialization failed');
    return created;
  }
  async read() { return structuredClone((await this.document()).value); }
  async update<R>(mutate: (state: T) => R): Promise<R> {
    for (let retry = 0; retry < 40; retry++) {
      const doc = await this.document();
      const next = structuredClone(doc.value);
      const result = mutate(next);
      if (BSON.calculateObjectSize({ value: next }) > 12 * 1024 * 1024) throw new Error('Storage safety limit reached; export and migrate aggregates.');
      const updated = await this.collection.updateOne(
        { _id: 'main', revision: doc.revision },
        { $set: { value: next }, $inc: { revision: 1 } },
      );
      if (updated.modifiedCount === 1) return structuredClone(result);
      await new Promise(resolve => setTimeout(resolve, Math.min(retry * 4, 40)));
    }
    throw new Error('Concurrent update exhausted; retry the request.');
  }
}
