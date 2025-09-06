// JWT 기반 인증 서비스

import { 
  generateJwtToken, 
  verifyJwtToken, 
  hashPassword, 
  verifyPassword,
  generateSecureToken,
  generateUuid
} from '../core/utils/crypto';
import { 
  AuthenticationError, 
  ValidationError 
} from '../types/errors';
import { Logger } from '../core/logging/Logger';
import { ConfigManager } from '../core/config/ConfigManager';
import { validateData } from '../core/utils/validation';
import { z } from 'zod';

const logger = new Logger();
const config = ConfigManager.getInstance();

// 사용자 스키마 정의 (타입 추론용)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
  permissions: z.array(z.string()).default([]),
  tier: z.enum(['free', 'premium', 'enterprise']).default('free'),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional()
});

const LoginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다')
});

const RegisterSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요').max(100, '이름은 100자를 초과할 수 없습니다'),
  role: z.enum(['user', 'viewer']).default('user')
});

export type User = z.infer<typeof UserSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  tier: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenData {
  userId: string;
  tokenId: string;
  createdAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
}

/**
 * JWT 기반 인증 서비스
 */
export class AuthService {
  private users: Map<string, User> = new Map(); // 실제 구현에서는 데이터베이스 사용
  private refreshTokens: Map<string, RefreshTokenData> = new Map(); // 실제 구현에서는 Redis 사용
  private revokedTokens: Set<string> = new Set(); // 실제 구현에서는 Redis 사용

  constructor() {
    // 기본 관리자 계정 생성 (개발용)
    if (config.isDevelopment()) {
      this.createDefaultAdmin();
    }
  }

  /**
   * 사용자 등록
   */
  async register(registerData: RegisterRequest, requestId?: string): Promise<User> {
    try {
      // 입력 데이터 검증
      const validatedData = validateData(RegisterSchema, registerData, 'registerData');

      // 이메일 중복 확인
      const existingUser = Array.from(this.users.values()).find(
        user => user.email === validatedData.email
      );

      if (existingUser) {
        throw new ValidationError(
          '이미 등록된 이메일 주소입니다',
          'email',
          validatedData.email,
          requestId
        );
      }

      // 비밀번호 해싱
      const hashedPassword = await hashPassword(validatedData.password);

      // 새 사용자 생성
      const newUser: User = {
        id: generateUuid(),
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role || 'user',
        permissions: this.getDefaultPermissions(validatedData.role || 'user'),
        tier: 'free',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 사용자 저장 (실제 구현에서는 데이터베이스에 저장)
      this.users.set(newUser.id, newUser);

      // 비밀번호는 별도 저장 (실제 구현에서는 별도 테이블)
      this.storePassword(newUser.id, hashedPassword);

      logger.info('새 사용자 등록 완료', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        requestId
      });

      return newUser;
    } catch (error) {
      logger.error('사용자 등록 실패', {
        error: (error as Error).message,
        email: registerData.email,
        requestId
      });
      throw error;
    }
  }

  /**
   * 사용자 로그인
   */
  async login(loginData: LoginRequest, requestId?: string): Promise<AuthTokens> {
    try {
      // 입력 데이터 검증
      const validatedData = validateData(LoginSchema, loginData, 'loginData');

      // 사용자 조회
      const user = Array.from(this.users.values()).find(
        user => user.email === validatedData.email
      );

      if (!user) {
        throw new AuthenticationError('이메일 또는 비밀번호가 올바르지 않습니다', requestId);
      }

      // 계정 활성화 상태 확인
      if (!user.isActive) {
        throw new AuthenticationError('비활성화된 계정입니다', requestId);
      }

      // 비밀번호 검증
      const storedPassword = this.getStoredPassword(user.id);
      if (!storedPassword || !await verifyPassword(validatedData.password, storedPassword)) {
        throw new AuthenticationError('이메일 또는 비밀번호가 올바르지 않습니다', requestId);
      }

      // 마지막 로그인 시간 업데이트
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();
      this.users.set(user.id, user);

      // 토큰 생성
      const tokens = await this.generateTokens(user);

      logger.info('사용자 로그인 성공', {
        userId: user.id,
        email: user.email,
        requestId
      });

      return tokens;
    } catch (error) {
      logger.warn('사용자 로그인 실패', {
        error: (error as Error).message,
        email: loginData.email,
        requestId
      });
      throw error;
    }
  }

  /**
   * 토큰 새로고침
   */
  async refreshToken(refreshToken: string, requestId?: string): Promise<AuthTokens> {
    try {
      // 리프레시 토큰 검증
      const tokenData = this.refreshTokens.get(refreshToken);
      
      if (!tokenData) {
        throw new AuthenticationError('유효하지 않은 리프레시 토큰입니다', requestId);
      }

      if (tokenData.isRevoked) {
        throw new AuthenticationError('폐기된 리프레시 토큰입니다', requestId);
      }

      if (new Date() > tokenData.expiresAt) {
        throw new AuthenticationError('만료된 리프레시 토큰입니다', requestId);
      }

      // 사용자 조회
      const user = this.users.get(tokenData.userId);
      if (!user || !user.isActive) {
        throw new AuthenticationError('유효하지 않은 사용자입니다', requestId);
      }

      // 기존 리프레시 토큰 폐기
      tokenData.isRevoked = true;

      // 새 토큰 생성
      const tokens = await this.generateTokens(user);

      logger.info('토큰 새로고침 성공', {
        userId: user.id,
        requestId
      });

      return tokens;
    } catch (error) {
      logger.warn('토큰 새로고침 실패', {
        error: (error as Error).message,
        requestId
      });
      throw error;
    }
  }

