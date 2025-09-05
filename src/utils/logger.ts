// 레거시 로거 - 새로운 구조로 마이그레이션됨
// 새로운 로거는 src/core/logging/Logger.ts에 있습니다.

import { Logger } from "../core/logging/Logger";

// 레거시 호환성을 위한 인스턴스 생성
const legacyLogger = new Logger();

// 기존 winston 인터페이스와 호환되는 래퍼
export const logger = {
  error: (message: string, meta?: any) => legacyLogger.error(message, meta),
  warn: (message: string, meta?: any) => legacyLogger.warn(message, meta),
  info: (message: string, meta?: any) => legacyLogger.info(message, meta),
  debug: (message: string, meta?: any) => legacyLogger.debug(message, meta),
  
  // 새로운 메서드들도 노출
  logRequest: legacyLogger.logRequest.bind(legacyLogger),
  logPerformance: legacyLogger.logPerformance.bind(legacyLogger),
  logSecurityEvent: legacyLogger.logSecurityEvent.bind(legacyLogger),
  logBusinessEvent: legacyLogger.logBusinessEvent.bind(legacyLogger)
};

// 새로운 Logger 클래스도 export (권장)
export { Logger } from "../core/logging/Logger";