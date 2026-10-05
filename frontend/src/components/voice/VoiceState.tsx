import { Mic, Brain, Volume2, Circle, Pause, PhoneOff, CheckCircle2, AlertCircle } from 'lucide-react';
import type { VoiceState } from '@/types/call';

const stateInfo: Record<VoiceState, { icon: typeof Mic; label: string; color: string; bg: string }> = {
  IDLE: { icon: Circle, label: 'Ready', color: 'text-stone-500', bg: 'bg-stone-50' },
  LISTENING: { icon: Mic, label: 'Listening...', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  THINKING: { icon: Brain, label: 'Thinking...', color: 'text-amber-700', bg: 'bg-amber-50' },
  SPEAKING: { icon: Volume2, label: 'Aria is speaking...', color: 'text-teal-700', bg: 'bg-teal-50' },
  INTERRUPTED: { icon: Pause, label: 'Interrupted', color: 'text-orange-700', bg: 'bg-orange-50' },
  ENDING: { icon: PhoneOff, label: 'Ending call...', color: 'text-stone-600', bg: 'bg-stone-50' },
  COMPLETED: { icon: CheckCircle2, label: 'Call completed', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ERROR: { icon: AlertCircle, label: 'Error', color: 'text-red-700', bg: 'bg-red-50' },
};

export function VoiceStateDisplay({ state }: { state: VoiceState }) {
  const info = stateInfo[state];
  const Icon = info.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${info.bg} transition-all duration-300`}
      role="status"
      aria-live="polite"
      aria-label={info.label}
    >
      <Icon
        className={`${info.color} ${state === 'LISTENING' || state === 'THINKING' || state === 'SPEAKING' ? 'animate-pulse' : ''}`}
        size={18}
      />
      <span className={`text-sm font-medium ${info.color}`}>{info.label}</span>
    </div>
  );
}
