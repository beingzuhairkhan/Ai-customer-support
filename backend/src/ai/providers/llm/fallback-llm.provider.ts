import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMInput } from '../../interfaces/index'
import { LLMResponse, LLMChunk } from 'src/common/interfaces';

@Injectable()
export class FallbackLLMProvider implements LLMProvider {
  private readonly logger = new Logger(FallbackLLMProvider.name);
  readonly name = 'fallback-llm';
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private configured: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('llm.fallbackApiKey') || '';
    this.baseUrl = this.configService.get<string>('llm.fallbackBaseUrl') || '';
    this.model = this.configService.get<string>('llm.fallbackModel') || '';
    this.configured = !!this.apiKey && !!this.baseUrl && !!this.model;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async generateResponse(input: LLMInput): Promise<LLMResponse> {
    if (!this.configured) {
      throw new Error('Fallback LLM not configured');
    }

    const body = {
      model: input.model || this.model,
      messages: input.messages,
      tools: input.tools,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens ?? 500,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fallback LLM failed: ${response.status} ${errText}`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];
    if (!choice) throw new Error('Fallback LLM returned no choices');

    const message = choice.message;
    return {
      content: message.content || '',
      toolCalls: message.tool_calls,
      finishReason: choice.finish_reason,
    };
  }

  async *streamResponse(input: LLMInput): AsyncIterable<LLMChunk> {
    if (!this.configured) {
      throw new Error('Fallback LLM not configured');
    }

    const body = {
      model: input.model || this.model,
      messages: input.messages,
      tools: input.tools,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens ?? 500,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text();
      throw new Error(`Fallback LLM stream failed: ${response.status} ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') {
          yield { content: '', done: true };
          return;
        }
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            yield { content: delta.content, done: false };
          }
        } catch {
          // skip
        }
      }
    }
    yield { content: '', done: true };
  }
}
