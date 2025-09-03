import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { ValidationError, FileUploadError, SecurityError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// 지원되는 파일 타입
const ALLOWED_MIME_TYPES = [
  'text/xml',
  'application/xml',
  'application/json',
  'text/plain',
  'application/x-yaml',
  'text/yaml',
  'application/wsdl+xml',
  'application/xsd+xml'
];

// 지원되는 파일 확장자
const ALLOWED_EXTENSIONS = [
  '.xml',
  '.wsdl',
  '.xsd',
  '.json',
  '.yaml',
  '.yml',
  '.txt'
];

// 최대 파일 크기 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 임시 파일 저장 디렉토리
const TEMP_DIR = path.join(process.cwd(), 'temp');

export interface UploadedFileInfo {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
  expiresAt: Date;
}

export class FileUploadService {
  private uploadedFiles = new Map<string, UploadedFileInfo>();

  constructor() {
    this.ensureTempDirectory();
    this.startCleanupTimer();
  }

  // 임시 디렉토리 생성
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(TEMP_DIR);
    } catch {
      await fs.mkdir(TEMP_DIR, { recursive: true });
      logger.info(`임시 디렉토리 생성: ${TEMP_DIR}`);
    }
  }

  // 파일 검증
  validateFile(file: Express.Multer.File): void {
    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      throw new FileUploadError(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 허용됩니다.`);
    }

    // MIME 타입 검증
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new FileUploadError(`지원되지 않는 파일 타입입니다. 허용된 타입: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // 파일 확장자 검증
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new FileUploadError(`지원되지 않는 파일 확장자입니다. 허용된 확장자: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // 파일 내용 기본 검증
    this.validateFileContent(file.buffer, file.mimetype);
  }

  // 파일 내용 검증 (기본적인 보안 검사)
  private validateFileContent(buffer: Buffer, mimetype: string): void {
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

    // XML 파일의 경우 XXE 공격 방지를 위한 기본 검사
    if (mimetype.includes('xml')) {
      // 외부 엔티티 참조 검사
      if (content.includes('<!ENTITY') && content.includes('SYSTEM')) {
        throw new SecurityError('외부 엔티티 참조가 포함된 XML 파일은 허용되지 않습니다.');
      }

      // DOCTYPE 선언에서 외부 DTD 참조 검사
      if (content.includes('<!DOCTYPE') && content.includes('SYSTEM')) {
        throw new SecurityError('외부 DTD 참조가 포함된 XML 파일은 허용되지 않습니다.');
      }
    }

    // JSON 파일의 경우 기본 구문 검사
    if (mimetype.includes('json')) {
      try {
        JSON.parse(content);
      } catch (error) {
        // 부분 내용으로 파싱 실패는 정상 (전체 파일이 아니므로)
        // 실제 파싱은 나중에 전체 내용으로 수행
      }
    }
  }

  // 파일 저장
  async saveFile(file: Express.Multer.File): Promise<UploadedFileInfo> {
    this.validateFile(file);

    const fileId = crypto.randomUUID();
    const filename = `${fileId}_${file.originalname}`;
    const filePath = path.join(TEMP_DIR, filename);

    // 파일 저장
    await fs.writeFile(filePath, file.buffer);

    const fileInfo: UploadedFileInfo = {
      id: fileId,
      originalName: file.originalname,
      filename,
      path: filePath,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료
    };

    this.uploadedFiles.set(fileId, fileInfo);

    logger.info(`파일 업로드 완료: ${file.originalname} (ID: ${fileId})`);

    return fileInfo;
  }

  // 파일 정보 조회
  getFileInfo(fileId: string): UploadedFileInfo | undefined {
    return this.uploadedFiles.get(fileId);
  }

  // 파일 내용 읽기
  async readFile(fileId: string): Promise<Buffer> {
    const fileInfo = this.uploadedFiles.get(fileId);
    if (!fileInfo) {
      throw new ValidationError('파일을 찾을 수 없습니다.');
    }

    if (new Date() > fileInfo.expiresAt) {
      await this.deleteFile(fileId);
      throw new ValidationError('파일이 만료되었습니다.');
    }

    try {
      return await fs.readFile(fileInfo.path);
    } catch (error) {
      logger.error(`파일 읽기 실패: ${fileInfo.path}`, error);
      throw new FileUploadError('파일을 읽을 수 없습니다.');
    }
  }

  // 파일 삭제
  async deleteFile(fileId: string): Promise<void> {
    const fileInfo = this.uploadedFiles.get(fileId);
    if (!fileInfo) {
      return;
    }

    try {
      await fs.unlink(fileInfo.path);
      this.uploadedFiles.delete(fileId);
      logger.info(`파일 삭제 완료: ${fileInfo.originalName} (ID: ${fileId})`);
    } catch (error) {
      logger.error(`파일 삭제 실패: ${fileInfo.path}`, error);
    }
  }

  // 만료된 파일 정리
  private async cleanupExpiredFiles(): Promise<void> {
    const now = new Date();
    const expiredFiles: string[] = [];

    for (const [fileId, fileInfo] of this.uploadedFiles.entries()) {
      if (now > fileInfo.expiresAt) {
        expiredFiles.push(fileId);
      }
    }

    for (const fileId of expiredFiles) {
      await this.deleteFile(fileId);
    }

    if (expiredFiles.length > 0) {
      logger.info(`만료된 파일 ${expiredFiles.length}개 정리 완료`);
    }
  }

  // 정리 타이머 시작
  private startCleanupTimer(): void {
    // 테스트 환경에서는 타이머를 시작하지 않음
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // 1시간마다 만료된 파일 정리
    setInterval(() => {
      this.cleanupExpiredFiles().catch(error => {
        logger.error('파일 정리 중 오류 발생:', error);
      });
    }, 60 * 60 * 1000);
  }

  // 업로드된 파일 목록 조회
  getUploadedFiles(): UploadedFileInfo[] {
    return Array.from(this.uploadedFiles.values());
  }
}

// 싱글톤 인스턴스
export const fileUploadService = new FileUploadService();