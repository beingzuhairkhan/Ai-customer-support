import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import { CircuitBreakerState } from 'src/common/enums';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.threshold = this.configService.get<number>('circuitBreaker.threshold') || 5;
    this.cooldownMs = this.configService.get<number>('circuitBreaker.cooldownMs') || 30000;
  }

  async canExecute(provider: string): Promise<boolean> {
    const state = await this.redisService.getCircuitBreakerState(provider);
    if (state === CircuitBreakerState.OPEN) {
      this.logger.warn(`Circuit breaker OPEN for ${provider}. Blocking request.`);
      return false;
    }
    return true;
  }

  async recordSuccess(provider: string): Promise<void> {
    await this.redisService.resetCircuitBreakerFailures(provider);
    await this.redisService.setCircuitBreakerState(provider, CircuitBreakerState.CLOSED);
  }

  async recordFailure(provider: string): Promise<void> {
    const failures = await this.redisService.incrCircuitBreakerFailures(provider);
    this.logger.warn(`Circuit breaker: ${provider} failure count: ${failures}`);
    if (failures >= this.threshold) {
      await this.redisService.setCircuitBreakerState(
        provider,
        CircuitBreakerState.OPEN,
        Math.floor(this.cooldownMs / 1000),
      );
      this.logger.error(`Circuit breaker OPENED for ${provider} after ${failures} failures.`);
    }
  }

  async getState(provider: string): Promise<CircuitBreakerState> {
    return this.redisService.getCircuitBreakerState(provider);
  }

  async tryHalfOpen(provider: string): Promise<boolean> {
    const state = await this.redisService.getCircuitBreakerState(provider);
    if (state === CircuitBreakerState.OPEN) {
      await this.redisService.setCircuitBreakerState(provider, CircuitBreakerState.HALF_OPEN, 10);
      return true;
    }
    return false;
  }
}
