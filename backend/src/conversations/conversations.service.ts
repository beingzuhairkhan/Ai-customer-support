import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, TranscriptMessage } from './schemas/conversation.schema';
import { ConversationState, CustomerIntent, MessageRole, Language } from 'src/common/enums';
import { LLMMessage } from 'src/common/interfaces';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(TranscriptMessage.name) private transcriptModel: Model<TranscriptMessage>,
  ) {}

  async createSession(sessionId: string): Promise<Conversation> {
    const conversation = await this.conversationModel.findOneAndUpdate(
      { sessionId },
      { $setOnInsert: { sessionId, state: ConversationState.IDLE, messages: [] } },
      { upsert: true, new: true },
    ).exec();
    return conversation;
  }

  async getConversation(sessionId: string): Promise<Conversation | null> {
    return this.conversationModel.findOne({ sessionId }).exec();
  }

  async addMessage(
    sessionId: string,
    role: MessageRole,
    text: string,
    options?: {
      confidence?: number;
      language?: string;
      toolCalls?: unknown[];
    },
  ): Promise<void> {
    // Save to transcript collection
    await this.transcriptModel.create({
      sessionId,
      role,
      text,
      timestamp: new Date(),
      confidence: options?.confidence ?? 1.0,
      language: options?.language ?? Language.UNKNOWN,
      toolCalls: options?.toolCalls ?? [],
    });

    // Also update conversation messages array (keep last 50)
    const llmRole = role === MessageRole.CUSTOMER ? 'user' : role === MessageRole.AGENT ? 'assistant' : role.toLowerCase();
    await this.conversationModel.updateOne(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [{ role: llmRole, content: text, timestamp: new Date() }],
            $slice: -50,
          },
        },
      },
    );
  }

  async getHistory(sessionId: string): Promise<LLMMessage[]> {
    const conversation = await this.getConversation(sessionId);
    if (!conversation || !conversation.messages) return [];
    return conversation.messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant' | 'tool',
      content: m.content,
    }));
  }

  async updateState(sessionId: string, state: ConversationState): Promise<void> {
    await this.conversationModel.updateOne({ sessionId }, { $set: { state } });
  }

  async updateIntent(sessionId: string, intent: CustomerIntent): Promise<void> {
    await this.conversationModel.updateOne({ sessionId }, { $set: { currentIntent: intent } });
  }

  async updateOrderId(sessionId: string, orderId: string): Promise<void> {
    await this.conversationModel.updateOne({ sessionId }, { $set: { currentOrderId: orderId } });
  }

  async updateLanguage(sessionId: string, language: string): Promise<void> {
    await this.conversationModel.updateOne({ sessionId }, { $set: { language } });
  }

  async getTranscript(sessionId: string): Promise<TranscriptMessage[]> {
    return this.transcriptModel
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .exec();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.conversationModel.deleteOne({ sessionId });
    await this.transcriptModel.deleteMany({ sessionId });
  }
}
