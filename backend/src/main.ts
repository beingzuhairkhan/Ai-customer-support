import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { IoAdapter } from "@nestjs/platform-socket.io";

import { AppModule } from "./app.module";

import helmet from "helmet";
import compression from "compression";

import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger("Bootstrap");

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
  );

  app.use(compression());

  app.useWebSocketAdapter(new IoAdapter(app));

  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle("Aura Skincare AI Voice Agent")
    .setDescription("AI Voice Customer Support Agent for Aura Skincare")
    .setVersion("1.0.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT) || 5000;

  await app.listen(port);

  logger.log(`Application running on port ${port}`);

  logger.log(
    `Socket.IO:
http://localhost:${port}/ws/voice`,
  );
}

bootstrap();
