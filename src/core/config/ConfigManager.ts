// 환경 설정 관리 시스템

import dotenv from 'dotenv';
import { z } from 'zod';

// 환경 변수 스키마 정의
const envSchema = z.object({
  // 서버 설정
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),

  // 로깅 설정
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // 보안 설정
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  
  // CORS 설정
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.string().transform(Boolean).default('true'),
  
  // 파일 업로드 설정
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  UPLOAD_DIR: z.string().default('./temp'),
  
  // 성능 설정
  REQUEST_TIMEOUT: z.string().transform(Number).default('30000'), // 30초
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('900000'), // 15분
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  
  // WebSocket 설정
  WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default('30000'), // 30초
  WS_MAX_CONNECTIONS: z.string().transform(Number).default('1000'),
  
  // MCP 설정
  MCP_TIMEOUT: z.string().transform(Number).default('10000'), // 10초
  MCP_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),
  
  // 모니터링 설정
  PROMETHEUS_ENABLED: z.string().transform(Boolean).default('true'),
  PROMETHEUS_PORT: z.string().transform(Number).default('9090'),
  
  // 데이터베이스 설정 (향후 확장용)
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  
  // 외부 서비스 설정
  EXTERNAL_API_TIMEOUT: z.string().transform(Number).default('5000'), // 5초
  EXTERNAL_API_RETRY_ATTEMPTS: z.string().transform(Number).default('3')
});

export type Config = z.infer<typeof envSchema>;

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    // .env 파일 로드
    dotenv.config();
    
    // 환경 변수 검증 및 파싱
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`환경 설정 검증 실패:\n${errors}`);
    }
    
    this.config = result.data;
    
    // 개발 환경에서 설정 출력
    if (this.config.NODE_ENV === 'development') {
      console.log('로드된 설정:', JSON.stringify(this.config, null, 2));
    }
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 전체 설정 반환
   */
  public getConfig(): Config {
    return { ...this.config };
  }

  /**
   * 서버 설정 반환
   */
  public getServerConfig() {
    return {
      nodeEnv: this.config.NODE_ENV,
      port: this.config.PORT,
      host: this.config.HOST,
      requestTimeout: this.config.REQUEST_TIMEOUT
    };
  }

  /**
   * 보안 설정 반환
   */
  public getSecurityConfig() {
    return {
      jwtSecret: this.config.JWT_SECRET,
      jwtExpiresIn: this.config.JWT_EXPIRES_IN,
      bcryptRounds: this.config.BCRYPT_ROUNDS
    };
  }

  /**
   * CORS 설정 반환
   */
  public getCorsConfig() {
    return {
      origin: this.config.CORS_ORIGIN === '*' ? true : this.config.CORS_ORIGIN.split(','),
      credentials: this.config.CORS_CREDENTIALS
    };
  }

  /**
   * 파일 업로드 설정 반환
   */
  public getFileUploadConfig() {
    return {
      maxFileSize: this.config.MAX_FILE_SIZE,
      uploadDir: this.config.UPLOAD_DIR
    };
  }

  /**
   * Rate Limiting 설정 반환
   */
  public getRateLimitConfig() {
    return {
      windowMs: this.config.RATE_LIMIT_WINDOW,
      max: this.config.RATE_LIMIT_MAX
    };
  }

  /**
   * WebSocket 설정 반환
   */
  public getWebSocketConfig() {
    return {
      heartbeatInterval: this.config.WS_HEARTBEAT_INTERVAL,
      maxConnections: this.config.WS_MAX_CONNECTIONS
    };
  }

  /**
   * MCP 설정 반환
   */
  public getMcpConfig() {
    return {
      timeout: this.config.MCP_TIMEOUT,
      retryAttempts: this.config.MCP_RETRY_ATTEMPTS
    };
  }

  /**
   * 모니터링 설정 반환
   */
  public getMonitoringConfig() {
    return {
      prometheusEnabled: this.config.PROMETHEUS_ENABLED,
      prometheusPort: this.config.PROMETHEUS_PORT
    };
  }

  /**
   * 외부 API 설정 반환
   */
  public getExternalApiConfig() {
    return {
      timeout: this.config.EXTERNAL_API_TIMEOUT,
      retryAttempts: this.config.EXTERNAL_API_RETRY_ATTEMPTS
    };
  }

  /**
   * 개발 환경 여부 확인
   */
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * 프로덕션 환경 여부 확인
   */
  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * 테스트 환경 여부 확인
   */
  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  /**
   * 특정 설정값 반환
   */
  public get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  /**
   * 설정 검증
   */
  public validateConfig(): { isValid: boolean; errors?: string[] } {
    try {
      envSchema.parse(process.env);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        return { isValid: false, errors };
      }
      return { isValid: false, errors: ['알 수 없는 검증 오류'] };
    }
  }
}