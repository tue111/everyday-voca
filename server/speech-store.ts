import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { replaceFile } from './atomic-file.js';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Binary, type Collection, type MongoClient } from 'mongodb';
export type AudioFile = { bytes: Uint8Array; mime: 'audio/mpeg' | 'audio/wav' };
const lifetime = 30 * 86400000;
export interface AudioStore {
  get(key: string, now: Date): Promise<AudioFile | undefined>;
  put(key: string, audio: AudioFile, now: Date): Promise<void>;
}
export class MemoryAudioStore implements AudioStore {
  entries = new Map<string, { audio: AudioFile; expires: number }>();
  async get(key: string, now: Date) {
    const entry = this.entries.get(key);
    if (!entry || entry.expires <= now.getTime()) { this.entries.delete(key); return; }
    entry.expires = now.getTime() + lifetime; return entry.audio;
  }
  async put(key: string, audio: AudioFile, now: Date) { this.entries.set(key, { audio, expires: now.getTime() + lifetime }); }
}
export class FileAudioStore implements AudioStore {
  constructor(private directory: string) {}
  private path(key: string) { if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid audio key'); return join(this.directory, key + '.json'); }
  async get(key: string, now: Date) {
    const path = this.path(key);
    try {
      const value = JSON.parse(await readFile(path, 'utf8')) as { data: string; mime: AudioFile['mime']; expires: number };
      if (value.expires <= now.getTime()) { await unlink(path); return; }
      const audio = { bytes: Buffer.from(value.data, 'base64'), mime: value.mime };
      await this.put(key, audio, now); return audio;
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  async put(key: string, audio: AudioFile, now: Date) {
    const path = this.path(key), temporary = path + '.' + randomUUID() + '.tmp';
    await mkdir(this.directory, { recursive: true });
    await writeFile(temporary, JSON.stringify({ data: Buffer.from(audio.bytes).toString('base64'), mime: audio.mime, expires: now.getTime() + lifetime }), { mode: 0o600 });
    await replaceFile(temporary, path);
  }
}
type AudioDocument = { _id: string; data: Binary; mime: AudioFile['mime']; expiresAt: Date };
export class MongoAudioStore implements AudioStore {
  private collection: Collection<AudioDocument>;
  private ready: Promise<unknown>;
  constructor(client: MongoClient, database: string) {
    this.collection = client.db(database).collection<AudioDocument>('speech_audio');
    this.ready = this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }
  async get(key: string, now: Date) {
    await this.ready;
    const doc = await this.collection.findOneAndUpdate({ _id: key, expiresAt: { $gt: now } }, { $set: { expiresAt: new Date(now.getTime() + lifetime) } }, { returnDocument: 'after' });
    return doc ? { bytes: doc.data.buffer, mime: doc.mime } : undefined;
  }
  async put(key: string, audio: AudioFile, now: Date) {
    await this.ready;
    await this.collection.updateOne({ _id: key }, { $set: { data: new Binary(Buffer.from(audio.bytes)), mime: audio.mime, expiresAt: new Date(now.getTime() + lifetime) } }, { upsert: true });
  }
}
