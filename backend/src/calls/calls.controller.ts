import { Controller, Post, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { TranscriptService } from './transcript.service';
import { VoiceService } from 'src/voice/voice.service';
import { SuccessResponse } from 'src/common/interfaces';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Calls')
@Controller('calls')
export class CallsController {
  private readonly logger = new Logger(CallsController.name);

  constructor(
    private callsService: CallsService,
    private transcriptService: TranscriptService,
    private voiceService: VoiceService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new voice call session' })
  @ApiResponse({ status: 200, description: 'Session created' })
  async startCall(): Promise<SuccessResponse<any>> {
    const result = await this.voiceService.startSession();
    return { success: true, data: result };
  }

  @Post(':sessionId/end')
  @ApiOperation({ summary: 'End a call and generate summary' })
  @ApiResponse({ status: 200, description: 'Call ended with summary' })
  async endCall(@Param('sessionId') sessionId: string): Promise<SuccessResponse<any>> {
    const summary = await this.voiceService.endSession(sessionId);
    return { success: true, data: summary };
  }

  @Get(':sessionId/transcript')
  @ApiOperation({ summary: 'Get call transcript' })
  async getTranscript(@Param('sessionId') sessionId: string): Promise<SuccessResponse<any>> {
    const transcript = await this.transcriptService.getTranscript(sessionId);
    return { success: true, data: transcript };
  }

  @Get(':sessionId/summary')
  @ApiOperation({ summary: 'Get call summary' })
  async getSummary(@Param('sessionId') sessionId: string): Promise<SuccessResponse<any>> {
    const summary = await this.callsService.getSummary(sessionId);
    return { success: true, data: summary };
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get call details' })
  async getCall(@Param('sessionId') sessionId: string): Promise<SuccessResponse<any>> {
    const call = await this.callsService.getCall(sessionId);
    return { success: true, data: call };
  }
}
