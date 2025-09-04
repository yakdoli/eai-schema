import { Readable } from "stream";
import { ValidationResult } from "./FileValidationService";
import { ProcessingResult } from "./FileProcessingService";
export interface UploadedFileInfo {
    id: string;
    originalName: string;
    filename: string;
    path: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
    expiresAt: Date;
    validationResult?: ValidationResult;
    processingResult?: ProcessingResult;
    detectedType?: string;
    checksum?: string;
}
export declare class FileUploadService {
    private uploadedFiles;
    constructor();
    private ensureTempDirectory;
    validateFile(file: Express.Multer.File): void;
    validateFileAdvanced(file: Express.Multer.File): Promise<ValidationResult>;
    private validateFileContent;
    saveFile(file: Express.Multer.File): Promise<UploadedFileInfo>;
    saveFileAdvanced(file: Express.Multer.File, options?: {
        enableAdvancedValidation?: boolean;
        enableProcessing?: boolean;
        chunkSize?: number;
        compressionEnabled?: boolean;
    }): Promise<UploadedFileInfo>;
    getFileInfo(fileId: string): UploadedFileInfo | undefined;
    readFile(fileId: string): Promise<Buffer>;
    deleteFile(fileId: string): Promise<void>;
    private cleanupExpiredFiles;
    private startCleanupTimer;
    getUploadedFiles(): UploadedFileInfo[];
    private calculateChecksum;
    createFileStream(fileId: string): Promise<Readable | null>;
    convertFile(fileId: string, targetFormat: string, options?: {
        compressionEnabled?: boolean;
    }): Promise<ProcessingResult>;
    private detectFormatFromMimeType;
    processBatchFiles(files: Express.Multer.File[], options?: {
        enableAdvancedValidation?: boolean;
        enableProcessing?: boolean;
        maxConcurrent?: number;
    }): Promise<{
        successful: UploadedFileInfo[];
        failed: {
            file: Express.Multer.File;
            error: string;
        }[];
    }>;
    getFileValidationStatus(fileId: string): ValidationResult | null;
    getFileProcessingStatus(fileId: string): ProcessingResult | null;
}
export declare const fileUploadService: FileUploadService;
//# sourceMappingURL=fileUploadService.d.ts.map