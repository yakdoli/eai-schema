// 인증 미들웨어

import { Response, NextFunction } from 'express';
import { verifyJwtToken } from '../core/utils/crypto';
import { AuthenticatedRequest } from '../types/auth';
import { AuthenticationError, AuthorizationError } from '../types/errors';
import { Logger } from '../core/logging/Logger';

const logger = new Logger();

/**
 * JWT 토큰 검증 미들웨어
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('액세스 토큰이 필요합니다', req.requestId);
    }

    const decoded = verifyJwtToken(token);
    req.user = decoded;

    logger.debug('사용자 인증 성공', {
      userId: decoded.id,
      requestId: req.requestId
    });

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      logger.warn('토큰 검증 실패', {
        error: (error as Error).message,
        requestId: req.requestId
      });
      next(new AuthenticationError('유효하지 않은 토큰입니다', req.requestId));
    }
  }
};

/**
 * 통합 인증 미들웨어 (API v2용)
 */
export const authMiddleware = (options: { required?: boolean } = {}) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (options.required) {
      return authenticateToken(req, res, next);
    } else {
      return optionalAuth(req, res, next);
    }
  };
};

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyJwtToken(token);
      req.user = decoded;
      
      logger.debug('선택적 인증 성공', {
        userId: decoded.id,
        requestId: req.requestId
      });
    }

    next();
  } catch (error) {
    // 선택적 인증에서는 토큰이 유효하지 않아도 통과
    logger.debug('선택적 인증 실패, 익명 사용자로 처리', {
      error: (error as Error).message,
      requestId: req.requestId
    });
    next();
  }
};

/**
 * 권한 확인 미들웨어
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('인증이 필요합니다', req.requestId);
      }

      const userPermissions = req.user.permissions || [];
      
      if (!userPermissions.includes(permission) && !userPermissions.includes('admin')) {
        throw new AuthorizationError(
          `'${permission}' 권한이 필요합니다`,
          permission,
          req.requestId
        );
      }

      logger.debug('권한 확인 성공', {
        userId: req.user.id,
        permission,
        requestId: req.requestId
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 역할 확인 미들웨어
 */
export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('인증이 필요합니다', req.requestId);
      }

      const userRole = req.user.role;
      
      if (userRole !== role && userRole !== 'admin') {
        throw new AuthorizationError(
          `'${role}' 역할이 필요합니다`,
          role,
          req.requestId
        );
      }

      logger.debug('역할 확인 성공', {
        userId: req.user.id,
        role,
        requestId: req.requestId
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 관리자 권한 확인 미들웨어
 */
export const requireAdmin = requireRole('admin');

/**
 * 소유자 확인 미들웨어 (리소스 소유자 또는 관리자만 접근 가능)
 */
export const requireOwnership = (resourceIdParam = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('인증이 필요합니다', req.requestId);
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;
      const userRole = req.user.role;

      // 관리자는 모든 리소스에 접근 가능
      if (userRole === 'admin') {
        next();
        return;
      }

      // 리소스 소유자 확인 (실제 구현에서는 데이터베이스 조회 필요)
      // 여기서는 간단히 사용자 ID와 리소스 ID가 같은지 확인
      if (resourceId !== userId) {
        throw new AuthorizationError(
          '해당 리소스에 접근할 권한이 없습니다',
          'resource_owner',
          req.requestId
        );
      }

      logger.debug('소유권 확인 성공', {
        userId,
        resourceId,
        requestId: req.requestId
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * API 키 인증 미들웨어
 */
export const authenticateApiKey = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AuthenticationError('API 키가 필요합니다', req.requestId);
    }

    // API 키 검증 로직 (실제 구현에서는 데이터베이스 조회)
    // 여기서는 간단한 예시
    if (!isValidApiKey(apiKey)) {
      throw new AuthenticationError('유효하지 않은 API 키입니다', req.requestId);
    }

    // API 키로부터 사용자 정보 추출
    req.user = getUserFromApiKey(apiKey);

    logger.debug('API 키 인증 성공', {
      userId: req.user?.id,
      requestId: req.requestId
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * API 키 유효성 검증 (실제 구현에서는 데이터베이스 조회)
 */
function isValidApiKey(apiKey: string): boolean {
  // 실제 구현에서는 데이터베이스에서 API 키 확인
  return apiKey.startsWith('sk_') && apiKey.length > 20;
}

/**
 * API 키로부터 사용자 정보 추출 (실제 구현에서는 데이터베이스 조회)
 */
function getUserFromApiKey(_apiKey: string): any {
  // 실제 구현에서는 데이터베이스에서 사용자 정보 조회
  return {
    id: 'api_user',
    name: 'API User',
    email: 'api@example.com',
    permissions: ['read', 'write'],
    role: 'user'
  };
}