"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const errorHandler_1 = require("../middleware/errorHandler");
const fileUploadService_1 = require("../services/fileUploadService");
const urlFetchService_1 = require("../services/urlFetchService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.uploadRoutes = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        cb(null, true);
    },
});
router.post("/file", upload.single("file"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new errorHandler_1.ValidationError("업로드할 파일이 없습니다.");
    }
    logger_1.logger.info(`파일 업로드 요청: ${req.file.originalname} (크기: ${req.file.size} bytes)`);
    try {
        const fileInfo = await fileUploadService_1.fileUploadService.saveFile(req.file);
        res.status(200).json({
            success: true,
            message: "파일이 성공적으로 업로드되었습니다.",
            data: {
                fileId: fileInfo.id,
                originalName: fileInfo.originalName,
                size: fileInfo.size,
                mimetype: fileInfo.mimetype,
                uploadedAt: fileInfo.uploadedAt,
                expiresAt: fileInfo.expiresAt,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("파일 업로드 실패:", error);
        throw error;
    }
}));
router.post("/url", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
        throw new errorHandler_1.ValidationError("URL이 필요합니다.");
    }
    logger_1.logger.info(`URL에서 스키마 가져오기 요청: ${url}`);
    try {
        const fetchResult = await urlFetchService_1.urlFetchService.fetchFromUrl(url);
        const mockFile = {
            fieldname: "url",
            originalname: extractFilenameFromUrl(url),
            encoding: "7bit",
            mimetype: determineMimeType(fetchResult.contentType),
            size: fetchResult.size,
            buffer: fetchResult.content,
            destination: "",
            filename: "",
            path: "",
            stream: null,
        };
        const fileInfo = await fileUploadService_1.fileUploadService.saveFile(mockFile);
        res.status(200).json({
            success: true,
            message: "URL에서 스키마를 성공적으로 가져왔습니다.",
            data: {
                fileId: fileInfo.id,
                originalName: fileInfo.originalName,
                size: fileInfo.size,
                mimetype: fileInfo.mimetype,
                sourceUrl: url,
                uploadedAt: fileInfo.uploadedAt,
                expiresAt: fileInfo.expiresAt,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("URL에서 스키마 가져오기 실패:", error);
        throw error;
    }
}));
router.get("/file/:fileId", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { fileId } = req.params;
    if (!fileId) {
        throw new errorHandler_1.ValidationError("파일 ID가 필요합니다.");
    }
    const fileInfo = fileUploadService_1.fileUploadService.getFileInfo(fileId);
    if (!fileInfo) {
        throw new errorHandler_1.ValidationError("파일을 찾을 수 없습니다.");
    }
    if (new Date() > fileInfo.expiresAt) {
        await fileUploadService_1.fileUploadService.deleteFile(fileId);
        throw new errorHandler_1.ValidationError("파일이 만료되었습니다.");
    }
    res.status(200).json({
        success: true,
        data: {
            fileId: fileInfo.id,
            originalName: fileInfo.originalName,
            size: fileInfo.size,
            mimetype: fileInfo.mimetype,
            uploadedAt: fileInfo.uploadedAt,
            expiresAt: fileInfo.expiresAt,
        },
    });
}));
router.get("/file/:fileId/content", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { fileId } = req.params;
    if (!fileId) {
        throw new errorHandler_1.ValidationError("파일 ID가 필요합니다.");
    }
    const fileInfo = fileUploadService_1.fileUploadService.getFileInfo(fileId);
    if (!fileInfo) {
        throw new errorHandler_1.ValidationError("파일을 찾을 수 없습니다.");
    }
    try {
        const content = await fileUploadService_1.fileUploadService.readFile(fileId);
        res.setHeader("Content-Type", fileInfo.mimetype);
        res.setHeader("Content-Disposition", `attachment; filename="${fileInfo.originalName}"`);
        res.setHeader("Content-Length", content.length);
        res.send(content);
    }
    catch (error) {
        logger_1.logger.error("파일 내용 읽기 실패:", error);
        throw error;
    }
}));
router.delete("/file/:fileId", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { fileId } = req.params;
    if (!fileId) {
        throw new errorHandler_1.ValidationError("파일 ID가 필요합니다.");
    }
    await fileUploadService_1.fileUploadService.deleteFile(fileId);
    res.status(200).json({
        success: true,
        message: "파일이 성공적으로 삭제되었습니다.",
    });
}));
router.get("/files", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const files = fileUploadService_1.fileUploadService.getUploadedFiles();
    const validFiles = files.filter((file) => new Date() <= file.expiresAt);
    res.status(200).json({
        success: true,
        data: validFiles.map((file) => ({
            fileId: file.id,
            originalName: file.originalName,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: file.uploadedAt,
            expiresAt: file.expiresAt,
        })),
    });
}));
router.post("/validate-url", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
        throw new errorHandler_1.ValidationError("URL이 필요합니다.");
    }
    try {
        const isSupported = urlFetchService_1.urlFetchService.isSupportedUrl(url);
        if (!isSupported) {
            throw new errorHandler_1.ValidationError("지원되지 않는 URL 형식입니다.");
        }
        try {
            if (!urlFetchService_1.urlFetchService.isSupportedUrl(url)) {
                throw new errorHandler_1.ValidationError("지원되지 않는 URL 형식입니다.");
            }
            const urlObj = new URL(url);
            if (!urlObj.protocol || !urlObj.protocol.startsWith("http")) {
                throw new errorHandler_1.ValidationError("HTTP 또는 HTTPS URL만 지원됩니다.");
            }
        }
        catch (error) {
            if (error instanceof errorHandler_1.ValidationError) {
                throw error;
            }
            throw new errorHandler_1.ValidationError("유효하지 않은 URL입니다.");
        }
        res.status(200).json({
            success: true,
            message: "유효한 URL입니다.",
            data: {
                url,
                isValid: true,
                isSupported: true,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "알 수 없는 오류가 발생했습니다.",
            data: {
                url,
                isValid: false,
                isSupported: false,
            },
        });
    }
}));
function extractFilenameFromUrl(url) {
    try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;
        const filename = pathname.split("/").pop() || "schema";
        if (!filename.includes(".")) {
            return `${filename}.xml`;
        }
        return filename;
    }
    catch {
        return "schema.xml";
    }
}
function determineMimeType(contentType) {
    if (contentType.includes("xml")) {
        return "application/xml";
    }
    if (contentType.includes("json")) {
        return "application/json";
    }
    if (contentType.includes("yaml")) {
        return "application/x-yaml";
    }
    return "text/plain";
}
//# sourceMappingURL=upload.js.map