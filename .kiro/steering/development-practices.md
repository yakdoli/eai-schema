# EAI Schema Toolkit - 개발 실무 지침

## 코딩 스타일 및 컨벤션

### 1. TypeScript 코딩 규칙
```typescript
// ✅ 좋은 예시
interface ISchemaValidationRequest {
  schemaType: 'xml' | 'json' | 'yaml';
  content: string;
  validationRules?: ValidationRule[];
}

class SchemaValidationService {
  private readonly logger = Logger.getInstance();
  
  public async validateSchema(request: ISchemaValidationRequest): Promise<ValidationResult> {
    try {
      this.logger.info('스키마 검증 시작', { schemaType: request.schemaType });
      // 구현 로직
    } catch (error) {
      this.logger.error('스키마 검증 실패', { error: error.message });
      throw new ValidationError('스키마 검증에 실패했습니다');
    }
  }
}

// ❌ 피해야 할 예시
function validate(data: any): any {
  // any 타입 사용 금지
  // 에러 처리 없음
  // 로깅 없음
}
```

### 2. 에러 처리 패턴
```typescript
// 커스텀 에러 클래스 정의
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly schemaType: string,
    public readonly validationErrors: string[]
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

// 에러 처리 미들웨어에서 활용
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof SchemaValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'SCHEMA_VALIDATION_ERROR',
        message: err.message,
        details: {
          schemaType: err.schemaType,
          validationErrors: err.validationErrors
        }
      }
    });
  }
  // 기타 에러 처리...
};
```

### 3. 로깅 표준
```typescript
// 구조화된 로깅
this.logger.info('파일 업로드 처리 시작', {
  fileName: file.originalname,
  fileSize: file.size,
  mimeType: file.mimetype,
  userId: req.user?.id,
  requestId: req.id
});

// 성능 로깅
const startTime = Date.now();
const result = await this.processSchema(schema);
const duration = Date.now() - startTime;

this.logger.info('스키마 처리 완료', {
  duration,
  schemaSize: schema.length,
  resultSize: result.length
});
```

## 테스트 작성 가이드

### 1. 단위 테스트 패턴
```typescript
describe('SchemaValidationService', () => {
  let service: SchemaValidationService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;
    
    service = new SchemaValidationService(mockLogger);
  });

  describe('validateXmlSchema', () => {
    it('유효한 XML 스키마를 성공적으로 검증해야 함', async () => {
      // Given
      const validXmlSchema = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="root" type="xs:string"/>
        </xs:schema>
      `;

      // When
      const result = await service.validateXmlSchema(validXmlSchema);

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('XML 스키마 검증 성공')
      );
    });

    it('잘못된 XML 스키마에 대해 적절한 에러를 반환해야 함', async () => {
      // Given
      const invalidXmlSchema = '<invalid-xml>';

      // When & Then
      await expect(service.validateXmlSchema(invalidXmlSchema))
        .rejects
        .toThrow(SchemaValidationError);
    });
  });
});
```

### 2. 통합 테스트 패턴
```typescript
describe('Schema Upload API', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
  });

  it('POST /api/upload/schema - 유효한 스키마 파일 업로드', async () => {
    const response = await request(app)
      .post('/api/upload/schema')
      .attach('file', Buffer.from(validXmlSchema), 'test-schema.xsd')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        fileId: expect.any(String),
        fileName: 'test-schema.xsd',
        schemaType: 'xml'
      }
    });
  });
});
```

## API 설계 원칙

### 1. 일관된 응답 형식
```typescript
// 성공 응답
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// 에러 응답
interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    details?: Record<string, any>;
    code?: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

### 2. 입력 검증 패턴
```typescript
import Joi from 'joi';

const schemaUploadValidation = Joi.object({
  schemaType: Joi.string().valid('xml', 'json', 'yaml').required(),
  content: Joi.string().min(1).max(10 * 1024 * 1024).required(), // 10MB 제한
  fileName: Joi.string().pattern(/^[a-zA-Z0-9._-]+$/).required(),
  validationOptions: Joi.object({
    strictMode: Joi.boolean().default(false),
    allowExternalReferences: Joi.boolean().default(false)
  }).optional()
});

export const validateSchemaUpload = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schemaUploadValidation.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: '입력 데이터가 유효하지 않습니다',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
  
  req.body = value;
  next();
};
```

