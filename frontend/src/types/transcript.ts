import type { Speaker } from './call';

export interface TranscriptMessage {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: string;
  isFinal: boolean;
}

export interface ToolActivity {
  id: string;
  toolName: string;
  label: string;
  target?: string;
  status: 'started' | 'completed';
  timestamp: string;
}
