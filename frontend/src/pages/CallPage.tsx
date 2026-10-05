import { useCallStore } from '@/store/callStore';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useCallTimer } from '@/hooks/useCallTimer';
import { useMicrophone } from '@/hooks/useMicrophone';
import { Card } from '@/components/common/Card';
import { VoiceAgent } from '@/components/voice/VoiceAgent';
import { TestOrdersPanel } from '@/components/orders/TestOrdersPanel';
import { LiveTranscript } from '@/components/conversation/LiveTranscript';
import { ConnectionStatus } from '@/components/voice/ConnectionStatus';
import { ErrorState } from '@/components/common/ErrorState';

export function CallPage() {
  const store = useCallStore();
  const { startVoiceCall, endVoiceCall, toggleMute, micPermission, micError, retryMic } = useVoiceCall();
  const { elapsed } = useCallTimer(store.isCallActive);
  const { stream } = useMicrophone();

  // If no active session, allow starting from here too
  if (!store.isCallActive && !store.isStarting && store.voiceState === 'IDLE') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold text-stone-800 mb-2">No active call</h2>
          <p className="text-sm text-stone-500 mb-6">
            Start a call to speak with Aria about your orders.
          </p>
          <button
            onClick={startVoiceCall}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
          >
            Start Call
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Connection bar */}
      <div className="flex items-center justify-between mb-4">
        <ConnectionStatus state={store.connectionState} />
        {store.sessionId && (
          <span className="text-xs text-stone-400 font-mono">
            Session: {store.sessionId.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_1fr] gap-4">
        {/* LEFT: Test Orders */}
        <div className="order-3 lg:order-1">
          <Card className="p-4 lg:sticky lg:top-20">
            <TestOrdersPanel />
          </Card>
        </div>

        {/* CENTER: Voice Agent */}
        <div className="order-1 lg:order-2">
          <Card>
            <VoiceAgent
              voiceState={store.voiceState}
              isCallActive={store.isCallActive}
              isStarting={store.isStarting}
              isEnding={store.isEnding}
              isMuted={store.isMuted}
              callDuration={elapsed}
              micPermission={micPermission}
              micStream={stream}
              error={store.error || micError}
              onStart={startVoiceCall}
              onEnd={endVoiceCall}
              onToggleMute={toggleMute}
              onRetryMic={retryMic}
            />
          </Card>

          {store.error && store.voiceState === 'ERROR' && (
            <Card className="mt-4">
              <ErrorState
                message={store.error}
                onRetry={startVoiceCall}
                retryLabel="Retry Call"
              />
            </Card>
          )}
        </div>

        {/* RIGHT: Live Conversation */}
        <div className="order-2 lg:order-3">
          <Card className="h-full flex flex-col" style={{ minHeight: '400px' }}>
            <LiveTranscript />
          </Card>
        </div>
      </div>

      {/* Mobile note */}
      <p className="text-xs text-stone-400 mt-4 text-center lg:hidden">
        Scroll to see test orders and conversation below.
      </p>
    </div>
  );
}
