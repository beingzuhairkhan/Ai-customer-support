import { Injectable, Logger } from '@nestjs/common';
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: Registry;

  // Counters
  readonly callsStarted: Counter;
  readonly callsCompleted: Counter;
  readonly callsFailed: Counter;
  readonly sttRequests: Counter;
  readonly sttFailures: Counter;
  readonly llmRequests: Counter;
  readonly llmFailures: Counter;
  readonly ttsRequests: Counter;
  readonly ttsFailures: Counter;
  readonly toolCalls: Counter;
  readonly toolFailures: Counter;
  readonly orderLookups: Counter;
  readonly orderNotFound: Counter;
  readonly fallbacks: Counter;
  readonly retries: Counter;
  readonly circuitBreakerOpens: Counter;

  // Histograms
  readonly aiRequestDuration: Histogram;
  readonly callDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.callsStarted = new Counter({
      name: 'calls_started_total',
      help: 'Total calls started',
      registers: [this.registry],
    });
    this.callsCompleted = new Counter({
      name: 'calls_completed_total',
      help: 'Total calls completed',
      registers: [this.registry],
    });
    this.callsFailed = new Counter({
      name: 'calls_failed_total',
      help: 'Total calls failed',
      registers: [this.registry],
    });
    this.sttRequests = new Counter({
      name: 'stt_requests_total',
      help: 'Total STT requests',
      registers: [this.registry],
    });
    this.sttFailures = new Counter({
      name: 'stt_failures_total',
      help: 'Total STT failures',
      registers: [this.registry],
    });
    this.llmRequests = new Counter({
      name: 'llm_requests_total',
      help: 'Total LLM requests',
      registers: [this.registry],
    });
    this.llmFailures = new Counter({
      name: 'llm_failures_total',
      help: 'Total LLM failures',
      registers: [this.registry],
    });
    this.ttsRequests = new Counter({
      name: 'tts_requests_total',
      help: 'Total TTS requests',
      registers: [this.registry],
    });
    this.ttsFailures = new Counter({
      name: 'tts_failures_total',
      help: 'Total TTS failures',
      registers: [this.registry],
    });
    this.toolCalls = new Counter({
      name: 'tool_calls_total',
      help: 'Total tool calls',
      registers: [this.registry],
    });
    this.toolFailures = new Counter({
      name: 'tool_failures_total',
      help: 'Total tool failures',
      registers: [this.registry],
    });
    this.orderLookups = new Counter({
      name: 'order_lookup_total',
      help: 'Total order lookups',
      registers: [this.registry],
    });
    this.orderNotFound = new Counter({
      name: 'order_not_found_total',
      help: 'Total orders not found',
      registers: [this.registry],
    });
    this.fallbacks = new Counter({
      name: 'fallback_total',
      help: 'Total fallbacks used',
      registers: [this.registry],
    });
    this.retries = new Counter({
      name: 'retry_total',
      help: 'Total retries',
      registers: [this.registry],
    });
    this.circuitBreakerOpens = new Counter({
      name: 'circuit_breaker_open_total',
      help: 'Total circuit breaker opens',
      registers: [this.registry],
    });

    this.aiRequestDuration = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'AI request duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 15, 30],
      registers: [this.registry],
    });
    this.callDuration = new Histogram({
      name: 'call_duration_seconds',
      help: 'Call duration in seconds',
      buckets: [10, 30, 60, 120, 300, 600, 1800],
      registers: [this.registry],
    });
  }

  recordCallStarted() { this.callsStarted.inc(); }
  recordCallCompleted() { this.callsCompleted.inc(); }
  recordCallFailed() { this.callsFailed.inc(); }
  recordSttRequest() { this.sttRequests.inc(); }
  recordSttFailure() { this.sttFailures.inc(); }
  recordLlmRequest() { this.llmRequests.inc(); }
  recordLlmFailure() { this.llmFailures.inc(); }
  recordTtsRequest() { this.ttsRequests.inc(); }
  recordTtsFailure() { this.ttsFailures.inc(); }
  recordToolCall() { this.toolCalls.inc(); }
  recordToolFailure() { this.toolFailures.inc(); }
  recordOrderLookup() { this.orderLookups.inc(); }
  recordOrderNotFound() { this.orderNotFound.inc(); }
  recordFallback() { this.fallbacks.inc(); }
  recordRetry() { this.retries.inc(); }
  recordCircuitBreakerOpen() { this.circuitBreakerOpens.inc(); }

  observeAiRequestDuration(seconds: number) { this.aiRequestDuration.observe(seconds); }
  observeCallDuration(seconds: number) { this.callDuration.observe(seconds); }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
