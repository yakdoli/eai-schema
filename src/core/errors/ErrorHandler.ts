// 전역 에러 핸들러

import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  ValidationError, 
  SchemaConversionError, 
  CollaborationError,
  AuthorizationError,
  NotFoundError,
  InternalServerError,
  FileProcessingError,
  RateLimitError
} from '../../types/errors';
import { ApiResponse } from '../../types/common';
import { Logger } from '../logging/Logger';

// AppError 재export
export { AppError } from '../../types/errors';

export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Express 에러 핸들링 미들웨어
   */
  public handleError = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    const requestId = (req as any).requestId || 'unknown';
    
    // 운영 에러인지 확인
    if (error instanceof AppError) {
      this.handleOperationalError(error, req, res);
    } else {
      this.handleProgrammingError(error, req, res, requestId);
    }
  };

  /**
   * 운영 에러 처리 (예상 가능한 에러)
   */
  private handleOperationalError(error: AppError, req: Request, res: Response): void {
    const requestId = (req as any).requestId || 'unknown';
    
    // 에러 로깅
    this.logger.warn('운영 에러 발생', {
      error: error.message,
      errorCode: error.errorCode,
      statusCode: error.statusCode,
      requestId,
      url: req.url,
      method: req.method,
      stack: error.stack
    });

    // 클라이언트에 응답
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        details: this.getErrorDetails(error)
      },
      timestamp: new Date().toISOString(),
      requestId
    };

    res.status(error.statusCode).json(response);
  }

  /**
   * 프로그래밍 에러 처리 (예상하지 못한 에러)
   */
  private handleProgrammingError(
    error: Error, 
    req: Request, 
    res: Response, 
    requestId: string
  ): void {
    // 심각한 에러 로깅
    this.logger.error('프로그래밍 에러 발생', {
      error: error.message,
      requestId,
      url: req.url,
      method: req.method,
      stack: error.stack
    });

    // 내부 서버 에러로 변환
    const internalError = new InternalServerError(
      '내부 서버 오류가 발생했습니다',
      error,
      requestId
    );

    const response: ApiResponse = {
      success: false,
      error: {
        code: internalError.errorCode,
        message: internalError.message,
        // 프로덕션에서는 스택 트레이스 숨김
        ...(process.env.NODE_ENV !== 'production' && { 
          details: { stack: error.stack } 
        })
      },
      timestamp: new Date().toISOString(),
      requestId
    };

    res.status(500).json(response);
  }

  /**
   * 에러 타입별 상세 정보 추출
   */
  private getErrorDetails(error: AppError): any {
    if (error instanceof ValidationError) {
      return {
        field: error.field,
        value: error.value
      };
    }

    if (error instanceof SchemaConversionError) {
      return {
        sourceFormat: error.sourceFormat,
        targetFormat: error.targetFormat,
        line: error.line,
        column: error.column
      };
    }

    if (error instanceof CollaborationError) {
      return {
        sessionId: error.sessionId,
        conflictType: error.conflictType
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        requiredPermission: error.requiredPermission
      };
    }

    if (error instanceof NotFoundError) {
      return {
        resourceType: error.resourceType,
        resourceId: error.resourceId
      };
    }

    if (error instanceof FileProcessingError) {
      return {
        filename: error.filename,
        fileType: error.fileType
      };
    }

    if (error instanceof RateLimitError) {
      return {
        retryAfter: error.retryAfter
      };
    }

    return undefined;
  }

  /**
   * 처리되지 않은 Promise rejection 핸들러
   */
  public handleUnhandledRejection = (reason: any, _promise: Promise<any>): void => {
    this.logger.error('처리되지 않은 Promise rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack
    });

    // 애플리케이션 종료 (선택적)
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  };

  /**
   * 처리되지 않은 예외 핸들러
   */
  public handleUncaughtException = (error: Error): void => {
    this.logger.error('처리되지 않은 예외', {
      error: error.message,
      stack: error.stack
    });

    // 애플리케이션 종료
    process.exit(1);
  };
}