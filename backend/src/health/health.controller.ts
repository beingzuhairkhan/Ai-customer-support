import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Full health check' })
  async getHealth() {
    return this.healthService.getFullHealth();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  async getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — checks MongoDB, Redis, AI providers' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
