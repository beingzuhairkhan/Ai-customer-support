import { Injectable, Logger } from '@nestjs/common';
import {
  SAFE_FALLBACK_RESPONSE,
  SAFE_OUT_OF_SCOPE_RESPONSE,
  SAFE_UNKNOWN_RESPONSE,
} from 'src/common/constants';
import { KnowledgeService } from 'src/knowledge/knowledge.service';

export interface GuardrailResult {
  valid: boolean;
  violations: string[];
  safeResponse: string;
}

const VIOLATION_PATTERNS = [
  { pattern: /i'?ll\s+refund/i, violation: 'Unauthorized refund promise' },
  { pattern: /i\s+will\s+refund/i, violation: 'Unauthorized refund promise' },
  { pattern: /i'?ll\s+give\s+you\s+a\s+refund/i, violation: 'Unauthorized refund promise' },
  { pattern: /i\s+promise\s+(?:a\s+)?(?:refund|replacement)/i, violation: 'Unauthorized promise' },
  { pattern: /free\s+(?:replacement|refund)/i, violation: 'Unauthorized free promise' },
  { pattern: /i'?ll\s+send\s+a\s+(?:new\s+)?replacement/i, violation: 'Unauthorized replacement promise' },
  { pattern: /i\s+will\s+(?:waive|reduce)\s+(?:the\s+)?(?:shipping|fee)/i, violation: 'Unauthorized discount' },
  { pattern: /discount\s+(?:of|code)/i, violation: 'Unauthorized discount' },
  { pattern: /api[-_]?key/i, violation: 'Sensitive information leakage' },
  { pattern: /password/i, violation: 'Sensitive information leakage' },
  { pattern: /secret/i, violation: 'Sensitive information leakage' },
  { pattern: /database\s+(?:credentials|password)/i, violation: 'Sensitive information leakage' },
];

@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);

  constructor(private knowledgeService: KnowledgeService) {}

  validate(response: string, userMessage?: string): GuardrailResult {
    const violations: string[] = [];

    for (const { pattern, violation } of VIOLATION_PATTERNS) {
      if (pattern.test(response)) {
        violations.push(violation);
      }
    }

    if (userMessage && this.knowledgeService.isOutOfScope(userMessage)) {
      if (!this.knowledgeService.isAuraRelated(response)) {
        violations.push('Response to out-of-scope request');
      }
    }

    if (violations.length > 0) {
      this.logger.warn(`Guardrail violations detected: ${violations.join(', ')}`);
      return {
        valid: false,
        violations,
        safeResponse: this.getSafeResponse(userMessage),
      };
    }

    return {
      valid: true,
      violations: [],
      safeResponse: response,
    };
  }

  private getSafeResponse(userMessage?: string): string {
    if (userMessage && this.knowledgeService.isOutOfScope(userMessage)) {
      return SAFE_OUT_OF_SCOPE_RESPONSE;
    }
    return SAFE_UNKNOWN_RESPONSE;
  }

  getSafeFallback(): string {
    return SAFE_FALLBACK_RESPONSE;
  }
}
