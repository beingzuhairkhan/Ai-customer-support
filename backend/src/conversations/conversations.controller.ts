import { Controller, Get, Param, Delete, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { SuccessResponse } from 'src/common/interfaces';

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(private conversationsService: ConversationsService) {}

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get conversation by session ID' })
  async getConversation(@Param('sessionId') sessionId: string): Promise<SuccessResponse<any>> {
    const conversation = await this.conversationsService.getConversation(sessionId);
    return { success: true, data: conversation };
  }

  @Get(':sessionId/transcript')
  @ApiOperation({ summary: 'Get transcript for a session' })
  async getTranscript(@Param('sessionId') sessionId: string): Promise<SuccessResponse<any>> {
    const messages = await this.conversationsService.getTranscript(sessionId);
    return { success: true, data: { sessionId, messages } };
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Delete a conversation' })
  async deleteConversation(@Param('sessionId') sessionId: string): Promise<SuccessResponse<any>> {
    await this.conversationsService.deleteSession(sessionId);
    return { success: true, data: { deleted: true } };
  }
}
