import { ErrorHandler } from "../core/errors/ErrorHandler";
declare const errorHandler: ErrorHandler;
export declare const legacyErrorHandler: (error: Error, req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => void;
export { errorHandler };
export { ValidationError, FileProcessingError as FileUploadError, AuthorizationError as SecurityError, InternalServerError as NetworkError } from "../types/errors";
export { asyncHandler } from "../core/utils/asyncHandler";
//# sourceMappingURL=errorHandler.d.ts.map