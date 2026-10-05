import { useEffect, useState } from 'react';
import { TestOrderCard } from './TestOrderCard';
import type { Order } from '@/types/order';
import { getAllOrders } from '@/services/callApi'

export function TestOrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getAllOrders();
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-stone-800">Test Orders</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Use these IDs during testing
        </p>
      </div>

      {loading && (
        <p className="text-xs text-stone-500">
          Loading orders...
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="text-xs text-stone-500">
          No orders found.
        </p>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <TestOrderCard
              key={order.orderId}
              order={order}
            />
          ))}
        </div>
      )}
    </div>
  );
}