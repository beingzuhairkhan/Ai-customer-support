import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from 'src/redis/redis.service';
import { SarvamSpeechProvider } from 'src/ai/providers/sarvam/sarvam-speech.provider';
import { PrimaryLLMProvider } from 'src/ai/providers/llm/primary-llm.provider';
import { FallbackLLMProvider } from 'src/ai/providers/llm/fallback-llm.provider';
import { ProviderHealth } from 'src/common/interfaces';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectConnection() private mongooseConnection: Connection,
    private redisService: RedisService,
    private sarvamProvider: SarvamSpeechProvider,
    private primaryLLM: PrimaryLLMProvider,
    private fallbackLLM: FallbackLLMProvider,
  ) {}

  async getFullHealth() {
    const mongo = this.checkMongo();
    const redis = this.checkRedis();
    const providers = this.checkProviders();
    return {
      status: mongo.healthy && redis.healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { mongo, redis },
      providers,
    };
  }

  async getReadiness() {
    const mongo = this.checkMongo();
    const redis = this.checkRedis();
    const providers = this.checkProviders();
    const ready = mongo.healthy;
    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: mongo,
        redis,
        providers,
      },
    };
  }

  private checkMongo(): { healthy: boolean; latencyMs?: number } {
    const start = Date.now();
    const ready = this.mongooseConnection?.readyState === 1;
    return { healthy: ready, latencyMs: Date.now() - start };
  }

  private checkRedis(): { healthy: boolean } {
    return { healthy: this.redisService.isAvailable() };
  }

  private checkProviders(): ProviderHealth[] {
    const providers: ProviderHealth[] = [];
    providers.push({
      name: 'sarvam',
      healthy: this.sarvamProvider.isConfigured(),
    });
    providers.push({
      name: 'primary-llm',
      healthy: this.primaryLLM.isConfigured(),
    });
    providers.push({
      name: 'fallback-llm',
      healthy: this.fallbackLLM.isConfigured(),
    });
    return providers;
  }
}
