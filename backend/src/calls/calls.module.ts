import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Call, CallSchema } from 'src/conversations/schemas/conversation.schema';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { AiModule } from 'src/ai/ai.module';
import { CallsService } from './calls.service';
import { TranscriptService } from './transcript.service';
import { SummaryService } from './summary.service';
import { CallsController } from './calls.controller';
import { VoiceModule } from 'src/voice/voice.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Call.name, schema: CallSchema },
    ]),
    ConversationsModule,
    AiModule,
    forwardRef(() => VoiceModule),
  ],
  controllers: [CallsController],
  providers: [
    CallsService,
    TranscriptService,
    SummaryService,
  ],
  exports: [
    CallsService,
    TranscriptService,
    SummaryService,
  ],
})
export class CallsModule {}
