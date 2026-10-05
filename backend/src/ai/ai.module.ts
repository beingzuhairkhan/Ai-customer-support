import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from 'src/orders/orders.module';
import { KnowledgeModule } from 'src/knowledge/knowledge.module';
import { ToolsModule } from 'src/tools/tools.module';
import { RedisModule } from 'src/redis/redis.module';
import { MetricsModule } from 'src/metrics/metrics.module';
import { SarvamSpeechProvider } from './providers/sarvam/sarvam-speech.provider';
import { PrimaryLLMProvider } from './providers/llm/primary-llm.provider';
import { FallbackLLMProvider } from './providers/llm/fallback-llm.provider';
import { AiOrchestratorService } from './services/ai-orchestrator.service';
import { ProviderFallbackService } from './services/provider-fallback.service';
import { AiRetryService } from './services/ai-retry.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { GuardrailService } from './services/guardrail.service';
import { PromptService } from './services/prompt.service';

@Module({
  imports: [ConfigModule, OrdersModule, KnowledgeModule, ToolsModule, RedisModule, MetricsModule],
  providers: [
    SarvamSpeechProvider,
    PrimaryLLMProvider,
    FallbackLLMProvider,
    AiOrchestratorService,
    ProviderFallbackService,
    AiRetryService,
    CircuitBreakerService,
    GuardrailService,
    PromptService,
  ],
  exports: [
    AiOrchestratorService,
    SarvamSpeechProvider,
    PrimaryLLMProvider,
    FallbackLLMProvider,
    ProviderFallbackService,
    AiRetryService,
    CircuitBreakerService,
    GuardrailService,
    PromptService,
  ],
})
export class AiModule {}
