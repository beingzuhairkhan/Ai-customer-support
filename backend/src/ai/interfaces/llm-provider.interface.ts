import { LLMResponse, LLMChunk, LLMMessage, ToolCall } from 'src/common/interfaces';

export interface LLMProvider {
  name: string;
  generateResponse(input: LLMInput): Promise<LLMResponse>;
  streamResponse(input: LLMInput): AsyncIterable<LLMChunk>;
}

export interface LLMInput {
  messages: LLMMessage[];
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}
