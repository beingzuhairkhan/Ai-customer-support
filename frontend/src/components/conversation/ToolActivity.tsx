import { Wrench, CheckCircle2 } from 'lucide-react';
import type { ToolActivity } from '@/types/transcript';

export function ToolActivityItem({ activity }: { activity: ToolActivity }) {
  const isCompleted = activity.status === 'completed';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-300 ${
        isCompleted
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-amber-50 text-amber-800'
      }`}
    >
      {isCompleted ? (
        <CheckCircle2 size={14} className="flex-shrink-0" />
      ) : (
        <Wrench size={14} className="flex-shrink-0 animate-pulse" />
      )}
      <span className="font-medium">{activity.label}</span>
      {activity.target && (
        <span className="font-mono font-semibold">{activity.target}</span>
      )}
      {!isCompleted && <span className="text-amber-600">...</span>}
      {isCompleted && <span className="text-emerald-600 ml-auto">Done</span>}
    </div>
  );
}
