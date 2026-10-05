import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CircuitBreakerState, ErrorCode } from 'src/common/enums';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('redis.url');
    try {
      this.client = new Redis(url, {
        retryStrategy: (times) => Math.min(times * 500, 2000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      this.client.on('connect', () => {
        this.available = true;
        this.logger.log('Redis connected');
      });

      this.client.on('error', (err) => {
        this.available = false;
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.available = false;
      });

      await this.client.ping();
      this.available = true;
    } catch (err) {
      this.available = false;
      this.logger.warn(`Redis not available on startup: ${err.message}. Degrading gracefully.`);
    }
  }

  isAvailable(): boolean {
    return this.available && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(`Redis GET failed: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.warn(`Redis SET failed: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis DEL failed: ${err.message}`);
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isAvailable()) return 0;
    try {
      return await this.client.incr(key);
    } catch (err) {
      this.logger.warn(`Redis INCR failed: ${err.message}`);
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis EXPIRE failed: ${err.message}`);
    }
  }

  async setIfNotExists(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) return true;
    try {
      const result = await (this.client as any).set(key, value, 'EX', ttlSeconds || 30, 'NX');
      return result === 'OK';
    } catch (err) {
      this.logger.warn(`Redis SETNX failed: ${err.message}`);
      return true;
    }
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    return this.setIfNotExists(key, 'locked', ttlSeconds);
  }

  async releaseLock(key: string): Promise<void> {
    await this.del(key);
  }

  async getObject<T>(key: string): Promise<T | null> {
    const val = await this.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }

  async setObject(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getCircuitBreakerState(provider: string): Promise<CircuitBreakerState> {
    const state = await this.get(`circuit:${provider}:state`);
    if (state === CircuitBreakerState.OPEN) return CircuitBreakerState.OPEN;
    if (state === CircuitBreakerState.HALF_OPEN) return CircuitBreakerState.HALF_OPEN;
    return CircuitBreakerState.CLOSED;
  }

  async setCircuitBreakerState(provider: string, state: CircuitBreakerState, ttlSeconds?: number): Promise<void> {
    await this.set(`circuit:${provider}:state`, state, ttlSeconds);
  }

  async incrCircuitBreakerFailures(provider: string): Promise<number> {
    return await this.incr(`circuit:${provider}:failures`);
  }

  async resetCircuitBreakerFailures(provider: string): Promise<void> {
    await this.del(`circuit:${provider}:failures`);
  }

  async getCircuitBreakerFailures(provider: string): Promise<number> {
    const val = await this.get(`circuit:${provider}:failures`);
    return val ? parseInt(val, 10) : 0;
  }
}
