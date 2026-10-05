import { GuardrailService } from 'src/ai/services/guardrail.service';
import { KnowledgeService } from 'src/knowledge/knowledge.service';

describe('GuardrailService', () => {
  let service: GuardrailService;
  let knowledgeService: KnowledgeService;

  beforeEach(() => {
    knowledgeService = new KnowledgeService();
    service = new GuardrailService(knowledgeService);
  });

  it('should pass valid response', () => {
    const result = service.validate('Your order ORD-101 is out for delivery and expected by 6 PM today.');
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should block unauthorized refund promise', () => {
    const result = service.validate("Sure, I'll refund you right away.");
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should block unauthorized replacement promise', () => {
    const result = service.validate("I'll send a new replacement immediately.");
    expect(result.valid).toBe(false);
  });

  it('should block sensitive info leakage (api key)', () => {
    const result = service.validate('My api-key is abc123.');
    expect(result.valid).toBe(false);
  });

  it('should block response to out-of-scope request', () => {
    const result = service.validate(
      'I booked your flight to Goa for tomorrow.',
      'Book me a flight to Goa.',
    );
    expect(result.valid).toBe(false);
  });

  it('should provide safe fallback for out-of-scope', () => {
    const result = service.validate('Sure, I will help you book that flight.', 'Book me a flight to Goa.');
    expect(result.safeResponse).toContain('Aura Skincare');
  });

  it('should pass policy-compliant return rejection', () => {
    const response = 'The return policy applies only within 7 days of delivery and for unopened, unused products in original packaging. Since this request falls outside those conditions, I can\'t confirm a return or refund.';
    const result = service.validate(response);
    expect(result.valid).toBe(true);
  });
});
