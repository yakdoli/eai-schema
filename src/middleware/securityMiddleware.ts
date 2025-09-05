// 보안 미들웨어

import { Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AuthenticatedRequest } from '../types/api';
import { ValidationError, AuthorizationError } from '../types/errors';
import { Logger } from '../core/logging/Logger';
import { ConfigManager } from '../core/config/ConfigManager';
import { 
  isValidUrl, 
  isValidFileExtension, 
  isValidMimeType, 
  sanitizeInput, 
  escapeHtml 
} from '../core/utils/validation';

const logger = new Logger();
const config = ConfigManager.getInstance();

/**
 * 기본 보안 헤더 설정 (강화된 버전)
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Handsontable을 위한 eval 허용
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"], // WebSocket 지원
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    },
  },
  crossOriginEmbedderPolicy: false, // WebSocket 지원을 위해 비활성화
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
});

/**
 * CORS 설정
 */
export const corsMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const corsConfig = config.getCorsConfig();
  const origin = req.headers.origin;
  
  // Origin 검증
  if (Array.isArray(corsConfig.origin)) {
    if (origin && corsConfig.origin.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (corsConfig.origin === true) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', corsConfig.credentials.toString());
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Preflight 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

/**
 * 입력 새니타이제이션 미들웨어
 */
export const sanitizeInputs = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // 쿼리 파라미터 새니타이제이션
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeInput(req.query[key] as string);
        }
      }
    }
    
    // 요청 본문 새니타이제이션 (재귀적)
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    next();
  } catch (error) {
    logger.warn('입력 새니타이제이션 실패', {
      error: (error as Error).message,
      requestId: req.requestId
    });
    next(error);
  }
};

/**
 * 객체 재귀적 새니타이제이션
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * XXE 공격 방지 미들웨어
 */
export const preventXXE = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const contentType = req.headers['content-type'];
  
  if (contentType && (contentType.includes('xml') || contentType.includes('application/xml'))) {
    // XML 내용에서 외부 엔티티 참조 검사
    if (req.body && typeof req.body === 'string') {
      const xmlContent = req.body;
      
      // 위험한 XML 패턴 검사
      const dangerousPatterns = [
        /<!ENTITY/i,
        /<!DOCTYPE.*\[/i,
        /SYSTEM\s+["'][^"']*["']/i,
        /PUBLIC\s+["'][^"']*["']/i
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(xmlContent)) {
          logger.logSecurityEvent('xxe_attempt', 'high', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            url: req.originalUrl,
            requestId: req.requestId,
            pattern: pattern.toString()
          });
          
          throw new ValidationError(
            'XML 외부 엔티티 참조는 보안상 허용되지 않습니다',
            'xml_content',
            undefined,
            req.requestId
          );
        }
      }
    }
  }
  
  next();
};

/**
 * 파일 업로드 보안 검증
 */
