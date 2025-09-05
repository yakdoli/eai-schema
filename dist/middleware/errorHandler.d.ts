import { Request, Response, NextFunction } from "express";
export declare const legacyErrorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
export { ValidationError, FileProcessingError as FileUploadError, AuthorizationError as SecurityError, InternalServerError as NetworkError } from "../types/errors";
export { asyncHandler } from "../core/utils/asyncHandler";
//# sourceMappingURL=errorHandler.d.ts.map