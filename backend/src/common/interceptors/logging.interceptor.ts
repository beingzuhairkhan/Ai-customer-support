import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const method = request.method;
    const url = request.url;
    const requestId = request.headers['x-request-id'] || uuidv4();
    request.headers['x-request-id'] = requestId;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log({
            requestId,
            method,
            url,
            duration,
            status: 'success',
          });
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          this.logger.error({
            requestId,
            method,
            url,
            duration,
            status: 'error',
            errorCode: err.code || 'INTERNAL_ERROR',
            message: err.message,
          });
        },
      }),
    );
  }
}