export const secureFileUpload = (options: {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanContent?: boolean;
}) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const files = req.files as any;
      const file = req.file as any;
      
      const filesToCheck = files ? (Array.isArray(files) ? files : [files]) : (file ? [file] : []);
      
      for (const uploadedFile of filesToCheck) {
        // 파일 크기 검증
        if (uploadedFile.size > options.maxSize) {
          throw new ValidationError(
            `파일 크기가 너무 큽니다. 최대 ${options.maxSize} 바이트까지 허용됩니다`,
            'file.size',
            uploadedFile.size,
            req.requestId
          );
        }
        
        // MIME 타입 검증
        if (!isValidMimeType(uploadedFile.mimetype, options.allowedMimeTypes)) {
          logger.logSecurityEvent('invalid_mime_type', 'medium', {
            filename: uploadedFile.originalname,
            mimetype: uploadedFile.mimetype,
            ip: req.ip,
            requestId: req.requestId
          });
          
          throw new ValidationError(
            '허용되지 않는 파일 형식입니다',
            'file.mimetype',
            uploadedFile.mimetype,
            req.requestId
          );
        }
        
        // 파일 확장자 검증
        if (!isValidFileExtension(uploadedFile.originalname, options.allowedExtensions)) {
          const extension = uploadedFile.originalname.toLowerCase().split('.').pop();
          
          logger.logSecurityEvent('invalid_file_extension', 'medium', {
            filename: uploadedFile.originalname,
            extension,
            ip: req.ip,
            requestId: req.requestId
          });
          
          throw new ValidationError(
            '허용되지 않는 파일 확장자입니다',
            'file.extension',
            extension,
            req.requestId
          );
        }
        
        // 파일 내용 스캔 (옵션)
        if (options.scanContent) {
          scanFileContent(uploadedFile, req);
        }
        
        // 파일명 검증 (경로 순회 공격 방지)
        if (uploadedFile.originalname.includes('..') || uploadedFile.originalname.includes('/') || uploadedFile.originalname.includes('\\')) {
          logger.logSecurityEvent('path_traversal_attempt', 'high', {
            filename: uploadedFile.originalname,
            ip: req.ip,
            requestId: req.requestId
          });
          
          throw new ValidationError(
            '유효하지 않은 파일명입니다',
            'file.filename',
            uploadedFile.originalname,
            req.requestId
          );
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 파일 내용 스캔
 */
function scanFileContent(file: any, req: AuthenticatedRequest): void {
  const content = file.buffer ? file.buffer.toString() : '';
  
  // 악성 스크립트 패턴 검사
  const maliciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /eval\s*\(/i,
    /document\.cookie/i
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      logger.logSecurityEvent('malicious_file_content', 'critical', {
        filename: file.originalname,
        pattern: pattern.toString(),
        ip: req.ip,
        requestId: req.requestId
      });
      
      throw new ValidationError(
        '악성 코드가 포함된 파일은 업로드할 수 없습니다',
        'file.content',
        undefined,
        req.requestId
      );
    }
  }
}

/**
 * URL 검증 미들웨어
 */
export const validateUrl = (paramName: string = 'url') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const url = req.body[paramName] || req.query[paramName];
      
      if (url && !isValidUrl(url)) {
        throw new ValidationError(
          '유효하지 않은 URL 형식입니다',
          paramName,
          url,
          req.requestId
        );
      }
      
      // 내부 네트워크 접근 방지
      if (url) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        // 로컬 주소 차단
        const blockedHosts = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '::1'
        ];
        
        // 사설 IP 대역 차단
        const privateIPPatterns = [
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
          /^192\.168\./,
          /^169\.254\./, // Link-local
          /^fc00:/, // IPv6 private
          /^fe80:/ // IPv6 link-local
        ];
        
        if (blockedHosts.includes(hostname) || privateIPPatterns.some(pattern => pattern.test(hostname))) {
          logger.logSecurityEvent('ssrf_attempt', 'high', {
            url,
            hostname,
            ip: req.ip,
            requestId: req.requestId
          });
          
          throw new AuthorizationError(
            '내부 네트워크 주소에는 접근할 수 없습니다',
            'external_url_only',
            req.requestId
          );
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * SQL 인젝션 방지 미들웨어
 */
export const preventSQLInjection = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|")/,
      /(\bOR\b|\bAND\b).*(\b=\b|\b<\b|\b>\b)/i
    ];
    
    const checkForSQLInjection = (value: string, path: string): void => {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          logger.logSecurityEvent('sql_injection_attempt', 'critical', {
            value: value.substring(0, 100),
            path,
            ip: req.ip,
            requestId: req.requestId
          });
          
          throw new ValidationError(
            'SQL 인젝션 시도가 감지되었습니다',
            path,
            undefined,
            req.requestId
          );
        }
      }
    };
    
    // 쿼리 파라미터 검사
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          checkForSQLInjection(req.query[key] as string, `query.${key}`);
        }
      }
    }
    
    // 요청 본문 검사 (재귀적)
    const checkObject = (obj: any, path: string = 'body'): void => {
      if (typeof obj === 'string') {
        checkForSQLInjection(obj, path);
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => checkObject(item, `${path}[${index}]`));
      } else if (obj && typeof obj === 'object') {
        for (const key in obj) {
          checkObject(obj[key], `${path}.${key}`);
        }
      }
    };
    
    if (req.body) {
      checkObject(req.body);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 요청 크기 제한
 */
export const limitRequestSize = (maxSize: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      logger.logSecurityEvent('oversized_request', 'medium', {
        contentLength,
        maxSize,
        ip: req.ip,
        requestId: req.requestId
      });
      
      throw new ValidationError(
        `요청 크기가 너무 큽니다. 최대 ${maxSize} 바이트까지 허용됩니다`,
        'content-length',
        contentLength,
        req.requestId
      );
    }
    
    next();
  };
};