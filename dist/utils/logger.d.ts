export declare const logger: {
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
    logRequest: (method: string, url: string, statusCode: number, duration: number, requestId: string, userId?: string) => void;
    logPerformance: (operation: string, duration: number, metadata?: Record<string, any>) => void;
    logSecurityEvent: (event: string, severity: "low" | "medium" | "high" | "critical", metadata?: Record<string, any>) => void;
    logBusinessEvent: (event: string, metadata?: Record<string, any>) => void;
};
export { Logger } from "../core/logging/Logger";
//# sourceMappingURL=logger.d.ts.map