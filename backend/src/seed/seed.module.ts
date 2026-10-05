import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../database/database.module";
import { OrdersModule } from "../orders/orders.module";
import { configuration } from "../config/configuration";
import { SeedService } from "./seed.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
      load: [configuration],
    }),
    DatabaseModule,
    OrdersModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
