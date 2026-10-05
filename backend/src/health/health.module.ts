import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from 'src/ai/ai.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [MongooseModule, AiModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
