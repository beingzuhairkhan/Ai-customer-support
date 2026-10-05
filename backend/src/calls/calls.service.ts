import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Call } from 'src/conversations/schemas/conversation.schema';
import { CallStatus, ResolutionStatus, CustomerIntent } from 'src/common/enums';
import { CallSummary } from 'src/common/interfaces';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    @InjectModel(Call.name) private callModel: Model<Call>,
    private redisService: RedisService,
  ) {}

  async createCallRecord(sessionId: string): Promise<Call> {
    return this.callModel.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: {
          sessionId,
          status: CallStatus.ACTIVE,
          startedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    ).exec();
  }

  async getCall(sessionId: string): Promise<Call | null> {
    return this.callModel.findOne({ sessionId }).exec();
  }

 async endCall(
  sessionId: string,
  durationSeconds: number,
  intent?: string,
  orderId?: string,
  language?: string,
  generatedSummary?: Partial<CallSummary>,
): Promise<any> {
  
  const idempotencyKey = `endcall:${sessionId}`;
  const existing = await this.redisService.get(idempotencyKey);

  if (existing) {
    this.logger.log(
      `Call ${sessionId} already ended (idempotency). Returning cached result.`,
    );

    return JSON.parse(existing);
  }

  const lockKey = `lock:endcall:${sessionId}`;
  const acquired = await this.redisService.acquireLock(lockKey, 30);

  if (!acquired) {
    this.logger.warn(
      `Could not acquire lock for ending call ${sessionId}. Another process may be handling it.`,
    );

    const existingCall = await this.getCall(sessionId);

    if (existingCall?.status === CallStatus.COMPLETED) {
      return existingCall;
    }

    throw new Error(`Could not acquire lock for ending call ${sessionId}`);
  }

  try {
    const summary: CallSummary = {
      customer_intent:
        generatedSummary?.customer_intent ||
        intent ||
        CustomerIntent.UNKNOWN,

      order_id:
        generatedSummary?.order_id ||
        orderId ||
        '',

      resolution_status:
        generatedSummary?.resolution_status ||
        ResolutionStatus.RESOLVED,

      call_summary:
        generatedSummary?.call_summary ||
        `Call lasted ${durationSeconds} seconds. Intent: ${
          intent || 'unknown'
        }.`,

      actions_taken: generatedSummary?.actions_taken || [],

      policies_referenced:
        generatedSummary?.policies_referenced || [],

      language:
        generatedSummary?.language ||
        language ||
        'en',

      duration_seconds: durationSeconds,
    };

    const updated = await this.callModel
      .findOneAndUpdate(
        { sessionId },
        {
          $set: {
            status: CallStatus.COMPLETED,
            endedAt: new Date(),

            intent:
              summary.customer_intent ||
              CustomerIntent.UNKNOWN,

            orderId:
              summary.order_id ||
              null,

            resolutionStatus:
              summary.resolution_status ||
              ResolutionStatus.RESOLVED,

            summary,

            language:
              summary.language || 'en',
          },
        },
        {
          new: true,
        },
      )
      .lean();

    if (!updated) {
      throw new Error(`Call ${sessionId} not found`);
    }

    // Cache result for idempotency
    await this.redisService.set(
      idempotencyKey,
      JSON.stringify(updated),
      3600,
    );

    this.logger.log(
      `Call ${sessionId} ended successfully.`,
    );

    return updated;
  } finally {
    await this.redisService.releaseLock(lockKey);
  }
}


  async updateCallSummary(sessionId: string, summary: CallSummary): Promise<void> {
    await this.callModel.updateOne(
      { sessionId },
      {
        $set: {
          summary,
          intent: summary.customer_intent,
          orderId: summary.order_id,
          resolutionStatus: summary.resolution_status,
        },
      },
    );
  }

  async getSummary(sessionId: string): Promise<CallSummary | null> {
    const call = await this.getCall(sessionId);
    if (!call) return null;
    return call.summary as CallSummary;
  }
}
