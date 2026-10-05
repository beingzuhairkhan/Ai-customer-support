import { Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { CallsModule } from 'src/calls/calls.module';
import { VoiceGateway } from './voice.gateway';
import { VoiceService } from './voice.service';
import { SessionService } from './session.service';
import { AudioService } from './audio.service';

@Module({
  imports: [AiModule, ConversationsModule, CallsModule],
  providers: [VoiceService, SessionService, AudioService, VoiceGateway],
  exports: [VoiceService, SessionService, AudioService],
})
export class VoiceModule {}
