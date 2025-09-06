// 개선된 성능 모니터링 미들웨어

import { Response, NextFunction } from "express";
import { performanceMonitoringService } from "../services/PerformanceMonitoringService";
import { Logger } from "../core/logging/Logger";
import { 
  generateRequestId, 
  getClientIp, 
  getUserAgent,
  calculateResponseTime
} from "../core/utils/httpUtils";
import { AuthenticatedRequest } from "../types/api";
import { RequestMetrics } from "../types/performance";

/**
 * 개선된 성능 모니터링 미들웨어
 * HTTP 요청에 대한 상세한 메트릭을 수집합니다
 */
export class PerformanceMonitoringMiddleware {
  private performanceService: typeof performanceMonitoringService;
  private logger: Logger;

  constructor() {
    this.performanceService = performanceMonitoringService;
    this.logger = new Logger();
  }

  /**
   * 미들웨어 함수
   */
  public middleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime();
    const requestId = generateRequestId();
    
    // 요청에 ID 추가
    req.requestId = requestId;

    // 요청 시작 로깅
    this.logger.info('HTTP 요청 시작', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      userId: req.user?.id
    });

    // 응답 완료 시 메트릭 기록
    const recordMetrics = () => {
      try {
        const duration = calculateResponseTime(startTime);
        const memoryUsage = process.memoryUsage();
        
        const metrics: RequestMetrics = {
          requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration,
          memoryUsage,
          timestamp: new Date(),
          userAgent: getUserAgent(req),
          userId: req.user?.id
        };

        // 성능 서비스에 메트릭 기록
        this.performanceService.recordHttpRequest(metrics);

        // 요청 완료 로깅
        this.logger.logRequest(
          req.method,
          req.originalUrl || req.url,
          res.statusCode,
          duration,
          requestId || 'unknown',
          req.user?.id
        );

        // 느린 요청 경고
        if (duration > 5000) { // 5초 이상
          this.logger.warn('느린 요청 감지', {
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            duration,
            statusCode: res.statusCode
          });
        }

        // 에러 응답 로깅
        if (res.statusCode >= 400) {
          this.logger.warn('에러 응답', {
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            duration
          });
        }

      } catch (error) {
        this.logger.error('성능 메트릭 기록 실패', {
          requestId,
          error: (error as Error).message
        });
      }
    };

    // 응답 완료 이벤트 리스너 등록
    res.on('finish', recordMetrics);
    res.on('close', recordMetrics);

    next();
  };
}

// 싱글톤 인스턴스 생성
const performanceMonitoringMiddleware = new PerformanceMonitoringMiddleware();

export default performanceMonitoringMiddleware.middleware;