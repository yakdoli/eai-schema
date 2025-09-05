"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploadService = exports.FileUploadService = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const FileValidationService_1 = require("./FileValidationService");
const FileProcessingService_1 = require("./FileProcessingService");
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
const ALLOWED_EXTENSIONS = [
    ".xml",
    ".wsdl",
    ".xsd",
    ".json",
    ".yaml",
    ".yml",
    ".txt"
];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const TEMP_DIR = path_1.default.join(process.cwd(), "temp");
class FileUploadService {
    uploadedFiles = new Map();
    constructor() {
        this.ensureTempDirectory();
        this.startCleanupTimer();
    }
    async ensureTempDirectory() {
        try {
            await promises_1.default.access(TEMP_DIR);
        }
        catch {
            await promises_1.default.mkdir(TEMP_DIR, { recursive: true });
            logger_1.logger.info(`임시 디렉토리 생성: ${TEMP_DIR}`);
        }
    }
    validateFile(file) {
        if (file.size > MAX_FILE_SIZE) {
            throw new errorHandler_1.FileUploadError(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 허용됩니다.`);
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new errorHandler_1.FileUploadError(`지원되지 않는 파일 타입입니다. 허용된 타입: ${ALLOWED_MIME_TYPES.join(", ")}`);
        }
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            throw new errorHandler_1.FileUploadError(`지원되지 않는 파일 확장자입니다. 허용된 확장자: ${ALLOWED_EXTENSIONS.join(", ")}`);
        }
        this.validateFileContent(file.buffer, file.mimetype);
    }
    async validateFileAdvanced(file) {
        logger_1.logger.info(`고급 파일 검증 시작: ${file.originalname}`);
        try {
            const validationResult = await FileValidationService_1.fileValidationService.validateFile(file.buffer, file.originalname, file.mimetype);
            if (!validationResult.isValid) {
                const errorMessage = validationResult.errors.join("; ");
                throw new errorHandler_1.FileUploadError(`파일 검증 실패: ${errorMessage}`);
            }
            if (validationResult.warnings.length > 0) {
                logger_1.logger.warn(`파일 검증 경고: ${file.originalname}`, {
                    warnings: validationResult.warnings
                });
            }
            return validationResult;
        }
        catch (error) {
            logger_1.logger.error(`고급 파일 검증 실패: ${file.originalname}`, error);
            throw error;
        }
    }
    validateFileContent(buffer, mimetype) {
        const content = buffer.toString("utf8", 0, Math.min(1024, buffer.length));
        if (mimetype.includes("xml")) {
            if (content.includes("<!ENTITY") && content.includes("SYSTEM")) {
                throw new errorHandler_1.SecurityError("외부 엔티티 참조가 포함된 XML 파일은 허용되지 않습니다.");
            }
            if (content.includes("<!DOCTYPE") && content.includes("SYSTEM")) {
                throw new errorHandler_1.SecurityError("외부 DTD 참조가 포함된 XML 파일은 허용되지 않습니다.");
            }
        }
        if (mimetype.includes("json")) {
            try {
                JSON.parse(content);
            }
            catch {
            }
        }
    }
    async saveFile(file) {
        this.validateFile(file);
        const fileId = crypto_1.default.randomUUID();
        const filename = `${fileId}_${file.originalname}`;
        const filePath = path_1.default.join(TEMP_DIR, filename);
        await promises_1.default.writeFile(filePath, file.buffer);
        const fileInfo = {
            id: fileId,
            originalName: file.originalname,
            filename,
            path: filePath,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
        this.uploadedFiles.set(fileId, fileInfo);
        logger_1.logger.info(`파일 업로드 완료: ${file.originalname} (ID: ${fileId})`);
        return fileInfo;
    }
    async saveFileAdvanced(file, options = {}) {
        const startTime = Date.now();
        logger_1.logger.info(`고급 파일 저장 시작: ${file.originalname} (크기: ${file.size} bytes)`);
        try {
            this.validateFile(file);
            let validationResult;
            if (options.enableAdvancedValidation) {
                validationResult = await this.validateFileAdvanced(file);
            }
            const fileId = crypto_1.default.randomUUID();
            const filename = `${fileId}_${file.originalname}`;
            const filePath = path_1.default.join(TEMP_DIR, filename);
            let finalPath = filePath;
            let finalSize = file.size;
            let processingResult;
            if (options.enableProcessing) {
                if (file.size > 10 * 1024 * 1024) {
                    logger_1.logger.info(`대용량 파일 청킹 처리: ${file.originalname}`);
                    processingResult = await FileProcessingService_1.fileProcessingService.processFileInChunks(filePath, {
                        chunkSize: options.chunkSize || 1024 * 1024,
                        compressionEnabled: options.compressionEnabled,
                        validateStructure: true
                    });
                    if (processingResult.success && processingResult.outputPath) {
                        finalPath = processingResult.outputPath;
                        finalSize = processingResult.metadata.processedSize;
                    }
                }
                else {
                    await promises_1.default.writeFile(filePath, file.buffer);
                }
            }
            else {
                await promises_1.default.writeFile(filePath, file.buffer);
            }
            const checksum = await this.calculateChecksum(finalPath);
            const fileInfo = {
                id: fileId,
                originalName: file.originalname,
                filename,
                path: finalPath,
                size: finalSize,
                mimetype: file.mimetype,
                uploadedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                validationResult,
                processingResult,
                detectedType: validationResult?.metadata?.detectedType,
                checksum
            };
            this.uploadedFiles.set(fileId, fileInfo);
            const processingTime = Date.now() - startTime;
            logger_1.logger.info(`고급 파일 저장 완료: ${file.originalname} (ID: ${fileId}, 처리시간: ${processingTime}ms)`);
            return fileInfo;
        }
        catch (error) {
            logger_1.logger.error(`고급 파일 저장 실패: ${file.originalname}`, error);
            throw error;
        }
    }
    getFileInfo(fileId) {
        return this.uploadedFiles.get(fileId);
    }
    async readFile(fileId) {
        const fileInfo = this.uploadedFiles.get(fileId);
        if (!fileInfo) {
            throw new errorHandler_1.ValidationError("파일을 찾을 수 없습니다.");
        }
        if (new Date() > fileInfo.expiresAt) {
            await this.deleteFile(fileId);
            throw new errorHandler_1.ValidationError("파일이 만료되었습니다.");
        }
        try {
            return await promises_1.default.readFile(fileInfo.path);
        }
        catch (error) {
            logger_1.logger.error(`파일 읽기 실패: ${fileInfo.path}`, error);
            throw new errorHandler_1.FileUploadError("파일을 읽을 수 없습니다.");
        }
    }
    async deleteFile(fileId) {
        const fileInfo = this.uploadedFiles.get(fileId);
        if (!fileInfo) {
            return;
        }
        try {
            await promises_1.default.unlink(fileInfo.path);
            this.uploadedFiles.delete(fileId);
            logger_1.logger.info(`파일 삭제 완료: ${fileInfo.originalName} (ID: ${fileId})`);
        }
        catch (error) {
            logger_1.logger.error(`파일 삭제 실패: ${fileInfo.path}`, error);
        }
    }
    async cleanupExpiredFiles() {
        const now = new Date();
        const expiredFiles = [];
        for (const [fileId, fileInfo] of this.uploadedFiles.entries()) {
            if (now > fileInfo.expiresAt) {
                expiredFiles.push(fileId);
            }
        }
        for (const fileId of expiredFiles) {
            await this.deleteFile(fileId);
        }
        if (expiredFiles.length > 0) {
            logger_1.logger.info(`만료된 파일 ${expiredFiles.length}개 정리 완료`);
        }
    }
    startCleanupTimer() {
        if (process.env.NODE_ENV === "test") {
            return;
        }
        setInterval(() => {
            this.cleanupExpiredFiles().catch(error => {
                logger_1.logger.error("파일 정리 중 오류 발생:", error);
            });
        }, 60 * 60 * 1000);
    }
    getUploadedFiles() {
        return Array.from(this.uploadedFiles.values());
    }
    async calculateChecksum(filePath) {
        try {
            const content = await promises_1.default.readFile(filePath);
            return crypto_1.default.createHash('sha256').update(content).digest('hex');
        }
        catch (error) {
            logger_1.logger.warn(`체크섬 계산 실패: ${filePath}`, error);
            return '';
        }
    }
    async createFileStream(fileId) {
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
        }
        catch (error) {
            logger_1.logger.error(`스트림 생성 실패: ${fileInfo.path}`, error);
            return null;
        }
    }
    async convertFile(fileId, targetFormat, options = {}) {
        const fileInfo = this.uploadedFiles.get(fileId);
        if (!fileInfo) {
            throw new errorHandler_1.ValidationError("파일을 찾을 수 없습니다.");
        }
        if (new Date() > fileInfo.expiresAt) {
            await this.deleteFile(fileId);
            throw new errorHandler_1.ValidationError("파일이 만료되었습니다.");
        }
        const sourceFormat = this.detectFormatFromMimeType(fileInfo.mimetype);
        const outputPath = path_1.default.join(TEMP_DIR, `converted_${fileId}_${Date.now()}.${targetFormat}`);
        return await FileProcessingService_1.fileProcessingService.convertFileFormat(fileInfo.path, outputPath, sourceFormat, targetFormat, options);
    }
    detectFormatFromMimeType(mimetype) {
        const formatMap = {
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
    async processBatchFiles(files, options = {}) {
        const maxConcurrent = options.maxConcurrent || 3;
        const results = {
            successful: [],
            failed: []
        };
        for (let i = 0; i < files.length; i += maxConcurrent) {
            const batch = files.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(async (file) => {
                try {
                    const fileInfo = await this.saveFileAdvanced(file, {
                        enableAdvancedValidation: options.enableAdvancedValidation,
                        enableProcessing: options.enableProcessing
                    });
                    results.successful.push(fileInfo);
                }
                catch (error) {
                    results.failed.push({
                        file,
                        error: error instanceof Error ? error.message : '알 수 없는 오류'
                    });
                }
            });
            await Promise.all(batchPromises);
        }
        logger_1.logger.info(`일괄 파일 처리 완료: 성공 ${results.successful.length}, 실패 ${results.failed.length}`);
        return results;
    }
    getFileValidationStatus(fileId) {
        const fileInfo = this.uploadedFiles.get(fileId);
        return fileInfo?.validationResult || null;
    }
    getFileProcessingStatus(fileId) {
        const fileInfo = this.uploadedFiles.get(fileId);
        return fileInfo?.processingResult || null;
    }
}
exports.FileUploadService = FileUploadService;
exports.fileUploadService = new FileUploadService();
//# sourceMappingURL=fileUploadService.js.map