import { Injectable, Logger } from '@nestjs/common';
import { BRAND_KNOWLEDGE } from './knowledge.constants';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  getBrandInfo() {
    return BRAND_KNOWLEDGE;
  }

  getBrandDescription(): string {
    return `${BRAND_KNOWLEDGE.name} is a ${BRAND_KNOWLEDGE.description}`;
  }

  isAuraRelated(text: string): boolean {
    const auraKeywords = [
      'aura', 'skincare', 'order', 'product', 'serum', 'sunscreen',
      'face wash', 'toner', 'delivery', 'return', 'cancel', 'refund',
      'replace', 'damaged', 'defective', 'shipping', 'cod', 'tracking',
      'cream', 'lotion', 'gel', 'mask', 'cleanser', 'moisturizer',
    ];
    const lowerText = text.toLowerCase();
    return auraKeywords.some((kw) => lowerText.includes(kw));
  }

  isOutOfScope(text: string): boolean {
    const outOfScopeKeywords = [
      'book a flight', 'book flight', 'hotel', 'goa', 'travel',
      'weather', 'news', 'politics', 'sports', 'movie', 'song',
      'restaurant', 'recipe', 'cook', 'bank', 'invest', 'stock',
      'medical', 'doctor', 'legal', 'lawyer', 'tax', 'insurance',
    ];
    const lowerText = text.toLowerCase();
    return outOfScopeKeywords.some((kw) => lowerText.includes(kw)) && !this.isAuraRelated(text);
  }
}
