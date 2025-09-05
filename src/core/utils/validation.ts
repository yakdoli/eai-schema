// 검증 유틸리티 함수

import { z } from 'zod';
import { ValidationError } from '../../types/errors';

/**
 * Zod 스키마를 사용한 데이터 검증
 */
export const validateData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName?: string
): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const field = fieldName || firstError.path.join('.');
      throw new ValidationError(
        firstError.message,
        field,
        data
      );
    }
    throw error;
  }
};

/**
 * 이메일 주소 검증
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * URL 검증
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * UUID 검증
 */
export const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * 파일 확장자 검증
 */
export const isValidFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  const extension = filename.toLowerCase().split('.').pop();
  return extension ? allowedExtensions.includes(extension) : false;
};

/**
 * MIME 타입 검증
 */
export const isValidMimeType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return mimeType.startsWith(type.slice(0, -1));
    }
    return mimeType === type;
  });
};

/**
 * 파일 크기 검증
 */
export const isValidFileSize = (size: number, maxSize: number): boolean => {
  return size > 0 && size <= maxSize;
};

/**
 * 문자열 길이 검증
 */
export const isValidStringLength = (
  str: string, 
  minLength: number = 0, 
  maxLength: number = Infinity
): boolean => {
  return str.length >= minLength && str.length <= maxLength;
};

/**
 * 숫자 범위 검증
 */
export const isValidNumberRange = (
  num: number, 
  min: number = -Infinity, 
  max: number = Infinity
): boolean => {
  return num >= min && num <= max;
};

/**
 * 날짜 검증
 */
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * JSON 문자열 검증
 */
export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

/**
 * XML 문자열 기본 검증
 */
export const isValidXml = (str: string): boolean => {
  try {
    // 기본적인 XML 구조 검증
    const xmlRegex = /^<\?xml.*\?>.*<\/.*>$/s;
    return xmlRegex.test(str.trim()) || /<[^>]+>.*<\/[^>]+>/s.test(str.trim());
  } catch {
    return false;
  }
};

/**
 * 비밀번호 강도 검증
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  // 길이 검사
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('최소 8자 이상이어야 합니다');
  }

  // 대문자 포함
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('대문자를 포함해야 합니다');
  }

  // 소문자 포함
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('소문자를 포함해야 합니다');
  }

  // 숫자 포함
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('숫자를 포함해야 합니다');
  }

  // 특수문자 포함
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('특수문자를 포함해야 합니다');
  }

  return {
    isValid: score >= 4,
    score,
    feedback
  };
};

/**
 * 입력 새니타이제이션
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/['"]/g, '') // 따옴표 제거
    .replace(/[&]/g, '&amp;') // 앰퍼샌드 이스케이프
    .trim();
};

/**
 * SQL 인젝션 방지를 위한 문자열 이스케이프
 */
export const escapeSql = (input: string): string => {
  return input.replace(/'/g, "''");
};

/**
 * XSS 방지를 위한 HTML 이스케이프
 */
export const escapeHtml = (input: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return input.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};