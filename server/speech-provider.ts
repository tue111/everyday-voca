import OpenAI from 'openai';
import type { AudioFile } from './speech-store.js';
export const speechVersion = 'gpt-4o-mini-tts:marin:en-US:v1';
export interface SpeechGenerator { generate(text: string, context: string): Promise<AudioFile> }
export class OpenAISpeechGenerator implements SpeechGenerator {
  private client: OpenAI;
  constructor(key: string) { this.client = new OpenAI({ apiKey: key, timeout: 25000, maxRetries: 0 }); }
  async generate(text: string, context: string): Promise<AudioFile> {
    const response = await this.client.audio.speech.create({
      model: 'gpt-4o-mini-tts', voice: 'marin', input: text, response_format: 'mp3', speed: 1,
      instructions: 'Read ONLY the input, exactly once, in natural General American English. Clear conversational delivery, normal pace, no introduction or commentary. Use the following context only to resolve pronunciation; do not read it aloud: ' + context,
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 1024 * 1024) throw new Error('Invalid speech response size');
    return { bytes, mime: 'audio/mpeg' };
  }
}
// Playable silence deliberately stands in for speech in automated tests only.
export class FakeSpeechGenerator implements SpeechGenerator {
  calls = 0;
  async generate(): Promise<AudioFile> {
    this.calls++;
    const bytes = Buffer.alloc(44 + 8000);
    bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36); bytes.writeUInt32LE(8000, 40);
    return { bytes, mime: 'audio/wav' };
  }
}
