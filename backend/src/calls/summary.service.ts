import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationsService } from 'src/conversations/conversations.service';
import { CallSummary } from 'src/common/interfaces';
import { CustomerIntent, ResolutionStatus } from 'src/common/enums';
import { isHinglish } from 'src/common/utils';
import { SummaryPromptData } from './dto/summary-data.dto';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    private conversationsService: ConversationsService,
    private configService: ConfigService,
  ) {}

  async generateSummary(
    sessionId: string,
    durationSeconds: number,
    intent?: string,
    orderId?: string,
    language?: string,
  ): Promise<CallSummary> {
    this.logger.log(`Generating summary for session ${sessionId}`);

    try {
      const messages = await this.conversationsService.getTranscript(sessionId);

      // Build a deterministic summary from transcript
      const customerMessages = messages.filter((m) => m.role === 'CUSTOMER');
      const agentMessages = messages.filter((m) => m.role === 'AGENT');
      const toolMessages = messages.filter((m) => m.role === 'TOOL');

      const detectedIntent = intent || this.inferIntent(customerMessages.map((m) => m.text));
      const detectedLanguage = language || this.detectLanguage(customerMessages.map((m) => m.text));
      const detectedOrderId = orderId || this.extractOrderId(messages.map((m) => m.text).join(' '));

      const actionsTaken: string[] = [];
      const policiesReferenced: string[] = [];

      for (const msg of messages) {
        if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
          for (const tc of msg.toolCalls) {
            if (typeof tc === 'string') actionsTaken.push(`Called tool: ${tc}`);
          }
        }
        const text = msg.text.toLowerCase();
        if (text.includes('return') || text.includes('refund')) policiesReferenced.push('RETURN');
        if (text.includes('cancel')) policiesReferenced.push('CANCELLATION');
        if (text.includes('shipping') || text.includes('delivery')) policiesReferenced.push('SHIPPING');
        if (text.includes('cod') || text.includes('cash on delivery')) policiesReferenced.push('COD');
      }

      const summaryText = this.buildSummaryText(detectedIntent, detectedOrderId, customerMessages, agentMessages);

      const resolutionStatus = this.determineResolution(agentMessages, customerMessages, detectedIntent);

      const summary: CallSummary = {
        customer_intent: detectedIntent,
        order_id: detectedOrderId,
        resolution_status: resolutionStatus,
        call_summary: summaryText,
        actions_taken: [...new Set(actionsTaken)],
        policies_referenced: [...new Set(policiesReferenced)],
        language: detectedLanguage,
        duration_seconds: durationSeconds,
      };

      return summary;
    } catch (err) {
      this.logger.error(`Summary generation failed: ${err.message}`);
      return {
        customer_intent: CustomerIntent.UNKNOWN,
        order_id: orderId || '',
        resolution_status: ResolutionStatus.UNRESOLVED,
        call_summary: 'Summary generation failed.',
        actions_taken: [],
        policies_referenced: [],
        language: language || 'en',
        duration_seconds: durationSeconds,
      };
    }
  }

  private inferIntent(customerTexts: string[]): string {
    const combined = customerTexts.join(' ').toLowerCase();
    if (/cancel/.test(combined)) return CustomerIntent.ORDER_CANCELLATION;
    if (/return|refund|replace/.test(combined)) return CustomerIntent.RETURN_REQUEST;
    if (/where.*order|track|delivery|deliver|status|kab.*aay/.test(combined)) return CustomerIntent.ORDER_TRACKING;
    if (/shipping|cod|payment/.test(combined)) return CustomerIntent.POLICY_INQUIRY;
    if (/product|ingredient|serum|sunscreen/.test(combined)) return CustomerIntent.PRODUCT_INQUIRY;
    return CustomerIntent.GENERAL_INQUIRY;
  }

  private detectLanguage(customerTexts: string[]): string {
    const combined = customerTexts.join(' ');
    if (isHinglish(combined)) return 'hinglish';
    const hindiRegex = /[\u0900-\u097F]/;
    if (hindiRegex.test(combined)) return 'hi';
    return 'en';
  }

  private extractOrderId(text: string): string {
    const match = text.match(/ORD[-\s]?\d{3,}/i);
    if (match) return match[0].toUpperCase().replace(/\s/g, '');
    return '';
  }

  private buildSummaryText(
    intent: string,
    orderId: string,
    customerMessages: any[],
    agentMessages: any[],
  ): string {
    const firstCustomerMsg = customerMessages[0]?.text || '';
    const lastAgentMsg = agentMessages[agentMessages.length - 1]?.text || '';

    let summary = `Customer asked: "${firstCustomerMsg}". `;
    if (orderId) summary += `Order ID: ${orderId}. `;
    summary += `Agent responded: "${lastAgentMsg}". `;
    summary += `Intent: ${intent}.`;
    return summary;
  }

  private determineResolution(
    agentMessages: any[],
    customerMessages: any[],
    intent: string,
  ): string {
    const lastAgentText = agentMessages[agentMessages.length - 1]?.text?.toLowerCase() || '';
    if (lastAgentText.includes("couldn't") || lastAgentText.includes('sorry') || lastAgentText.includes('unable')) {
      return ResolutionStatus.UNRESOLVED;
    }
    if (lastAgentText.includes("don't have enough information") || lastAgentText.includes('out of scope')) {
      return ResolutionStatus.UNRESOLVED;
    }
    if (intent === CustomerIntent.OUT_OF_SCOPE) {
      return ResolutionStatus.UNRESOLVED;
    }
    return ResolutionStatus.RESOLVED;
  }
}
