import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './schemas/order.schema';
import { normalizeOrderId, isValidOrderIdFormat } from 'src/common/utils';
import { InvalidOrderIdException } from 'src/common/exceptions';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async findByOrderId(rawOrderId: string): Promise<Order | null> {
    if (!isValidOrderIdFormat(rawOrderId)) {
      throw new InvalidOrderIdException();
    }
    const orderId = normalizeOrderId(rawOrderId);
    return this.orderModel.findOne({ orderId }).exec() as Promise<Order | null>;
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().lean().exec() as unknown as Promise<Order[]>;
  }

  async upsertByOrderId(data: Partial<Order>): Promise<Order> {
    const orderId = normalizeOrderId(data.orderId);
    return this.orderModel
      .findOneAndUpdate(
        { orderId },
        { $set: { ...data, orderId } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec() as unknown as Promise<Order>;
  }

  async countDocuments(): Promise<number> {
    return this.orderModel.countDocuments().exec();
  }
}
