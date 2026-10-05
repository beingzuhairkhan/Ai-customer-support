import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OrderStatus } from 'src/common/enums';

@Schema({ timestamps: true, collection: 'orders' })
export class Order extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  orderId: string;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String, required: true })
  product: string;

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({ type: String, required: true, enum: OrderStatus })
  status: OrderStatus;

  @Prop({ type: String, default: null })
  carrier: string;

  @Prop({ type: String, default: null })
  trackingNumber: string;

  @Prop({ type: String, default: null })
  expectedDelivery: string;

  @Prop({ type: String, default: null })
  deliveredAt: string;

  @Prop({ type: String, default: null })
  notes: string;

  @Prop({ type: Boolean, default: false })
  cancellationEligible: boolean;

  @Prop({ type: Boolean, default: false })
  returnEligible: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
