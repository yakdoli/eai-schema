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
    constructor() {
        this.uploadedFiles = new Map();
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
            catch (error) {
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
}
exports.FileUploadService = FileUploadService;
exports.fileUploadService = new FileUploadService();
//# sourceMappingURL=fileUploadService.js.map