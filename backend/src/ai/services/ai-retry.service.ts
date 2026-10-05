import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  retryableStatusCodes?: number[];
}

export const DEFAULT_RETRYABLE_STATUS_CODES = [429, 408, 500, 502, 503, 504];

function isRetryableError(err: any, retryableStatusCodes: number[]): boolean {
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    return true;
  }
  const status = err.status || err.statusCode || err.response?.status;
  if (status && retryableStatusCodes.includes(status)) {
    return true;
  }
  if (err.message && err.message.includes('timeout')) {
    return true;
  }
  return false;
}

function calculateBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  const jitter = Math.random() * 0.3 * exponential;
  return Math.floor(exponential + jitter);
}

@Injectable()
export class AiRetryService {
  private readonly logger = new Logger(AiRetryService.name);
  private readonly defaultMaxRetries: number;
  private readonly defaultTimeoutMs: number;

  constructor(private configService: ConfigService) {
    this.defaultMaxRetries = this.configService.get<number>('ai.maxRetries') || 2;
    this.defaultTimeoutMs = this.configService.get<number>('ai.timeoutMs') || 15000;
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: RetryOptions = {},
  ): Promise<{ result: T; retries: number }> {
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;
    const baseDelayMs = options.baseDelayMs ?? 500;
    const maxDelayMs = options.maxDelayMs ?? 10000;
    const retryableStatusCodes = options.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES;

    let lastError: Error;
    let retries = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(
          operation(),
          options.timeoutMs ?? this.defaultTimeoutMs,
          operationName,
        );
        if (attempt > 0) {
          this.logger.log(`${operationName} succeeded after ${attempt} retries`);
        }
        return { result, retries: attempt };
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries && isRetryableError(err, retryableStatusCodes)) {
          const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
          this.logger.warn(
            `${operationName} attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retries = attempt + 1;
        } else {
          this.logger.error(
            `${operationName} failed permanently after ${attempt} attempts: ${err.message}`,
          );
          throw err;
        }
      }
    }
    throw lastError;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, operationName: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${ms}ms`));
      }, ms);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