  /**
   * 로그아웃
   */
  async logout(accessToken: string, refreshToken?: string, requestId?: string): Promise<void> {
    try {
      // 액세스 토큰을 블랙리스트에 추가
      this.revokedTokens.add(accessToken);

      // 리프레시 토큰 폐기
      if (refreshToken) {
        const tokenData = this.refreshTokens.get(refreshToken);
        if (tokenData) {
          tokenData.isRevoked = true;
        }
      }

      logger.info('사용자 로그아웃 완료', { requestId });
    } catch (error) {
      logger.error('로그아웃 처리 실패', {
        error: (error as Error).message,
        requestId
      });
      throw error;
    }
  }

  /**
   * 토큰 검증
   */
  async verifyToken(token: string, requestId?: string): Promise<JwtPayload> {
    try {
      // 폐기된 토큰 확인
      if (this.revokedTokens.has(token)) {
        throw new AuthenticationError('폐기된 토큰입니다', requestId);
      }

      // JWT 토큰 검증
      const payload = verifyJwtToken(token) as JwtPayload;

      // 사용자 존재 및 활성화 상태 확인
      const user = this.users.get(payload.id);
      if (!user || !user.isActive) {
        throw new AuthenticationError('유효하지 않은 사용자입니다', requestId);
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logger.warn('토큰 검증 실패', {
        error: (error as Error).message,
        requestId
      });
      
      throw new AuthenticationError('유효하지 않은 토큰입니다', requestId);
    }
  }

  /**
   * 사용자 권한 확인
   */
  async checkPermission(userId: string, permission: string, requestId?: string): Promise<boolean> {
    try {
      const user = this.users.get(userId);
      if (!user || !user.isActive) {
        return false;
      }

      // 관리자는 모든 권한 보유
      if (user.role === 'admin') {
        return true;
      }

      // 특정 권한 확인
      return user.permissions.includes(permission);
    } catch (error) {
      logger.error('권한 확인 실패', {
        error: (error as Error).message,
        userId,
        permission,
        requestId
      });
      return false;
    }
  }

  /**
   * 사용자 정보 조회
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userId: string, updateData: Partial<User>, requestId?: string): Promise<User> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new AuthenticationError('사용자를 찾을 수 없습니다', requestId);
      }

      // 업데이트 가능한 필드만 허용
      const allowedFields = ['name', 'tier', 'permissions'];
      const filteredData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = (updateData as any)[key];
          return obj;
        }, {} as Partial<User>);

      const updatedUser = {
        ...user,
        ...filteredData,
        updatedAt: new Date()
      };

      this.users.set(userId, updatedUser);

      logger.info('사용자 정보 업데이트 완료', {
        userId,
        updatedFields: Object.keys(filteredData),
        requestId
      });

      return updatedUser;
    } catch (error) {
      logger.error('사용자 정보 업데이트 실패', {
        error: (error as Error).message,
        userId,
        requestId
      });
      throw error;
    }
  }

  /**
   * 토큰 생성
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      tier: user.tier
    };

    // 액세스 토큰 생성
    const accessToken = generateJwtToken(payload);

    // 리프레시 토큰 생성
    const refreshToken = generateSecureToken('rt');
    const refreshTokenData: RefreshTokenData = {
      userId: user.id,
      tokenId: generateUuid(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
      isRevoked: false
    };

    this.refreshTokens.set(refreshToken, refreshTokenData);

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24시간 (초 단위)
      tokenType: 'Bearer'
    };
  }

  /**
   * 역할별 기본 권한 반환
   */
  private getDefaultPermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_system'],
      user: ['read', 'write'],
      viewer: ['read']
    };

    return permissions[role] || permissions.user;
  }

  /**
   * 기본 관리자 계정 생성 (개발용)
   */
  private async createDefaultAdmin(): Promise<void> {
    const adminEmail = 'admin@example.com';
    const existingAdmin = Array.from(this.users.values()).find(
      user => user.email === adminEmail
    );

    if (!existingAdmin) {
      const adminUser: User = {
        id: generateUuid(),
        email: adminEmail,
        name: 'Administrator',
        role: 'admin',
        permissions: this.getDefaultPermissions('admin'),
        tier: 'enterprise',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.users.set(adminUser.id, adminUser);
      
      // 기본 비밀번호: admin123!
      const hashedPassword = await hashPassword('admin123!');
      this.storePassword(adminUser.id, hashedPassword);

      logger.info('기본 관리자 계정 생성 완료', {
        email: adminEmail,
        userId: adminUser.id
      });
    }
  }

  /**
   * 비밀번호 저장 (실제 구현에서는 별도 테이블/컬렉션)
   */
  private passwords: Map<string, string> = new Map();

  private storePassword(userId: string, hashedPassword: string): void {
    this.passwords.set(userId, hashedPassword);
  }

  private getStoredPassword(userId: string): string | undefined {
    return this.passwords.get(userId);
  }
}