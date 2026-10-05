import { Phone, Sparkles, MessageSquare, Mic, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { TestOrdersPanel } from '@/components/orders/TestOrdersPanel';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useCallStore } from '@/store/callStore';

export function HomePage() {
  const navigate = useNavigate();
  const { startVoiceCall } = useVoiceCall();
  const isStarting = useCallStore((s) => s.isStarting);

  const handleStart = async () => {
    await startVoiceCall();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 mb-5">
          <Sparkles size={14} className="text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">AI Voice Customer Support</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold text-stone-800 mb-3 tracking-tight">
          Talk to <span className="text-emerald-600">Aria</span>
        </h1>
        <p className="text-lg text-stone-600 max-w-xl mx-auto mb-2">
          Aura Skincare's AI customer support specialist.
        </p>
        <p className="text-sm text-stone-500 max-w-lg mx-auto mb-8">
          Use your microphone to speak naturally with Aria about orders, shipping,
          returns, cancellations, and other Aura Skincare questions.
        </p>

        <Button
          variant="primary"
          size="lg"
          onClick={handleStart}
          disabled={isStarting}
          className="px-8 py-3.5 text-base"
        >
          <Phone size={20} />
          {isStarting ? 'Starting...' : 'Start Call'}
        </Button>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Card className="p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <Mic className="text-emerald-600" size={20} />
          </div>
          <p className="text-sm font-medium text-stone-800">Speak Naturally</p>
          <p className="text-xs text-stone-500 mt-1">Just talk — Aria listens and understands</p>
        </Card>
        <Card className="p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="text-amber-600" size={20} />
          </div>
          <p className="text-sm font-medium text-stone-800">Live Transcript</p>
          <p className="text-xs text-stone-500 mt-1">See the conversation in real time</p>
        </Card>
        <Card className="p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
            <Volume2 className="text-teal-600" size={20} />
          </div>
          <p className="text-sm font-medium text-stone-800">Hear Aria Reply</p>
          <p className="text-xs text-stone-500 mt-1">Voice responses with clear states</p>
        </Card>
      </div>

      {/* Test orders preview */}
      <Card className="p-6">
        <TestOrdersPanel />
      </Card>
    </div>
  );
}
