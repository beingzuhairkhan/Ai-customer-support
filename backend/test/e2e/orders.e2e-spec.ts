import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { OrdersController } from 'src/orders/orders.controller';
import { OrdersService } from 'src/orders/orders.service';
import { ErrorCode, OrderStatus } from 'src/common/enums';

describe('OrdersController (integration)', () => {
  let app: INestApplication;
  let ordersService: Partial<OrdersService>;

  beforeAll(async () => {
    ordersService = {
      getAllOrders: jest.fn().mockResolvedValue([
        { orderId: 'ORD-101', status: OrderStatus.OUT_FOR_DELIVERY, customerName: 'Priya Sharma' },
        { orderId: 'ORD-102', status: OrderStatus.DELIVERED, customerName: 'Rahul Verma' },
        { orderId: 'ORD-103', status: OrderStatus.PROCESSING, customerName: 'Ananya Patel' },
      ]),
      getOrderByOrderId: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/orders', () => {
    it('should return all orders', async () => {
      const res = await request(app.getHttpServer()).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
    });
  });

  describe('GET /api/orders/sample', () => {
    it('should return sample orders', async () => {
      const res = await request(app.getHttpServer()).get('/api/orders/sample');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('should return ORD-101 when found', async () => {
      (ordersService.getOrderByOrderId as jest.Mock).mockResolvedValue({
        orderId: 'ORD-101',
        status: OrderStatus.OUT_FOR_DELIVERY,
        customerName: 'Priya Sharma',
        product: 'Vitamin C Serum (30ml)',
      });
      const res = await request(app.getHttpServer()).get('/api/orders/ORD-101');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBe('ORD-101');
    });

    it('should return null for ORD-999 (not found)', async () => {
      (ordersService.getOrderByOrderId as jest.Mock).mockResolvedValue(null);
      const res = await request(app.getHttpServer()).get('/api/orders/ORD-999');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });
});
