import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from 'src/common/enums';

export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly requestId: string;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    requestId?: string,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          requestId: requestId || 'unknown',
        },
      },
      status,
    );
    this.code = code;
    this.requestId = requestId || 'unknown';
  }
}

export class OrderNotFoundException extends AppException {
  constructor(requestId?: string) {
    super(
      ErrorCode.ORDER_NOT_FOUND,
      'No order was found with this ID.',
      HttpStatus.NOT_FOUND,
      requestId,
    );
  }
}

export class InvalidOrderIdException extends AppException {
  constructor(requestId?: string) {
    super(
      ErrorCode.INVALID_ORDER_ID,
      'The order ID format is invalid. Please provide a valid order ID like ORD-101.',
      HttpStatus.BAD_REQUEST,
      requestId,
    );
  }
}

export class SessionNotFoundException extends AppException {
  constructor(requestId?: string) {
    super(
      ErrorCode.SESSION_NOT_FOUND,
      'Session not found.',
      HttpStatus.NOT_FOUND,
      requestId,
    );
  }
}

export class AiProviderException extends AppException {
  constructor(code: ErrorCode, message: string, requestId?: string) {
    super(code, message, HttpStatus.SERVICE_UNAVAILABLE, requestId);
  }
}

export class AudioInvalidException extends AppException {
  constructor(requestId?: string) {
    super(
      ErrorCode.AUDIO_INVALID,
      "I couldn't hear that clearly. Could you please repeat?",
      HttpStatus.BAD_REQUEST,
      requestId,
    );
  }
}

export class RateLimitException extends AppException {
  constructor(requestId?: string) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please slow down.',
      HttpStatus.TOO_MANY_REQUESTS,
      requestId,
    );
  }
}

export class PolicyDeniedException extends AppException {
  constructor(message: string, requestId?: string) {
    super(
      ErrorCode.POLICY_DENIED,
      message,
      HttpStatus.FORBIDDEN,
      requestId,
    );
  }
}

export class GuardrailException extends AppException {
  constructor(requestId?: string) {
    super(
      ErrorCode.GUARDRAIL_VIOLATION,
      'The response could not be validated.',
      HttpStatus.INTERNAL_SERVER_ERROR,
      requestId,
    );
  }
}
