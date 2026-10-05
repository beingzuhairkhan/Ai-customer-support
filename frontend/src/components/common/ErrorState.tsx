import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try Again',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="text-red-600" size={24} />
      </div>
      <p className="text-stone-700 text-sm max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
