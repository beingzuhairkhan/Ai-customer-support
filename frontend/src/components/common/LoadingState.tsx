import { Loader2 } from 'lucide-react';

export function LoadingState({
  message = 'Loading...',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <Loader2 className="text-emerald-600 animate-spin" size={24} />
      <p className="text-stone-500 text-sm">{message}</p>
    </div>
  );
}
