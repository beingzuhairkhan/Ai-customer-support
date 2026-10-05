import { SummaryService } from 'src/calls/summary.service';
import { ConversationsService } from 'src/conversations/conversations.service';
import { ConfigService } from '@nestjs/config';
import { CustomerIntent, ResolutionStatus, MessageRole } from 'src/common/enums';

describe('SummaryService', () => {
  let service: SummaryService;
  let conversationsService: Partial<ConversationsService>;

  beforeEach(() => {
    conversationsService = {
      getTranscript: jest.fn(),
    };
    const configService = {} as ConfigService;
    service = new SummaryService(conversationsService as ConversationsService, configService);
  });

  it('should generate summary with correct intent for order tracking', async () => {
    (conversationsService.getTranscript as jest.Mock).mockResolvedValue([
      { role: MessageRole.CUSTOMER, text: 'Where is ORD-101?', timestamp: new Date(), toolCalls: [] },
      { role: MessageRole.AGENT, text: 'Your order is out for delivery, expected by 6 PM today.', timestamp: new Date(), toolCalls: ['get_order_details'] },
    ]);

    const summary = await service.generateSummary('sess-123', 120);
    expect(summary.customer_intent).toBe(CustomerIntent.ORDER_TRACKING);
    expect(summary.order_id).toBe('ORD-101');
    expect(summary.resolution_status).toBe(ResolutionStatus.RESOLVED);
    expect(summary.duration_seconds).toBe(120);
    expect(summary.actions_taken).toContain('Called tool: get_order_details');
  });

  it('should detect Hinglish language', async () => {
    (conversationsService.getTranscript as jest.Mock).mockResolvedValue([
      { role: MessageRole.CUSTOMER, text: 'Mera ORD-101 kab deliver hoga?', timestamp: new Date(), toolCalls: [] },
      { role: MessageRole.AGENT, text: 'Aapka order out for delivery hai.', timestamp: new Date(), toolCalls: [] },
    ]);

    const summary = await service.generateSummary('sess-456', 60);
    expect(summary.language).toBe('hinglish');
  });

  it('should mark unresolved when agent could not help', async () => {
    (conversationsService.getTranscript as jest.Mock).mockResolvedValue([
      { role: MessageRole.CUSTOMER, text: 'Do you have a store in Antarctica?', timestamp: new Date(), toolCalls: [] },
      { role: MessageRole.AGENT, text: "I'm sorry, I can only help with Aura Skincare questions.", timestamp: new Date(), toolCalls: [] },
    ]);

    const summary = await service.generateSummary('sess-789', 30);
    expect(summary.customer_intent).toBe(CustomerIntent.GENERAL_INQUIRY);
  });

  it('should handle empty transcript gracefully', async () => {
    (conversationsService.getTranscript as jest.Mock).mockResolvedValue([]);
    const summary = await service.generateSummary('sess-empty', 0);
    expect(summary.call_summary).toBeDefined();
    expect(summary.duration_seconds).toBe(0);
  });
});
