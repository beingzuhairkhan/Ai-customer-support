import { Mic, MicOff, AlertCircle, Check } from 'lucide-react';
import type { MicPermission } from '@/hooks/useMicrophone';

export function MicrophoneStatus({
  permission,
  isMuted,
}: {
  permission: MicPermission;
  isMuted: boolean;
}) {
  if (permission === 'denied' || permission === 'unsupported') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-red-600">
        <AlertCircle size={14} />
        Microphone unavailable
      </div>
    );
  }

  if (isMuted) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-amber-600">
        <MicOff size={14} />
        Muted
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
        <Check size={14} />
        Microphone ready
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-stone-400">
      <Mic size={14} />
      Microphone inactive
    </div>
  );
}
