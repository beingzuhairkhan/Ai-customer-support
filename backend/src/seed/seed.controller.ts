import { Controller, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { SuccessResponse } from 'src/common/interfaces';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  private readonly logger = new Logger(SeedController.name);

  constructor(private seedService: SeedService) {}

  @Post()
  @ApiOperation({ summary: 'Seed sample orders (ORD-101, ORD-102, ORD-103)' })
  async seed(): Promise<SuccessResponse<any>> {
    const result = await this.seedService.seed();
    return { success: true, data: result };
  }
}
