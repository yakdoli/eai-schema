// 암호화 및 해싱 유틸리티

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ConfigManager } from '../config/ConfigManager';

const config = ConfigManager.getInstance();

/**
 * 비밀번호 해싱
 */
export const hashPassword = async (password: string): Promise<string> => {
  const rounds = config.get('BCRYPT_ROUNDS');
  return bcrypt.hash(password, rounds);
};

/**
 * 비밀번호 검증
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * JWT 토큰 생성
 */
export const generateJwtToken = (payload: object): string => {
  const secret = config.get('JWT_SECRET');
  const expiresIn = config.get('JWT_EXPIRES_IN');
  
  if (!secret) {
    throw new Error('JWT_SECRET이 설정되지 않았습니다');
  }
  
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * JWT 토큰 검증
 */
export const verifyJwtToken = (token: string): any => {
  const secret = config.get('JWT_SECRET');
  
  if (!secret) {
    throw new Error('JWT_SECRET이 설정되지 않았습니다');
  }
  
  return jwt.verify(token, secret);
};

/**
 * 랜덤 문자열 생성
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * UUID v4 생성
 */
export const generateUuid = (): string => {
  return crypto.randomUUID();
};

/**
 * 해시 생성 (SHA-256)
 */
export const generateHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * HMAC 생성
 */
export const generateHmac = (data: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * 데이터 암호화 (AES-256-GCM)
 */
export const encrypt = (text: string, key: string): {
  encrypted: string;
  iv: string;
  tag: string;
} => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

/**
 * 데이터 복호화 (AES-256-GCM)
 */
export const decrypt = (
  encryptedData: { encrypted: string; iv: string; tag: string },
  key: string
): string => {
  const decipher = crypto.createDecipher('aes-256-gcm', key);
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * 파일 체크섬 생성
 */
export const generateFileChecksum = (buffer: Buffer): string => {
  return crypto.createHash('md5').update(buffer).digest('hex');
};

/**
 * 보안 토큰 생성 (API 키 등)
 */
export const generateSecureToken = (prefix: string = ''): string => {
  const randomPart = crypto.randomBytes(32).toString('base64url');
  return prefix ? `${prefix}_${randomPart}` : randomPart;
};

/**
 * 시간 기반 원타임 패스워드 (TOTP) 생성
 */
export const generateTotp = (secret: string, window: number = 0): string => {
  const time = Math.floor(Date.now() / 1000 / 30) + window;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(time, 4);
  
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
};

/**
 * 비밀번호 강도 기반 솔트 생성
 */
export const generateSalt = (rounds: number = 12): string => {
  return bcrypt.genSaltSync(rounds);
};

/**
 * 안전한 비교 (타이밍 공격 방지)
 */
export const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};