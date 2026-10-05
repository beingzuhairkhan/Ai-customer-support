import { create } from 'zustand';
import type {
  VoiceState,
  ConnectionState,
  CallSummary,
} from '@/types/call';
import type { TranscriptMessage, ToolActivity } from '@/types/transcript';

interface CallStore {
  sessionId: string | null;
  voiceState: VoiceState;
  connectionState: ConnectionState;
  isMuted: boolean;
  isCallActive: boolean;
  isStarting: boolean;
  isEnding: boolean;
  callDuration: number;
  transcript: TranscriptMessage[];
  partialTranscript: TranscriptMessage | null;
  toolActivities: ToolActivity[];
  summary: CallSummary | null;
  error: string | null;

  setSessionId: (id: string | null) => void;
  setVoiceState: (state: VoiceState) => void;
  setConnectionState: (state: ConnectionState) => void;
  setMuted: (muted: boolean) => void;
  setCallActive: (active: boolean) => void;
  setStarting: (starting: boolean) => void;
  setEnding: (ending: boolean) => void;
  setCallDuration: (seconds: number) => void;
  setError: (error: string | null) => void;
  setSummary: (summary: CallSummary | null) => void;

  addTranscriptMessage: (message: TranscriptMessage) => void;
  setPartialTranscript: (message: TranscriptMessage | null) => void;
  addToolActivity: (activity: ToolActivity) => void;
  updateToolActivity: (id: string, updates: Partial<ToolActivity>) => void;

  reset: () => void;
  resetForNewCall: () => void;
}

const initialState = {
  sessionId: null,
  voiceState: 'IDLE' as VoiceState,
  connectionState: 'disconnected' as ConnectionState,
  isMuted: false,
  isCallActive: false,
  isStarting: false,
  isEnding: false,
  callDuration: 0,
  transcript: [] as TranscriptMessage[],
  partialTranscript: null,
  toolActivities: [] as ToolActivity[],
  summary: null,
  error: null,
};

export const useCallStore = create<CallStore>((set) => ({
  ...initialState,

  setSessionId: (id) => set({ sessionId: id }),
  setVoiceState: (state) => set({ voiceState: state }),
  setConnectionState: (state) => set({ connectionState: state }),
  setMuted: (muted) => set({ isMuted: muted }),
  setCallActive: (active) => set({ isCallActive: active }),
  setStarting: (starting) => set({ isStarting: starting }),
  setEnding: (ending) => set({ isEnding: ending }),
  setCallDuration: (seconds) => set({ callDuration: seconds }),
  setError: (error) => set({ error }),
  setSummary: (summary) => set({ summary }),

  addTranscriptMessage: (message) =>
    set((s) => {
      if (s.partialTranscript && !message.isFinal) return s;
      if (s.partialTranscript && message.isFinal) {
        const filtered = s.transcript.filter(
          (m) => m.id !== s.partialTranscript?.id
        );
        return {
          transcript: [...filtered, message],
          partialTranscript: null,
        };
      }
      return { transcript: [...s.transcript, message] };
    }),

  setPartialTranscript: (message) =>
    set((s) => {
      if (message === null) {
        return { partialTranscript: null };
      }
      const filtered = s.transcript.filter(
        (m) => m.id !== message.id && !(!m.isFinal && m.speaker === message.speaker)
      );
      return {
        transcript: filtered,
        partialTranscript: message,
      };
    }),

  addToolActivity: (activity) =>
    set((s) => ({ toolActivities: [...s.toolActivities, activity] })),

  updateToolActivity: (id, updates) =>
    set((s) => ({
      toolActivities: s.toolActivities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  reset: () => set({ ...initialState }),
  resetForNewCall: () =>
    set({
      ...initialState,
    }),
}));
