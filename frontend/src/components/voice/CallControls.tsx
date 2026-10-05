import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/common/Button';

export function CallControls({
  isCallActive,
  isStarting,
  isEnding,
  isMuted,
  voiceState,
  onStart,
  onEnd,
  onToggleMute,
}: {
  isCallActive: boolean;
  isStarting: boolean;
  isEnding: boolean;
  isMuted: boolean;
  voiceState: string;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}) {
  if (!isCallActive) {
    return (
      <Button
        variant="primary"
        size="lg"
        onClick={onStart}
        disabled={isStarting}
        className="w-full sm:w-auto"
      >
        <Phone size={20} />
        {isStarting ? 'Starting...' : 'Start Call'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <Button
        variant="secondary"
        size="md"
        onClick={onToggleMute}
        disabled={isEnding || voiceState === 'ENDING'}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        {isMuted ? 'Unmute' : 'Mute'}
      </Button>

      <Button
        variant="danger"
        size="md"
        onClick={onEnd}
        disabled={isEnding}
        aria-label="End call"
      >
        <PhoneOff size={18} />
        {isEnding ? 'Ending call...' : 'End Call'}
      </Button>
    </div>
  );
}
