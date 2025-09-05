// 비동기 함수 에러 처리 유틸리티

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/api';

/**
 * Express 라우트 핸들러의 비동기 에러를 자동으로 catch하는 래퍼
 */
export const asyncHandler = (
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
};

/**
 * 여러 비동기 작업을 병렬로 실행하고 결과를 반환
 */
export const asyncParallel = async <T>(
  tasks: (() => Promise<T>)[]
): Promise<T[]> => {
  return Promise.all(tasks.map(task => task()));
};

/**
 * 여러 비동기 작업을 순차적으로 실행하고 결과를 반환
 */
export const asyncSequential = async <T>(
  tasks: (() => Promise<T>)[]
): Promise<T[]> => {
  const results: T[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
};

/**
 * 비동기 작업에 타임아웃을 적용
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = '작업 시간이 초과되었습니다'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

/**
 * 재시도 로직이 포함된 비동기 함수 실행
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // 지수 백오프로 대기
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw lastError!;
};

/**
 * 지정된 시간만큼 대기
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 디바운스 함수 - 연속된 호출을 지연시킴
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
};

/**
 * 스로틀 함수 - 호출 빈도를 제한
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limitMs);
    }
  };
};

/**
 * 메모이제이션 - 함수 결과를 캐시
 */
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};