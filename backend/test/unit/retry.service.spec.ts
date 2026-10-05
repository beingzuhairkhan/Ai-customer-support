import { AiRetryService } from 'src/ai/services/ai-retry.service';
import { ConfigService } from '@nestjs/config';

describe('AiRetryService', () => {
  let service: AiRetryService;
  let configService: Partial<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ai.maxRetries') return 2;
        if (key === 'ai.timeoutMs') return 5000;
        return undefined;
      }),
    };
    service = new AiRetryService(configService as ConfigService);
  });

  it('should return result on first success', async () => {
    const op = jest.fn().mockResolvedValue('success');
    const { result, retries } = await service.withRetry(op, 'test-op');
    expect(result).toBe('success');
    expect(retries).toBe(0);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should retry on 500 error and succeed', async () => {
    const op = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Server error'), { status: 500 }))
      .mockResolvedValueOnce('success');
    const { result, retries } = await service.withRetry(op, 'test-op', { baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(retries).toBe(1);
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('should retry on 429 error', async () => {
    const op = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Rate limited'), { status: 429 }))
      .mockResolvedValueOnce('ok');
    const { result, retries } = await service.withRetry(op, 'test-op', { baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(retries).toBe(1);
  });

  it('should NOT retry on 400 error', async () => {
    const op = jest.fn().mockRejectedValue(Object.assign(new Error('Bad request'), { status: 400 }));
    await expect(service.withRetry(op, 'test-op')).rejects.toThrow('Bad request');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on 401 error', async () => {
    const op = jest.fn().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    await expect(service.withRetry(op, 'test-op')).rejects.toThrow('Unauthorized');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on 403 error', async () => {
    const op = jest.fn().mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    await expect(service.withRetry(op, 'test-op')).rejects.toThrow('Forbidden');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should retry on connection reset', async () => {
    const op = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('reset'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce('ok');
    const { result } = await service.withRetry(op, 'test-op', { baseDelayMs: 10 });
    expect(result).toBe('ok');
  });

  it('should retry on timeout message', async () => {
    const op = jest.fn()
      .mockRejectedValueOnce(new Error('request timeout'))
      .mockResolvedValueOnce('ok');
    const { result } = await service.withRetry(op, 'test-op', { baseDelayMs: 10 });
    expect(result).toBe('ok');
  });

  it('should exhaust retries and throw', async () => {
    const op = jest.fn().mockRejectedValue(Object.assign(new Error('Server error'), { status: 500 }));
    await expect(service.withRetry(op, 'test-op', { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('Server error');
    expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
