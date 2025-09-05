// 구조화된 로깅 시스템

import winston from 'winston';
import { LogLevel, LogEntry } from '../../types/common';

export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(this.formatLogEntry)
      ),
      defaultMeta: {
        service: 'eai-schema-toolkit',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: [
        // 콘솔 출력
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // 파일 출력 - 모든 로그
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // 파일 출력 - 에러만
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ],
      
      // 처리되지 않은 예외 처리
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      
      // 처리되지 않은 Promise rejection 처리
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 로그 엔트리 포맷팅
   */
  private formatLogEntry = (info: any): string => {
    const { timestamp, level, message, ...meta } = info;
    
    const logEntry: LogEntry = {
      level: level as LogLevel,
      message,
      timestamp,
      ...meta
    };

    return JSON.stringify(logEntry);
  };

  /**
   * 에러 로그
   */
  public error(message: string, metadata?: Record<string, any>): void {
    this.winston.error(message, { ...metadata, context: this.context });
  }

  /**
   * 경고 로그
   */
  public warn(message: string, metadata?: Record<string, any>): void {
    this.winston.warn(message, { ...metadata, context: this.context });
  }

  /**
   * 정보 로그
   */
  public info(message: string, metadata?: Record<string, any>): void {
    this.winston.info(message, { ...metadata, context: this.context });
  }

  /**
   * 디버그 로그
   */
  public debug(message: string, metadata?: Record<string, any>): void {
    this.winston.debug(message, { ...metadata, context: this.context });
  }

  /**
   * HTTP 요청 로그
   */
  public logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId: string,
    userId?: string
  ): void {
    this.info('HTTP 요청', {
      method,
      url,
      statusCode,
      duration,
      requestId,
      userId,
      type: 'http_request'
    });
  }

  /**
   * 성능 메트릭 로그
   */
  public logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.info('성능 메트릭', {
      operation,
      duration,
      ...metadata,
      type: 'performance'
    });
  }

  /**
   * 보안 이벤트 로그
   */
  public logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): void {
    this.warn('보안 이벤트', {
      event,
      severity,
      ...metadata,
      type: 'security'
    });
  }

  /**
   * 비즈니스 로직 로그
   */
  public logBusinessEvent(
    event: string,
    metadata?: Record<string, any>
  ): void {
    this.info('비즈니스 이벤트', {
      event,
      ...metadata,
      type: 'business'
    });
  }

  /**
   * 로그 레벨 동적 변경
   */
  public setLogLevel(level: LogLevel): void {
    this.winston.level = level;
  }

  /**
   * 로거 인스턴스 반환 (고급 사용)
   */
  public getWinstonInstance(): winston.Logger {
    return this.winston;
  }
}