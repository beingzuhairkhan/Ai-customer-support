import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import {
  Target,
  Package,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import type { CallSummary } from '@/types/call';
import { formatDuration } from '@/utils/formatters';

function resolutionVariant(
  status: string,
): 'success' | 'warning' | 'info' {
  if (
    status === 'RESOLVED' ||
    status === 'INFORMATION_PROVIDED'
  ) {
    return 'success';
  }

  if (status === 'PARTIAL') {
    return 'warning';
  }

  return 'info';
}

export function CallSummaryCard({
  summary,
}: {
  summary: CallSummary;
}) {
  console.log('CallSummaryCard summary:', summary);
  const outcome = summary.outcome || {
    customer_intent: summary.customerIntent,
    order_id: summary.orderId,
    resolution_status: summary.resolutionStatus,
    call_summary: summary.summary,
  };

  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-stone-800 mb-4">
        Call Summary
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Target
              size={16}
              className="text-emerald-600"
            />
          </div>

          <div>
            <p className="text-xs text-stone-500">
              Customer Intent
            </p>

            <p className="text-sm font-medium text-stone-800">
              {outcome.customer_intent || '—'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Package
              size={16}
              className="text-teal-600"
            />
          </div>

          <div>
            <p className="text-xs text-stone-500">
              Order ID
            </p>

            <p className="text-sm font-mono font-medium text-stone-800">
              {outcome.order_id || '—'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2
              size={16}
              className="text-amber-600"
            />
          </div>

          <div>
            <p className="text-xs text-stone-500">
              Resolution
            </p>

            <Badge
              variant={resolutionVariant(
                outcome.resolution_status || '',
              )}
              className="mt-0.5"
            >
              {outcome.resolution_status || '—'}
            </Badge>
          </div>
        </div>

        {summary.duration != null && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
              <FileText
                size={16}
                className="text-stone-600"
              />
            </div>

            <div>
              <p className="text-xs text-stone-500">
                Duration
              </p>

              <p className="text-sm font-medium text-stone-800">
                {formatDuration(summary.duration)}
              </p>
            </div>
          </div>
        )}
      </div>

      {outcome.call_summary && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <p className="text-xs text-stone-500 mb-1.5">
            Summary
          </p>

          <p className="text-sm text-stone-700 leading-relaxed">
            {outcome.call_summary}
          </p>
        </div>
      )}
    </Card>
  );
}
