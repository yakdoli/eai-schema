"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.NetworkError = exports.SecurityError = exports.FileUploadError = exports.ValidationError = exports.legacyErrorHandler = void 0;
const ErrorHandler_1 = require("../core/errors/ErrorHandler");
const Logger_1 = require("../core/logging/Logger");
const logger = new Logger_1.Logger();
const errorHandler = new ErrorHandler_1.ErrorHandler(logger);
exports.legacyErrorHandler = errorHandler.handleError;
var errors_1 = require("../types/errors");
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
Object.defineProperty(exports, "FileUploadError", { enumerable: true, get: function () { return errors_1.FileProcessingError; } });
Object.defineProperty(exports, "SecurityError", { enumerable: true, get: function () { return errors_1.AuthorizationError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return errors_1.InternalServerError; } });
var asyncHandler_1 = require("../core/utils/asyncHandler");
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return asyncHandler_1.asyncHandler; } });
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