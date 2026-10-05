import { Controller, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { SuccessResponse } from 'src/common/interfaces';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  async getAllOrders(): Promise<SuccessResponse<any[]>> {
    const orders = await this.ordersService.getAllOrders();
    return { success: true, data: orders };
  }

  @Get('sample')
  @ApiOperation({ summary: 'Get sample orders for testing' })
  @ApiResponse({ status: 200, description: 'Sample orders' })
  async getSampleOrders(): Promise<SuccessResponse<any[]>> {
    const orders = await this.ordersService.getAllOrders();
    return { success: true, data: orders };
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order by order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('orderId') orderId: string): Promise<SuccessResponse<any>> {
    const order = await this.ordersService.getOrderByOrderId(orderId);
    return { success: true, data: order };
  }
}
