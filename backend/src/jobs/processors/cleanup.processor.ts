import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Call } from 'src/conversations/schemas/conversation.schema';
import { CallStatus } from 'src/common/enums';

@Processor('cleanup-queue', { concurrency: 1 })
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(
    @InjectModel(Call.name) private callModel: Model<Call>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Running cleanup job...');
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    try {
      // Mark stale ACTIVE calls as FAILED
      const result = await this.callModel.updateMany(
        {
          status: CallStatus.ACTIVE,
          startedAt: { $lt: cutoff },
        },
        {
          $set: {
            status: CallStatus.FAILED,
            endedAt: new Date(),
          },
        },
      );
      this.logger.log(`Cleanup: marked ${result.modifiedCount} stale calls as FAILED.`);
    } catch (err) {
      this.logger.error(`Cleanup job failed: ${err.message}`);
      throw err;
    }
  }
}
