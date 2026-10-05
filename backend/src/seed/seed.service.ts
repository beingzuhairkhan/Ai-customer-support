import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from 'src/orders/orders.service';
import { OrderStatus } from 'src/common/enums';

const SEED_ORDERS = [
  {
    orderId: 'ORD-101',
    customerName: 'Priya Sharma',
    product: 'Vitamin C Serum (30ml)',
    value: 699,
    status: OrderStatus.OUT_FOR_DELIVERY,
    carrier: 'BlueDart',
    trackingNumber: 'BD-982103',
    expectedDelivery: '6 PM today',
    deliveredAt: null,
    notes: null,
    cancellationEligible: false,
    returnEligible: false,
  },
  {
    orderId: 'ORD-102',
    customerName: 'Rahul Verma',
    product: 'Hydrating Sunscreen SPF 50',
    value: 499,
    status: OrderStatus.DELIVERED,
    carrier: 'Delhivery',
    trackingNumber: 'DL-441029',
    expectedDelivery: null,
    deliveredAt: '14 days ago',
    notes: null,
    cancellationEligible: false,
    returnEligible: false,
  },
  {
    orderId: 'ORD-103',
    customerName: 'Ananya Patel',
    product: 'Green Tea Face Wash + Toner',
    value: 850,
    status: OrderStatus.PROCESSING,
    carrier: null,
    trackingNumber: null,
    expectedDelivery: null,
    deliveredAt: null,
    notes: 'Ordered 3 hours ago',
    cancellationEligible: true,
    returnEligible: false,
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private ordersService: OrdersService) {}

  async seed(): Promise<{ created: number; skipped: number; total: number }> {
    let created = 0;
    let skipped = 0;

    for (const orderData of SEED_ORDERS) {
      try {
        const existing = await this.ordersService.getOrderByOrderId(orderData.orderId);
        if (existing) {
          skipped++;
          this.logger.log(`Order ${orderData.orderId} already exists, skipping.`);
        } else {
          await this.ordersService.upsertOrder(orderData);
          created++;
          this.logger.log(`Seeded order ${orderData.orderId}.`);
        }
      } catch (err) {
        this.logger.error(`Failed to seed order ${orderData.orderId}: ${err.message}`);
      }
    }

    const total = await this.ordersService.countOrders();
    this.logger.log(`Seed complete. Created: ${created}, Skipped: ${skipped}, Total in DB: ${total}`);
    return { created, skipped, total };
  }
}
