import type { Speaker } from './call';

export interface WsSessionStart {
  type: 'session.start';
  sessionId: string;
}

export interface WsAudioInput {
  type: 'audio.input';
}

export interface WsAudioEnd {
  type: 'audio.end';
}

export interface WsTranscriptPartial {
  type: 'transcript.partial';
  speaker: Speaker;
  text: string;
}

export interface WsTranscriptFinal {
  type: 'transcript.final';
  speaker: Speaker;
  text: string;
  timestamp: string;
}

export interface WsAgentState {
  type: 'agent.thinking' | 'agent.speaking' | 'agent.interrupted';
}

export interface WsAgentAudio {
  type: 'agent.audio';
  audio: string;
  format?: string;
}

export interface WsToolStarted {
  type: 'tool.started';
  tool: string;
  label: string;
  target?: string;
}

export interface WsToolCompleted {
  type: 'tool.completed';
  tool: string;
  label: string;
  target?: string;
}

export interface WsError {
  type: 'error';
  message: string;
  code?: string;
}

export interface WsSessionEnd {
  type: 'session.end';
  summary?: unknown;
  transcript?: unknown;
}

export type WsMessage =
  | WsSessionStart
  | WsAudioInput
  | WsAudioEnd
  | WsTranscriptPartial
  | WsTranscriptFinal
  | WsAgentState
  | WsAgentAudio
  | WsToolStarted
  | WsToolCompleted
  | WsError
  | WsSessionEnd;

export type WsMessageHandler = (message: WsMessage) => void;
