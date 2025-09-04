import { Request, Response, NextFunction } from "express";
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare const errorHandler: (error: AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare class ValidationError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class FileUploadError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class SecurityError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class NetworkError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
//# sourceMappingURL=errorHandler.d.ts.map