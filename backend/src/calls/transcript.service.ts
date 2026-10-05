import { Injectable, Logger } from '@nestjs/common';
import { ConversationsService } from 'src/conversations/conversations.service';
import { MessageRole } from 'src/common/enums';

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(private conversationsService: ConversationsService) {}

  async getTranscript(sessionId: string) {
    const messages = await this.conversationsService.getTranscript(sessionId);
    return {
      sessionId,
      messages: messages.map((m) => ({
        role: m.role,
        text: m.text,
        timestamp: m.timestamp,
        confidence: m.confidence,
        language: m.language,
        toolCalls: m.toolCalls,
      })),
    };
  }

  async getTranscriptText(sessionId: string): Promise<string> {
    const { messages } = await this.getTranscript(sessionId);
    return messages
      .map((m) => {
        const role = m.role === MessageRole.CUSTOMER ? 'Customer' : m.role === MessageRole.AGENT ? 'Aria' : m.role;
        return `${role}: ${m.text}`;
      })
      .join('\n');
  }
}
