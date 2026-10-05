export const ERROR_MESSAGES = {
  ORDER_NOT_FOUND: 'No order was found with this ID.',
  INVALID_ORDER_ID: 'The order ID format is invalid. Please provide a valid order ID like ORD-101.',
  STT_FAILURE: 'Speech recognition failed. Please try again.',
  TTS_FAILURE: 'Speech synthesis failed.',
  LLM_FAILURE: 'The AI service is temporarily unavailable.',
  AI_ALL_PROVIDERS_FAILED: "I'm sorry, I'm having trouble processing that right now. Please try again in a moment.",
  AUDIO_INVALID: "I couldn't hear that clearly. Could you please repeat?",
  SESSION_NOT_FOUND: 'Session not found.',
  SESSION_EXPIRED: 'Your session has expired. Please start a new call.',
  POLICY_DENIED: 'This request does not meet our policy requirements.',
  GUARDRAIL_VIOLATION: 'The response could not be validated.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down.',
  DATABASE_ERROR: 'The database is temporarily unavailable.',
  REDIS_ERROR: 'A temporary service error occurred.',
  TIMEOUT: 'The request timed out. Please try again.',
  INTERNAL_ERROR: 'An internal error occurred.',
  OUT_OF_SCOPE: 'I can only help with Aura Skincare-related customer support questions.',
  VALIDATION_ERROR: 'Invalid request data.',
  CIRCUIT_BREAKER_OPEN: 'The service is temporarily unavailable. Please try again later.',
  IDEMPOTENCY_CONFLICT: 'A conflicting request with the same idempotency key was already processed.',
} as const;

export const AURA_KNOWLEDGE = {
  brand: {
    name: 'Aura Skincare',
    description: 'Premium organic Indian skincare brand offering simple and effective skincare products with thoughtfully selected ingredients.',
  },
} as const;

export const AGENT_PERSONA = {
  name: 'Aria',
  brand: 'Aura Skincare',
  role: 'Customer Support Specialist',
  personality: ['Friendly', 'Professional', 'Concise', 'Helpful', 'Indian conversational style'],
} as const;

export const SAFE_FALLBACK_RESPONSE =
  "I'm sorry, I'm having trouble processing that right now. Please try again in a moment.";

export const SAFE_OUT_OF_SCOPE_RESPONSE =
  "I'm Aria from Aura Skincare. I can only help with Aura Skincare-related customer support questions, such as order tracking, returns, cancellations, and our policies. Is there something related to your Aura order I can help with?";

export const SAFE_UNKNOWN_RESPONSE =
  "I don't have enough information to confirm that. Let me help with what I can verify.";

export const SAFE_MISSING_ORDER_ID =
  "Sure! Could you please provide your order ID, such as ORD-101?";

export const SAFE_INVALID_ORDER =
  "I couldn't find an order with that ID. Could you please verify the order number?";

export const SAFE_DB_UNAVAILABLE =
  "I'm sorry, order information is temporarily unavailable. Please try again in a moment.";
