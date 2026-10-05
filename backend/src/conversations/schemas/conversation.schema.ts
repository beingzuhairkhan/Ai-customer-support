import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ConversationState, CustomerIntent, Language, MessageRole } from 'src/common/enums';

@Schema({ collection: 'transcript_messages', timestamps: true })
export class TranscriptMessage extends Document {
  @Prop({ type: String, required: true, index: true })
  sessionId: string;

  @Prop({ type: String, required: true, enum: MessageRole })
  role: MessageRole;

  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: Number, default: 1.0 })
  confidence: number;

  @Prop({ type: String, default: Language.UNKNOWN })
  language: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  toolCalls: unknown[];
}

export const TranscriptMessageSchema = SchemaFactory.createForClass(TranscriptMessage);

@Schema({ collection: 'conversations', timestamps: true })
export class Conversation extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  messages: Array<{
    role: string;
    content: string;
    timestamp: Date;
    toolCalls?: unknown[];
  }>;

  @Prop({ type: String, enum: CustomerIntent, default: CustomerIntent.UNKNOWN })
  currentIntent: string;

  @Prop({ type: String, default: null })
  currentOrderId: string;

  @Prop({ type: String, default: Language.UNKNOWN })
  language: string;

  @Prop({ type: String, enum: ConversationState, default: ConversationState.IDLE })
  state: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

@Schema({ collection: 'calls', timestamps: true })
export class Call extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ type: String, default: null, index: true })
  customerId: string;

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  endedAt: Date;

  @Prop({ type: String, required: true, index: true })
  status: string;

  @Prop({ type: String, default: Language.UNKNOWN })
  language: string;

  @Prop({ type: String, default: null })
  intent: string;

  @Prop({ type: String, default: null })
  orderId: string;

  @Prop({ type: String, default: null })
  resolutionStatus: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  summary: unknown;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, unknown>;
}

export const CallSchema = SchemaFactory.createForClass(Call);
