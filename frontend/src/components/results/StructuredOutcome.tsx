import { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import { Card } from '@/components/common/Card';

export type StructuredOutcomeData = {
  customer_intent: string;
  order_id?: string;
  resolution_status: string;
  call_summary: string;
};

export function StructuredOutcome({
  outcome,
}: {
  outcome: StructuredOutcomeData;
}) {
  const [copied, setCopied] = useState(false);

  const structuredData = {
    customer_intent: outcome.customer_intent,
    order_id: outcome.order_id,
    resolution_status: outcome.resolution_status,
    call_summary: outcome.call_summary,
  };

  const json = JSON.stringify(
    structuredData,
    null,
    2,
  );

  const copyJson = async () => {
    await navigator.clipboard.writeText(json);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code2
            size={16}
            className="text-stone-600"
          />

          <h3 className="text-base font-semibold text-stone-800">
            Structured Call Outcome
          </h3>
        </div>

        <button
          onClick={copyJson}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-emerald-700 transition-colors"
        >
          {copied ? (
            <Check size={14} />
          ) : (
            <Copy size={14} />
          )}

          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>

      <pre className="bg-stone-900 text-stone-100 rounded-xl p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{json}</code>
      </pre>
    </Card>
  );
}
