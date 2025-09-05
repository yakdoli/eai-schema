// import multer from "multer"; // TODO: 필요시 사용
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { Readable } from "stream";
import { ValidationError, FileUploadError, SecurityError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { fileValidationService, ValidationResult } from "./FileValidationService";
import { fileProcessingService, ProcessingResult } from "./FileProcessingService";


// 지원되는 파일 타입
const ALLOWED_MIME_TYPES = [
  "text/xml",
  "application/xml",
  "application/json",
  "text/plain",
  "application/x-yaml",
  "text/yaml",
  "application/wsdl+xml",
  "application/xsd+xml"
];

// 지원되는 파일 확장자
const ALLOWED_EXTENSIONS = [
  ".xml",
  ".wsdl",
  ".xsd",
  ".json",
  ".yaml",
  ".yml",
  ".txt"
];

// 최대 파일 크기 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 임시 파일 저장 디렉토리
const TEMP_DIR = path.join(process.cwd(), "temp");

export interface UploadedFileInfo {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
  expiresAt: Date;
  validationResult?: ValidationResult;
  processingResult?: ProcessingResult;
  detectedType?: string;
  checksum?: string;
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

  // 파일 검증 (기존 방식 유지)
  validateFile(file: Express.Multer.File): void {
    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      throw new FileUploadError(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 허용됩니다.`);
    }

    // MIME 타입 검증
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new FileUploadError(`지원되지 않는 파일 타입입니다. 허용된 타입: ${ALLOWED_MIME_TYPES.join(", ")}`);
    }

    // 파일 확장자 검증
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new FileUploadError(`지원되지 않는 파일 확장자입니다. 허용된 확장자: ${ALLOWED_EXTENSIONS.join(", ")}`);
    }

    // 파일 내용 기본 검증
    this.validateFileContent(file.buffer, file.mimetype);
  }

  // 고급 파일 검증 (새로운 서비스 사용)
  async validateFileAdvanced(file: Express.Multer.File): Promise<ValidationResult> {
    logger.info(`고급 파일 검증 시작: ${file.originalname}`);

    try {
      const validationResult = await fileValidationService.validateFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors.join("; ");
        throw new FileUploadError(`파일 검증 실패: ${errorMessage}`);
      }

      // 경고는 로그에 기록
      if (validationResult.warnings.length > 0) {
        logger.warn(`파일 검증 경고: ${file.originalname}`, {
          warnings: validationResult.warnings
        });
      }

      return validationResult;

    } catch (error) {
      logger.error(`고급 파일 검증 실패: ${file.originalname}`, error);
      throw error;
    }
  }

  // 파일 내용 검증 (기본적인 보안 검사)
  private validateFileContent(buffer: Buffer, mimetype: string): void {
    const content = buffer.toString("utf8", 0, Math.min(1024, buffer.length));

    // XML 파일의 경우 XXE 공격 방지를 위한 기본 검사
    if (mimetype.includes("xml")) {
      // 외부 엔티티 참조 검사
      if (content.includes("<!ENTITY") && content.includes("SYSTEM")) {
        throw new SecurityError("외부 엔티티 참조가 포함된 XML 파일은 허용되지 않습니다.");
      }

      // DOCTYPE 선언에서 외부 DTD 참조 검사
      if (content.includes("<!DOCTYPE") && content.includes("SYSTEM")) {
        throw new SecurityError("외부 DTD 참조가 포함된 XML 파일은 허용되지 않습니다.");
      }
    }

    // JSON 파일의 경우 기본 구문 검사
    if (mimetype.includes("json")) {
      try {
        JSON.parse(content);
      } catch {
        // 부분 내용으로 파싱 실패는 정상 (전체 파일이 아니므로)
        // 실제 파싱은 나중에 전체 내용으로 수행
      }
    }
  }

  // 파일 저장 (기존 방식 유지)
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

  // 고급 파일 저장 (새로운 검증 및 처리 포함)
  async saveFileAdvanced(file: Express.Multer.File, options: {
    enableAdvancedValidation?: boolean;
    enableProcessing?: boolean;
    chunkSize?: number;
    compressionEnabled?: boolean;
  } = {}): Promise<UploadedFileInfo> {
    const startTime = Date.now();
    logger.info(`고급 파일 저장 시작: ${file.originalname} (크기: ${file.size} bytes)`);

    try {
      // 기본 검증
      this.validateFile(file);

      // 고급 검증 (선택사항)
      let validationResult: ValidationResult | undefined;
      if (options.enableAdvancedValidation) {
        validationResult = await this.validateFileAdvanced(file);
      }

      const fileId = crypto.randomUUID();
      const filename = `${fileId}_${file.originalname}`;
      const filePath = path.join(TEMP_DIR, filename);

      let finalPath = filePath;
      let finalSize = file.size;
      let processingResult: ProcessingResult | undefined;

      // 파일 처리 (선택사항)
      if (options.enableProcessing) {
        if (file.size > 10 * 1024 * 1024) { // 10MB 이상인 경우 청킹 처리
          logger.info(`대용량 파일 청킹 처리: ${file.originalname}`);
          processingResult = await fileProcessingService.processFileInChunks(
            filePath,
            {
              chunkSize: options.chunkSize || 1024 * 1024, // 1MB 청크
              compressionEnabled: options.compressionEnabled,
              validateStructure: true
            }
          );

          if (processingResult.success && processingResult.outputPath) {
            finalPath = processingResult.outputPath;
            finalSize = processingResult.metadata.processedSize;
          }
        } else {
          // 일반 파일 저장
          await fs.writeFile(filePath, file.buffer);
        }
      } else {
        // 기본 파일 저장
        await fs.writeFile(filePath, file.buffer);
      }

      // 체크섬 계산
      const checksum = await this.calculateChecksum(finalPath);

      const fileInfo: UploadedFileInfo = {
        id: fileId,
        originalName: file.originalname,
        filename,
        path: finalPath,
        size: finalSize,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후 만료
        validationResult,
        processingResult,
        detectedType: validationResult?.metadata?.detectedType,
        checksum
      };

      this.uploadedFiles.set(fileId, fileInfo);

      const processingTime = Date.now() - startTime;
      logger.info(`고급 파일 저장 완료: ${file.originalname} (ID: ${fileId}, 처리시간: ${processingTime}ms)`);

      return fileInfo;

    } catch (error) {
      logger.error(`고급 파일 저장 실패: ${file.originalname}`, error);
      throw error;
    }
  }

  // 파일 정보 조회
  getFileInfo(fileId: string): UploadedFileInfo | undefined {
    return this.uploadedFiles.get(fileId);
  }

  // 파일 내용 읽기
  async readFile(fileId: string): Promise<Buffer> {
    const fileInfo = this.uploadedFiles.get(fileId);
    if (!fileInfo) {
      throw new ValidationError("파일을 찾을 수 없습니다.");
    }

    if (new Date() > fileInfo.expiresAt) {
      await this.deleteFile(fileId);
      throw new ValidationError("파일이 만료되었습니다.");
    }

    try {
      return await fs.readFile(fileInfo.path);
    } catch (error) {
      logger.error(`파일 읽기 실패: ${fileInfo.path}`, error);
      throw new FileUploadError("파일을 읽을 수 없습니다.");
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
    if (process.env.NODE_ENV === "test") {
      return;
    }

    // 1시간마다 만료된 파일 정리
    setInterval(() => {
      this.cleanupExpiredFiles().catch(error => {
        logger.error("파일 정리 중 오류 발생:", error);
      });
    }, 60 * 60 * 1000);
  }

  // 업로드된 파일 목록 조회
  getUploadedFiles(): UploadedFileInfo[] {
    return Array.from(this.uploadedFiles.values());
  }

  // 체크섬 계산
  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      logger.warn(`체크섬 계산 실패: ${filePath}`, error);
      return '';
    }
  }

  // 스트림 기반 파일 읽기
  async createFileStream(fileId: string): Promise<Readable | null> {
    const fileInfo = this.uploadedFiles.get(fileId);
    if (!fileInfo) {
      return null;
    }

    if (new Date() > fileInfo.expiresAt) {
      await this.deleteFile(fileId);
      return null;
    }

    try {
      const { createReadStream } = require('fs');
      return createReadStream(fileInfo.path);
    } catch (error) {
      logger.error(`스트림 생성 실패: ${fileInfo.path}`, error);
      return null;
    }
  }

  // 파일 형식 변환
  async convertFile(
    fileId: string,
    targetFormat: string,
    options: { compressionEnabled?: boolean } = {}
  ): Promise<ProcessingResult> {
    const fileInfo = this.uploadedFiles.get(fileId);
    if (!fileInfo) {
      throw new ValidationError("파일을 찾을 수 없습니다.");
    }

    if (new Date() > fileInfo.expiresAt) {
      await this.deleteFile(fileId);
      throw new ValidationError("파일이 만료되었습니다.");
    }

    const sourceFormat = this.detectFormatFromMimeType(fileInfo.mimetype);
    const outputPath = path.join(TEMP_DIR, `converted_${fileId}_${Date.now()}.${targetFormat}`);

    return await fileProcessingService.convertFileFormat(
      fileInfo.path,
      outputPath,
      sourceFormat,
      targetFormat,
      options
    );
  }

  // MIME 타입으로부터 형식 감지
  private detectFormatFromMimeType(mimetype: string): string {
    const formatMap: Record<string, string> = {
      'application/json': 'json',
      'application/xml': 'xml',
      'text/xml': 'xml',
      'application/x-yaml': 'yaml',
      'text/yaml': 'yaml',
      'text/csv': 'csv',
      'application/csv': 'csv'
    };

    return formatMap[mimetype] || 'unknown';
  }

  // 다중 파일 일괄 처리
  async processBatchFiles(
    files: Express.Multer.File[],
    options: {
      enableAdvancedValidation?: boolean;
      enableProcessing?: boolean;
      maxConcurrent?: number;
    } = {}
  ): Promise<{
    successful: UploadedFileInfo[];
    failed: { file: Express.Multer.File; error: string }[];
  }> {
    const maxConcurrent = options.maxConcurrent || 3;
    const results = {
      successful: [] as UploadedFileInfo[],
      failed: [] as { file: Express.Multer.File; error: string }[]
    };

    // 파일들을 청크로 나누어 병렬 처리
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (file) => {
        try {
          const fileInfo = await this.saveFileAdvanced(file, {
            enableAdvancedValidation: options.enableAdvancedValidation,
            enableProcessing: options.enableProcessing
          });
          results.successful.push(fileInfo);
        } catch (error) {
          results.failed.push({
            file,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
          });
        }
      });

      await Promise.all(batchPromises);
    }

    logger.info(`일괄 파일 처리 완료: 성공 ${results.successful.length}, 실패 ${results.failed.length}`);

    return results;
  }

  // 파일 검증 상태 조회
  getFileValidationStatus(fileId: string): ValidationResult | null {
    const fileInfo = this.uploadedFiles.get(fileId);
    return fileInfo?.validationResult || null;
  }

  // 파일 처리 상태 조회
  getFileProcessingStatus(fileId: string): ProcessingResult | null {
    const fileInfo = this.uploadedFiles.get(fileId);
    return fileInfo?.processingResult || null;
  }
}

// 싱글톤 인스턴스
export const fileUploadService = new FileUploadService();