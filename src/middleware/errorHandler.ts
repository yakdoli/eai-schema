import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

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
  // 에러 ID 생성 (추적용)
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 상세한 에러 로깅
  logger.error("에러 발생:", {
    errorId,
    message: error.message,
    stack: error.stack,
    name: error.name,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.method !== 'GET' ? JSON.stringify(req.body).substring(0, 500) : undefined,
    query: req.query,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // 기본 에러 상태 코드 설정
  const statusCode = error.statusCode || 500;

  // 사용자 친화적인 에러 메시지 생성
  const userMessage = getUserFriendlyMessage(error);

  // 에러 응답 구성
  const errorResponse: {
    success: false;
    error: {
      message: string;
      errorId: string;
      timestamp: string;
      type?: string;
      stack?: string;
      originalMessage?: string;
    };
  } = {
    success: false,
    error: {
      message: userMessage,
      errorId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
        originalMessage: error.message
      })
    }
  };

  // 특정 에러 타입에 대한 추가 처리
  if (error.name === 'ValidationError') {
    errorResponse.error.type = 'VALIDATION_ERROR';
  } else if (error.name === 'FileUploadError') {
    errorResponse.error.type = 'FILE_UPLOAD_ERROR';
  } else if (error.name === 'SecurityError') {
    errorResponse.error.type = 'SECURITY_ERROR';
  } else if (error.name === 'NetworkError') {
    errorResponse.error.type = 'NETWORK_ERROR';
  }

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
    this.name = "ValidationError";
  }
}

export class FileUploadError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "FileUploadError";
  }
}

export class SecurityError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

export class NetworkError extends Error {
  statusCode = 502;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

// 사용자 친화적인 에러 메시지 생성 함수
function getUserFriendlyMessage(error: AppError): string {
  const errorMessages: { [key: string]: string } = {
    'ValidationError': '입력 데이터가 올바르지 않습니다. 다시 확인해주세요.',
    'FileUploadError': '파일 업로드 중 문제가 발생했습니다. 파일 형식과 크기를 확인해주세요.',
    'SecurityError': '보안 정책 위반이 감지되었습니다. 다른 파일을 시도해주세요.',
    'NetworkError': '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
    'SyntaxError': '데이터 형식이 올바르지 않습니다. JSON/XML 형식을 확인해주세요.',
    'TypeError': '데이터 타입이 올바르지 않습니다.',
    'ReferenceError': '필요한 데이터가 누락되었습니다.',
    'RangeError': '데이터 값이 허용 범위를 벗어났습니다.',
  };

  // 특정 에러 타입에 대한 사용자 친화적인 메시지 반환
  if (error.name && errorMessages[error.name]) {
    return errorMessages[error.name]!;
  }

  // 기본 메시지
  if (error.message) {
    // 너무 긴 메시지는 축약
    const message = error.message.length > 100
      ? error.message.substring(0, 100) + '...'
      : error.message;

    // 민감한 정보 제거
    return message
      .replace(/password[^&]*/gi, '***')
      .replace(/token[^&]*/gi, '***')
      .replace(/key[^&]*/gi, '***');
  }

  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}