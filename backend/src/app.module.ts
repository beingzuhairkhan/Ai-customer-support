import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import { APP_GUARD } from "@nestjs/core";

import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./redis/redis.module";
import { OrdersModule } from "./orders/orders.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { ToolsModule } from "./tools/tools.module";
import { AiModule } from "./ai/ai.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { VoiceModule } from "./voice/voice.module";
import { CallsModule } from "./calls/calls.module";
import { JobsModule } from "./jobs/jobs.module";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { SeedModule } from "./seed/seed.module";
import { configuration } from "./config/configuration";
import { VoiceGateway } from "./voice/voice.gateway";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [configuration],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || "60", 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT || "60", 10),
      },
    ]),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
      },
    }),
    DatabaseModule,
    RedisModule,
    OrdersModule,
    KnowledgeModule,
    ToolsModule,
    AiModule,
    ConversationsModule,
    VoiceModule,
    CallsModule,
    JobsModule,
    HealthModule,
    MetricsModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
