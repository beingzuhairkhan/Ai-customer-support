import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { SeedModule } from "./seed/seed.module";
import { SeedService } from "./seed/seed.service";

async function bootstrap() {
  const logger = new Logger("SeedCLI");

  const app = await NestFactory.createApplicationContext(SeedModule);

  const seedService = app.get(SeedService);

  try {
    const result = await seedService.seed();
    logger.log(`Seed complete: ${JSON.stringify(result)}`);
  } catch (err) {
    logger.error(
      `Seed failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
