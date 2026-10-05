import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SummaryService } from 'src/calls/summary.service';
import { CallsService } from 'src/calls/calls.service';
import { ConversationsService } from 'src/conversations/conversations.service';
import { RedisService } from 'src/redis/redis.service';

@Processor('summary-queue', { concurrency: 2 })
export class SummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(SummaryProcessor.name);

  constructor(
    private summaryService: SummaryService,
    private callsService: CallsService,
    private conversationsService: ConversationsService,
    private redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { sessionId, durationSeconds, intent, orderId, language } = job.data;
    this.logger.log(`Processing summary job for session ${sessionId}`);

    // Distributed lock to prevent duplicate summary generation
    const lockKey = `lock:summary:${sessionId}`;
    const acquired = await this.redisService.acquireLock(lockKey, 60);
    if (!acquired) {
      this.logger.log(`Summary for ${sessionId} already being generated. Skipping.`);
      return;
    }

    try {
      const summary = await this.summaryService.generateSummary(
        sessionId,
        durationSeconds,
        intent,
        orderId,
        language,
      );
      await this.callsService.updateCallSummary(sessionId, summary);
      this.logger.log(`Summary generated and saved for session ${sessionId}`);
    } catch (err) {
      this.logger.error(`Summary job failed for ${sessionId}: ${err.message}`);
      throw err;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }
}
