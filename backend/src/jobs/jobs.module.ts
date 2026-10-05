import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { Call, CallSchema } from 'src/conversations/schemas/conversation.schema';
import { CallsModule } from 'src/calls/calls.module';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { SummaryProcessor } from './processors/summary.processor';
import { CleanupProcessor } from './processors/cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'summary-queue' },
      { name: 'cleanup-queue' },
    ),
    MongooseModule.forFeature([{ name: Call.name, schema: CallSchema }]),
    CallsModule,
    ConversationsModule,
  ],
  providers: [SummaryProcessor, CleanupProcessor],
  exports: [BullModule],
})
export class JobsModule {}
