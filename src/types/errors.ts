// 에러 관련 타입 정의

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  abstract readonly errorCode: string;
  
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    
    // V8 엔진에서 스택 트레이스 캡처
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;
  readonly errorCode = 'VALIDATION_ERROR';
  
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class SchemaConversionError extends AppError {
  readonly statusCode = 422;
  readonly isOperational = true;
  readonly errorCode = 'SCHEMA_CONVERSION_ERROR';
  
  constructor(
    message: string,
    public readonly sourceFormat: string,
    public readonly targetFormat: string,
    public readonly line?: number,
    public readonly column?: number,
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class CollaborationError extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;
  readonly errorCode = 'COLLABORATION_ERROR';
  
  constructor(
    message: string,
    public readonly sessionId: string,
    public readonly conflictType: 'concurrent_edit' | 'session_expired' | 'permission_denied',
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;
  readonly errorCode = 'AUTHENTICATION_ERROR';
  
  constructor(message = '인증이 필요합니다', requestId?: string) {
    super(message, requestId);
  }
}

export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;
  readonly errorCode = 'AUTHORIZATION_ERROR';
  
  constructor(
    message = '권한이 없습니다',
    public readonly requiredPermission?: string,
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;
  readonly errorCode = 'NOT_FOUND_ERROR';
  
  constructor(
    message = '리소스를 찾을 수 없습니다',
    public readonly resourceType?: string,
    public readonly resourceId?: string,
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;
  readonly errorCode = 'CONFLICT_ERROR';
  
  constructor(
    message: string,
    public readonly conflictType?: string,
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';
  
  constructor(
    message = '내부 서버 오류가 발생했습니다',
    public readonly originalError?: Error,
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class FileProcessingError extends AppError {
  readonly statusCode = 422;
  readonly isOperational = true;
  readonly errorCode = 'FILE_PROCESSING_ERROR';
  
  constructor(
    message: string,
    public readonly filename?: string,
    public readonly fileType?: string,
    requestId?: string
  ) {
    super(message, requestId);
  }
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;
  readonly errorCode = 'RATE_LIMIT_ERROR';
  
  constructor(
    message = '요청 한도를 초과했습니다',
    public readonly retryAfter?: number,
    requestId?: string
  ) {
    super(message, requestId);
  }
}