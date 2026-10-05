export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ToolResult {
  success: boolean;
  code?: string;
  message?: string;
  data?: unknown;
}

export interface PolicyDecision {
  allowed: boolean;
  policy: string;
  reason: string;
  suggestedResponse?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: unknown): Promise<ToolResult>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

export interface LLMChunk {
  content: string;
  done: boolean;
}

export interface STTResult {
  text: string;
  confidence: number;
  language: string;
}

export interface TTSResult {
  audio: Buffer;
  format: string;
}

export interface CallSummary {
  customer_intent: string;
  order_id: string;
  resolution_status: string;
  call_summary: string;
  actions_taken: string[];
  policies_referenced: string[];
  language: string;
  duration_seconds: number;
}

export interface ProviderHealth {
  name: string;
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

export interface RequestLogContext {
  requestId: string;
  sessionId?: string;
  module: string;
  operation: string;
  duration?: number;
  status?: string;
  errorCode?: string;
}

export interface AIRequestLogContext extends RequestLogContext {
  provider: string;
  model: string;
  latency?: number;
  success?: boolean;
  retryCount?: number;
  fallbackUsed?: boolean;
}
