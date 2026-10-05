export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ENDING'
  | 'COMPLETED'
  | 'ERROR';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type Speaker = 'customer' | 'agent';

export type ResolutionStatus =
  | 'RESOLVED'
  | 'UNRESOLVED'
  | 'PARTIAL'
  | 'INFORMATION_PROVIDED'
  | 'OUT_OF_SCOPE';

export interface CallOutcome {
  customer_intent: string;
  order_id: string | null;
  resolution_status: string;
  call_summary: string;
}

export interface CallSummary {
  sessionId: string;
  duration: number;
  customerIntent: string;
  orderId: string | null;
  resolutionStatus: string;
  summary: string;
  outcome: CallOutcome;
}

export interface CallSession {
  sessionId: string;
  status: 'active' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
  duration?: number;
}
