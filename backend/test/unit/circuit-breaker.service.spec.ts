import { CircuitBreakerService } from 'src/ai/services/circuit-breaker.service';
import { RedisService } from 'src/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerState } from 'src/common/enums';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let redisService: Partial<RedisService>;

  beforeEach(() => {
    redisService = {
      getCircuitBreakerState: jest.fn(),
      setCircuitBreakerState: jest.fn(),
      incrCircuitBreakerFailures: jest.fn(),
      resetCircuitBreakerFailures: jest.fn(),
      getCircuitBreakerFailures: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'circuitBreaker.threshold') return 3;
        if (key === 'circuitBreaker.cooldownMs') return 5000;
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new CircuitBreakerService(redisService as RedisService, configService);
  });

  it('should allow execution when CLOSED', async () => {
    (redisService.getCircuitBreakerState as jest.Mock).mockResolvedValue(CircuitBreakerState.CLOSED);
    const canExec = await service.canExecute('sarvam');
    expect(canExec).toBe(true);
  });

  it('should block execution when OPEN', async () => {
    (redisService.getCircuitBreakerState as jest.Mock).mockResolvedValue(CircuitBreakerState.OPEN);
    const canExec = await service.canExecute('sarvam');
    expect(canExec).toBe(false);
  });

  it('should open circuit after threshold failures', async () => {
    (redisService.incrCircuitBreakerFailures as jest.Mock).mockResolvedValue(3);
    await service.recordFailure('sarvam');
    expect(redisService.setCircuitBreakerState).toHaveBeenCalledWith('sarvam', CircuitBreakerState.OPEN, expect.any(Number));
  });

  it('should not open circuit below threshold', async () => {
    (redisService.incrCircuitBreakerFailures as jest.Mock).mockResolvedValue(1);
    await service.recordFailure('sarvam');
    expect(redisService.setCircuitBreakerState).not.toHaveBeenCalled();
  });

  it('should reset on success', async () => {
    await service.recordSuccess('sarvam');
    expect(redisService.resetCircuitBreakerFailures).toHaveBeenCalledWith('sarvam');
    expect(redisService.setCircuitBreakerState).toHaveBeenCalledWith('sarvam', CircuitBreakerState.CLOSED);
  });
});
