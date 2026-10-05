import { STTResult, TTSResult } from 'src/common/interfaces';

export interface STTProvider {
  name: string;
  transcribe(audio: Buffer, options?: STTOptions): Promise<STTResult>;
}

export interface STTOptions {
  language?: string;
  model?: string;
}

export interface TTSProvider {
  name: string;
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}

export interface TTSOptions {
  language?: string;
  voice?: string;
  speed?: number;
}
