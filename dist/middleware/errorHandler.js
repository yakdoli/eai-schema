"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkError = exports.SecurityError = exports.FileUploadError = exports.ValidationError = exports.asyncHandler = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (error, req, res, next) => {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger_1.logger.error("에러 발생:", {
        errorId,
        message: error.message,
        stack: error.stack,
        name: error.name,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        body: req.method !== 'GET' ? JSON.stringify(req.body).substring(0, 500) : undefined,
        query: req.query,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
    const statusCode = error.statusCode || 500;
    const userMessage = getUserFriendlyMessage(error);
    const errorResponse = {
        success: false,
        error: {
            message: userMessage,
            errorId,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === "development" && {
                stack: error.stack,
                originalMessage: error.message
            })
        }
    };
    if (error.name === 'ValidationError') {
        errorResponse.error.type = 'VALIDATION_ERROR';
    }
    else if (error.name === 'FileUploadError') {
        errorResponse.error.type = 'FILE_UPLOAD_ERROR';
    }
    else if (error.name === 'SecurityError') {
        errorResponse.error.type = 'SECURITY_ERROR';
    }
    else if (error.name === 'NetworkError') {
        errorResponse.error.type = 'NETWORK_ERROR';
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.isOperational = true;
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
class FileUploadError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.isOperational = true;
        this.name = "FileUploadError";
    }
}
exports.FileUploadError = FileUploadError;
class SecurityError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 403;
        this.isOperational = true;
        this.name = "SecurityError";
    }
}
exports.SecurityError = SecurityError;
class NetworkError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 502;
        this.isOperational = true;
        this.name = "NetworkError";
    }
}
exports.NetworkError = NetworkError;
function getUserFriendlyMessage(error) {
    const errorMessages = {
        'ValidationError': '입력 데이터가 올바르지 않습니다. 다시 확인해주세요.',
        'FileUploadError': '파일 업로드 중 문제가 발생했습니다. 파일 형식과 크기를 확인해주세요.',
        'SecurityError': '보안 정책 위반이 감지되었습니다. 다른 파일을 시도해주세요.',
        'NetworkError': '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
        'SyntaxError': '데이터 형식이 올바르지 않습니다. JSON/XML 형식을 확인해주세요.',
        'TypeError': '데이터 타입이 올바르지 않습니다.',
        'ReferenceError': '필요한 데이터가 누락되었습니다.',
        'RangeError': '데이터 값이 허용 범위를 벗어났습니다.',
    };
    if (error.name && errorMessages[error.name]) {
        return errorMessages[error.name];
    }
    if (error.message) {
        const message = error.message.length > 100
            ? error.message.substring(0, 100) + '...'
            : error.message;
        return message
            .replace(/password[^&]*/gi, '***')
            .replace(/token[^&]*/gi, '***')
            .replace(/key[^&]*/gi, '***');
    }
    return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}
//# sourceMappingURL=errorHandler.js.map