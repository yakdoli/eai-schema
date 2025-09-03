import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 에러 로깅
  logger.error('에러 발생:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 기본 에러 상태 코드 설정
  const statusCode = error.statusCode || 500;
  
  // 개발 환경에서는 스택 트레이스 포함
  const errorResponse = {
    error: {
      message: error.message || '내부 서버 오류가 발생했습니다.',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  };

  res.status(statusCode).json(errorResponse);
};

// 비동기 함수 에러 처리를 위한 래퍼
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 커스텀 에러 클래스들
export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FileUploadError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class SecurityError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class NetworkError extends Error {
  statusCode = 502;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}