## 성능 최적화 가이드

### 1. 메모리 효율적인 파일 처리
```typescript
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export class FileProcessor {
  async processLargeFile(inputPath: string, outputPath: string): Promise<void> {
    const readStream = createReadStream(inputPath);
    const writeStream = createWriteStream(outputPath);
    
    // Transform stream을 사용한 스트림 처리
    const transformStream = new Transform({
      transform(chunk, encoding, callback) {
        // 청크 단위로 처리
        const processed = this.processChunk(chunk);
        callback(null, processed);
      }
    });
    
    await pipeline(readStream, transformStream, writeStream);
  }
}
```

### 2. 캐싱 전략
```typescript
import NodeCache from 'node-cache';

export class SchemaCache {
  private cache = new NodeCache({
    stdTTL: 300, // 5분 TTL
    checkperiod: 60, // 1분마다 만료 체크
    maxKeys: 1000 // 최대 1000개 키
  });

  async getValidatedSchema(schemaHash: string): Promise<ValidationResult | null> {
    const cached = this.cache.get<ValidationResult>(schemaHash);
    if (cached) {
      this.logger.debug('캐시에서 검증 결과 반환', { schemaHash });
      return cached;
    }
    return null;
  }

  setValidatedSchema(schemaHash: string, result: ValidationResult): void {
    this.cache.set(schemaHash, result);
    this.logger.debug('검증 결과 캐시 저장', { schemaHash });
  }
}
```

## 보안 구현 가이드

### 1. 파일 업로드 보안
```typescript
import multer from 'multer';
import path from 'path';

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/xml',
    'text/xml',
    'application/json',
    'text/yaml',
    'application/x-yaml'
  ];
  
  const allowedExtensions = ['.xml', '.xsd', '.json', '.yaml', '.yml'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다'));
  }
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter
});
```

### 2. URL 검증 (SSRF 방지)
```typescript
import { URL } from 'url';

export class UrlValidator {
  private readonly allowedProtocols = ['http:', 'https:'];
  private readonly blockedHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1'
  ];

  validateUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      
      // 프로토콜 검증
      if (!this.allowedProtocols.includes(url.protocol)) {
        throw new Error('허용되지 않는 프로토콜입니다');
      }
      
      // 내부 네트워크 접근 차단
      if (this.blockedHosts.includes(url.hostname)) {
        throw new Error('내부 네트워크 접근이 차단되었습니다');
      }
      
      // 사설 IP 대역 체크
      if (this.isPrivateIP(url.hostname)) {
        throw new Error('사설 IP 접근이 차단되었습니다');
      }
      
      return true;
    } catch (error) {
      this.logger.warn('URL 검증 실패', { url: urlString, error: error.message });
      return false;
    }
  }
  
  private isPrivateIP(hostname: string): boolean {
    // 사설 IP 대역 검증 로직
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./
    ];
    
    return privateRanges.some(range => range.test(hostname));
  }
}
```

## 모니터링 및 메트릭

### 1. Prometheus 메트릭 수집
```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsCollector {
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  private readonly activeConnections = new Gauge({
    name: 'websocket_active_connections',
    help: 'Number of active WebSocket connections'
  });

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  getMetrics(): string {
    return register.metrics();
  }
}
```

### 2. 성능 모니터링 미들웨어
```typescript
export const performanceMonitoring = (metricsCollector: MetricsCollector) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const route = req.route?.path || req.path;
      
      metricsCollector.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        duration
      );
      
      // 느린 요청 로깅
      if (duration > 2) {
        logger.warn('느린 요청 감지', {
          method: req.method,
          route,
          duration,
          statusCode: res.statusCode
        });
      }
    });
    
    next();
  };
};
```

이러한 개발 실무 지침을 통해 EAI Schema Toolkit의 코드 품질과 안정성을 지속적으로 향상시킬 수 있습니다.