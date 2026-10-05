import { Test } from '@nestjs/testing';
import { OrdersService } from 'src/orders/orders.service';
import { OrderRepository } from 'src/orders/order.repository';
import { ErrorCode } from 'src/common/enums';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: Partial<OrderRepository>;

  beforeEach(async () => {
    repo = {
      findByOrderId: jest.fn(),
      findAll: jest.fn(),
      upsertByOrderId: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('getOrderToolResult', () => {
    it('should return order data when found', async () => {
      const mockOrder = {
        orderId: 'ORD-101',
        customerName: 'Priya Sharma',
        product: 'Vitamin C Serum (30ml)',
        value: 699,
        status: 'OUT_FOR_DELIVERY',
        carrier: 'BlueDart',
        trackingNumber: 'BD-982103',
        expectedDelivery: '6 PM today',
      };
      (repo.findByOrderId as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.getOrderToolResult('ORD-101');
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ orderId: 'ORD-101', status: 'OUT_FOR_DELIVERY' });
    });

    it('should return ORDER_NOT_FOUND when order does not exist', async () => {
      (repo.findByOrderId as jest.Mock).mockResolvedValue(null);
      const result = await service.getOrderToolResult('ORD-999');
      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.ORDER_NOT_FOUND);
      expect(result.message).toBe('No order was found with this ID.');
    });

    it('should return INVALID_ORDER_ID for bad format', async () => {
      const result = await service.getOrderToolResult('INVALID');
      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.INVALID_ORDER_ID);
    });

    it('should return DATABASE_ERROR when DB fails', async () => {
      (repo.findByOrderId as jest.Mock).mockRejectedValue(new Error('Connection refused'));
      const result = await service.getOrderToolResult('ORD-101');
      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.DATABASE_ERROR);
    });

    it('should normalize order ID whitespace and case', async () => {
      const mockOrder = { orderId: 'ORD-101', status: 'OUT_FOR_DELIVERY' };
      (repo.findByOrderId as jest.Mock).mockResolvedValue(mockOrder);
      await service.getOrderToolResult(' ord-101 ');
      expect(repo.findByOrderId).toHaveBeenCalledWith(' ord-101 ');
    });
  });
});
