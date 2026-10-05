import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'customers' })
export class Customer extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, index: true })
  email: string;

  @Prop({ type: String, default: null, index: true })
  phone: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
