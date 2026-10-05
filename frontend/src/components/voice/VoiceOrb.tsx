import type { VoiceState } from '@/types/call';

const stateConfig: Record<VoiceState, { color: string; ringColor: string; speed: string }> = {
  IDLE: { color: 'from-stone-300 to-stone-400', ringColor: 'ring-stone-200', speed: '' },
  LISTENING: { color: 'from-emerald-400 to-teal-500', ringColor: 'ring-emerald-200', speed: 'animate-pulse-slow' },
  THINKING: { color: 'from-amber-400 to-orange-500', ringColor: 'ring-amber-200', speed: 'animate-pulse' },
  SPEAKING: { color: 'from-emerald-500 to-teal-600', ringColor: 'ring-emerald-300', speed: 'animate-voice-wave' },
  INTERRUPTED: { color: 'from-orange-400 to-red-500', ringColor: 'ring-orange-200', speed: 'animate-pulse' },
  ENDING: { color: 'from-stone-400 to-stone-500', ringColor: 'ring-stone-200', speed: 'animate-pulse' },
  COMPLETED: { color: 'from-emerald-400 to-teal-500', ringColor: 'ring-emerald-200', speed: '' },
  ERROR: { color: 'from-red-400 to-red-600', ringColor: 'ring-red-200', speed: '' },
};

export function VoiceOrb({ state }: { state: VoiceState }) {
  const config = stateConfig[state];

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {/* Outer ring */}
      <div
        className={`absolute inset-0 rounded-full ring-4 ${config.ringColor} transition-all duration-500 ${
          state === 'SPEAKING' ? 'animate-expand-ring' : ''
        }`}
      />

      {/* Middle ring */}
      {state !== 'IDLE' && state !== 'COMPLETED' && state !== 'ERROR' && (
        <div
          className={`absolute inset-2 rounded-full ring-2 ${config.ringColor} opacity-50 ${
            state === 'LISTENING' || state === 'THINKING' ? 'animate-ping-slow' : ''
          }`}
        />
      )}

      {/* Core orb */}
      <div
        className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${config.color} ${config.speed} transition-all duration-500 shadow-lg flex items-center justify-center`}
      >
        {state === 'SPEAKING' && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-6 bg-white/80 rounded-full animate-bar-1" />
            <span className="w-1 h-10 bg-white/80 rounded-full animate-bar-2" />
            <span className="w-1 h-4 bg-white/80 rounded-full animate-bar-3" />
            <span className="w-1 h-8 bg-white/80 rounded-full animate-bar-4" />
            <span className="w-1 h-5 bg-white/80 rounded-full animate-bar-5" />
          </div>
        )}
        {state === 'THINKING' && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {state === 'LISTENING' && (
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 bg-white/70 rounded-full animate-bar-listen"
                style={{
                  height: `${8 + (i % 3) * 6}px`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        )}
        {state === 'IDLE' && (
          <svg className="w-10 h-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 1a4 4 0 014 4v6a4 4 0 11-8 0V5a4 4 0 014-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 10v1a7 7 0 11-14 0v-1" />
          </svg>
        )}
        {state === 'ERROR' && (
          <span className="text-white text-3xl font-light">!</span>
        )}
        {state === 'COMPLETED' && (
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {state === 'ENDING' && (
          <div className="w-8 h-8 border-2 border-white/60 border-t-white rounded-full animate-spin" />
        )}
        {state === 'INTERRUPTED' && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-5 bg-white/80 rounded-full" />
            <span className="w-1 h-3 bg-white/80 rounded-full" />
            <span className="w-1 h-6 bg-white/80 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
