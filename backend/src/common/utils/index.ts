import { v4 as uuidv4 } from 'uuid';

export function generateRequestId(): string {
  return uuidv4();
}

export function generateSessionId(): string {
  return `sess_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

export function normalizeOrderId(orderId: string): string {
  return orderId.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidOrderIdFormat(orderId: string): boolean {
  if (!orderId || typeof orderId !== 'string') return false;
  const normalized = normalizeOrderId(orderId);
  return /^ORD-\d{3,}$/.test(normalized);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getDurationSeconds(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export function isHinglish(text: string): boolean {
  const hindiKeywords = [
    'mera', 'kab', 'kaha', 'hai', 'ho', 'aayega', 'aayi', 'kya', 'nahi',
    'kyu', 'kyun', 'chahta', 'chahti', 'order', 'wapas', 'cancel', 'paisa',
    'ruka', 'delivered', 'hoga', 'hogi', 'do', 'de', 'bhai', 'madad',
  ];
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  let hindiCount = 0;
  for (const word of words) {
    if (hindiKeywords.includes(word)) hindiCount++;
  }
  return hindiCount >= 1 && /\S/.test(lowerText);
}

export function sanitizeForLog(text: string): string {
  return text
    .replace(/Bearer [^\s]+/g, 'Bearer [REDACTED]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED]');
}
