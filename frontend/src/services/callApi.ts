import api from './api';
import type { CallSession, CallSummary } from '@/types/call';
import type { TranscriptMessage } from '@/types/transcript';

export async function startCall(): Promise<CallSession> {
  const { data } = await api.post<CallSession>('/calls/start', {});
  return data;
}

export async function getAllOrders():Promise<any[]>{
  const {data} = await api.get<any[]>('/Orders');
  return data.data;
}

export async function endCall(sessionId: string): Promise<CallSummary> {
  const { data } = await api.post<CallSummary>(
    `/calls/${sessionId}/end`,
    {}
  );
  return data;
}

export async function getCallSummary(sessionId: string): Promise<CallSummary> {
  const { data } = await api.get<CallSummary>(`/calls/${sessionId}/summary`);
  return data;
}

export async function getCallTranscript(
  sessionId: string
): Promise<TranscriptMessage[]> {
  const { data } = await api.get<TranscriptMessage[]>(
    `/calls/${sessionId}/transcript`
  );
  return data;
}
