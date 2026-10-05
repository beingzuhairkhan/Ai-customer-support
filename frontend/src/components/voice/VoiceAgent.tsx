import { Sparkles } from 'lucide-react';
import { VoiceOrb } from './VoiceOrb';
import { VoiceStateDisplay } from './VoiceState';
import { CallControls } from './CallControls';
import { CallTimer } from './CallTimer';
import { MicrophoneStatus } from './MicrophoneStatus';
import { AudioVisualizer } from './AudioVisualizer';
import type { VoiceState } from '@/types/call';
import type { MicPermission } from '@/hooks/useMicrophone';

export function VoiceAgent({
  voiceState,
  isCallActive,
  isStarting,
  isEnding,
  isMuted,
  callDuration,
  micPermission,
  micStream,
  error,
  onStart,
  onEnd,
  onToggleMute,
  onRetryMic,
}: {
  voiceState: VoiceState;
  isCallActive: boolean;
  isStarting: boolean;
  isEnding: boolean;
  isMuted: boolean;
  callDuration: number;
  micPermission: MicPermission;
  micStream: MediaStream | null;
  error: string | null;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onRetryMic: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-8 px-6">
      {/* Avatar header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm">
          <Sparkles className="text-white" size={18} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-stone-800 leading-tight">Aria</p>
          <p className="text-xs text-stone-500 leading-tight">AI Customer Support Specialist</p>
        </div>
      </div>

      {/* Voice orb */}
      <VoiceOrb state={voiceState} />

      {/* State indicator */}
      <VoiceStateDisplay state={voiceState} />

      {/* Timer + connection info */}
      {isCallActive && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <CallTimer elapsed={callDuration} isActive={isCallActive} />
          <MicrophoneStatus permission={micPermission} isMuted={isMuted} />
        </div>
      )}

      {/* Audio visualizer */}
      {isCallActive && (
        <div className="w-full max-w-xs">
          <AudioVisualizer state={voiceState} stream={micStream} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          {(micPermission === 'denied') && (
            <button
              onClick={onRetryMic}
              className="mt-2 text-sm text-emerald-700 hover:text-emerald-800 underline font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-2">
        <CallControls
          isCallActive={isCallActive}
          isStarting={isStarting}
          isEnding={isEnding}
          isMuted={isMuted}
          voiceState={voiceState}
          onStart={onStart}
          onEnd={onEnd}
          onToggleMute={onToggleMute}
        />
      </div>
    </div>
  );
}
