import { Injectable, Logger } from '@nestjs/common';
import { AiRetryService } from './ai-retry.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { MetricsService } from 'src/metrics/metrics.service';
import { SAFE_FALLBACK_RESPONSE } from 'src/common/constants';

interface ProviderConfig {
  name: string;
  execute: () => Promise<any>;
}

interface FallbackResult<T> {
  result: T | null;
  providerUsed: string;
  fallbackUsed: boolean;
  retries: number;
  error?: string;
}

@Injectable()
export class ProviderFallbackService {
  private readonly logger = new Logger(ProviderFallbackService.name);

  constructor(
    private retryService: AiRetryService,
    private circuitBreaker: CircuitBreakerService,
    private metricsService: MetricsService,
  ) {}

  async executeWithFallback<T>(
    providers: ProviderConfig[],
    operationName: string,
    fallbackValue: T,
  ): Promise<FallbackResult<T>> {
    let lastError: string;

    for (const provider of providers) {
      const canExecute = await this.circuitBreaker.canExecute(provider.name);
      if (!canExecute) {
        await this.circuitBreaker.tryHalfOpen(provider.name);
        const canRetry = await this.circuitBreaker.canExecute(provider.name);
        if (!canRetry) {
          this.logger.warn(`Skipping ${provider.name} — circuit breaker open`);
          continue;
        }
      }

      try {
        const { result, retries } = await this.retryService.withRetry(
          provider.execute,
          `${operationName}:${provider.name}`,
        );
        await this.circuitBreaker.recordSuccess(provider.name);
        return {
          result,
          providerUsed: provider.name,
          fallbackUsed: provider.name !== providers[0].name,
          retries,
        };
      } catch (err) {
        lastError = err.message;
        this.logger.error(`${operationName}: ${provider.name} failed: ${err.message}`);
        await this.circuitBreaker.recordFailure(provider.name);
        this.metricsService.recordFallback();
      }
    }

    this.logger.error(`${operationName}: All providers failed. Using fallback value.`);
    return {
      result: fallbackValue,
      providerUsed: 'fallback',
      fallbackUsed: true,
      retries: 0,
      error: lastError,
    };
  }
}
