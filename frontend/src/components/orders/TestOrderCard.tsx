import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import type { Order } from '@/types/order';
import { formatCurrency } from '@/utils/formatters';

const statusVariant: Record<string, 'success' | 'warning' | 'info'> = {
  'Out for Delivery': 'warning',
  'Delivered': 'success',
  'Processing': 'info',
};

export function TestOrderCard({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(order.orderId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-mono text-sm font-semibold text-stone-800">{order.orderId}</p>
          <p className="text-xs text-stone-500 mt-0.5">{order.customerName}</p>
        </div>
        <Badge variant={statusVariant[order.status] || 'neutral'}>{order.status}</Badge>
      </div>

      <p className="text-sm text-stone-700 mt-2">{order.product}</p>
      <p className="text-sm font-medium text-stone-800 mt-1">{formatCurrency(order.value)}</p>

      {order.tracking && (
        <p className="text-xs text-stone-500 mt-2">{order.tracking}</p>
      )}
      {order.expected && (
        <p className="text-xs text-stone-500">Expected: {order.expected}</p>
      )}
      {order.delivered && (
        <p className="text-xs text-stone-500">Delivered: {order.delivered}</p>
      )}
      {order.ordered && (
        <p className="text-xs text-stone-500">Ordered: {order.ordered}</p>
      )}
      {order.cancellation && (
        <p className="text-xs text-emerald-600 mt-1">{order.cancellation}</p>
      )}

      <button
        onClick={copyId}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-emerald-700 transition-colors"
        aria-label={`Copy order ID ${order.orderId}`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied!' : 'Copy Order ID'}
      </button>
    </Card>
  );
}
