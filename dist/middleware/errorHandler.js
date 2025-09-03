"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkError = exports.SecurityError = exports.FileUploadError = exports.ValidationError = exports.asyncHandler = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (error, req, res, next) => {
    logger_1.logger.error('에러 발생:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    const statusCode = error.statusCode || 500;
    const errorResponse = {
        error: {
            message: error.message || '내부 서버 오류가 발생했습니다.',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
    };
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
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class FileUploadError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.isOperational = true;
        this.name = 'FileUploadError';
    }
}
exports.FileUploadError = FileUploadError;
class SecurityError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 403;
        this.isOperational = true;
        this.name = 'SecurityError';
    }
}
exports.SecurityError = SecurityError;
class NetworkError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 502;
        this.isOperational = true;
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
//# sourceMappingURL=errorHandler.js.map