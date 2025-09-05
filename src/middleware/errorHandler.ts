// 레거시 에러 핸들러 - 새로운 구조로 마이그레이션됨
// 새로운 에러 핸들러는 src/core/errors/ErrorHandler.ts에 있습니다.

// import { Request, Response, NextFunction } from "express"; // 현재 사용되지 않음
import { ErrorHandler } from "../core/errors/ErrorHandler";
import { Logger } from "../core/logging/Logger";

// 레거시 호환성을 위한 래퍼
const logger = new Logger();
const errorHandler = new ErrorHandler(logger);

export const legacyErrorHandler = errorHandler.handleError;

// 레거시 에러 클래스들 - 새로운 타입으로 마이그레이션 권장
export { 
  ValidationError,
  FileProcessingError as FileUploadError,
  AuthorizationError as SecurityError,
  InternalServerError as NetworkError
} from "../types/errors";

// 비동기 핸들러는 새로운 유틸리티 사용 권장
export { asyncHandler } from "../core/utils/asyncHandler";

// 사용자 친화적인 에러 메시지 생성 함수
function _getUserFriendlyMessage(error: AppError): string {
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