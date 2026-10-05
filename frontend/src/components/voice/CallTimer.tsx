import { formatDuration } from '@/utils/formatters';
import { Clock } from 'lucide-react';

export function CallTimer({ elapsed, isActive }: { elapsed: number; isActive: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-stone-200">
      <Clock
        size={14}
        className={`${isActive ? 'text-emerald-600' : 'text-stone-400'}`}
      />
      <span
        className={`text-sm font-mono tabular-nums ${isActive ? 'text-stone-700' : 'text-stone-400'}`}
      >
        {formatDuration(elapsed)}
      </span>
    </div>
  );
}
