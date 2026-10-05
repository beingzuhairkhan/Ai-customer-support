import { Injectable, Logger } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { Order } from './schemas/order.schema';
import { ToolResult } from 'src/common/interfaces';
import { ErrorCode } from 'src/common/enums';
import { normalizeOrderId, isValidOrderIdFormat } from 'src/common/utils';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private orderRepository: OrderRepository) {}

  async getOrderByOrderId(rawOrderId: string): Promise<Order | null> {
    return this.orderRepository.findByOrderId(rawOrderId);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepository.findAll();
  }

  async getOrderToolResult(rawOrderId: string): Promise<ToolResult> {
    if (!isValidOrderIdFormat(rawOrderId)) {
      return {
        success: false,
        code: ErrorCode.INVALID_ORDER_ID,
        message: 'The order ID format is invalid. Please provide a valid order ID like ORD-101.',
      };
    }

    const orderId = normalizeOrderId(rawOrderId);
    let order: Order | null;

    try {
      order = await this.orderRepository.findByOrderId(rawOrderId);
    } catch (err) {
      this.logger.error(`Database error looking up order ${orderId}: ${err.message}`);
      return {
        success: false,
        code: ErrorCode.DATABASE_ERROR,
        message: 'Order information is temporarily unavailable.',
      };
    }

    if (!order) {
      return {
        success: false,
        code: ErrorCode.ORDER_NOT_FOUND,
        message: 'No order was found with this ID.',
      };
    }

    return {
      success: true,
      data: {
        orderId: order.orderId,
        customerName: order.customerName,
        product: order.product,
        value: order.value,
        status: order.status,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        expectedDelivery: order.expectedDelivery,
        deliveredAt: order.deliveredAt,
        notes: order.notes,
        cancellationEligible: order.cancellationEligible,
        returnEligible: order.returnEligible,
      },
    };
  }

  async upsertOrder(data: Partial<Order>): Promise<Order> {
    return this.orderRepository.upsertByOrderId(data);
  }

  async countOrders(): Promise<number> {
    return this.orderRepository.countDocuments();
  }
}
