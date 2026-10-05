import { Injectable, Logger } from '@nestjs/common';
import { AgentTool, ToolResult } from 'src/common/interfaces';
import { OrdersService } from 'src/orders/orders.service';
import { OrderStatus } from 'src/common/enums';

@Injectable()
export class OrderToolService implements AgentTool {
  private readonly logger = new Logger(OrderToolService.name);

  name = 'get_order_details';
  description = 'Look up an Aura Skincare order by its order ID (e.g., ORD-101). Returns order status, product, delivery info, and eligibility flags.';
  parameters = {
    type: 'object',
    properties: {
      order_id: {
        type: 'string',
        description: 'The order ID to look up, e.g., ORD-101',
      },
    },
    required: ['order_id'],
  };

  constructor(private ordersService: OrdersService) {}

  async execute(args: unknown): Promise<ToolResult> {
    const { order_id } = args as { order_id: string };
    if (!order_id) {
      return {
        success: false,
        code: 'INVALID_ORDER_ID',
        message: 'An order ID is required.',
      };
    }
    this.logger.log(`Executing get_order_details for order_id: ${order_id}`);
    return this.ordersService.getOrderToolResult(order_id);
  }
}
