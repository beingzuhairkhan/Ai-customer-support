import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionState } from '@/types/call';

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const config = {
    connected: { icon: Wifi, label: 'Connected', color: 'text-emerald-600', dot: 'bg-emerald-500' },
    connecting: { icon: Loader2, label: 'Connecting...', color: 'text-amber-600', dot: 'bg-amber-500' },
    reconnecting: { icon: Loader2, label: 'Reconnecting...', color: 'text-amber-600', dot: 'bg-amber-500' },
    disconnected: { icon: WifiOff, label: 'Disconnected', color: 'text-stone-400', dot: 'bg-stone-400' },
    error: { icon: WifiOff, label: 'Connection error', color: 'text-red-600', dot: 'bg-red-500' },
  };

  const info = config[state];
  const Icon = info.icon;
  const isAnimated = state === 'connecting' || state === 'reconnecting';

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs ${info.color}`}>
      <Icon size={12} className={isAnimated ? 'animate-spin' : ''} />
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" />
      {info.label}
    </div>
  );
}
