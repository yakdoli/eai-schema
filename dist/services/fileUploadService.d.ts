export interface UploadedFileInfo {
    id: string;
    originalName: string;
    filename: string;
    path: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
    expiresAt: Date;
}
export declare class FileUploadService {
    private uploadedFiles;
    constructor();
    private ensureTempDirectory;
    validateFile(file: Express.Multer.File): void;
    private validateFileContent;
    saveFile(file: Express.Multer.File): Promise<UploadedFileInfo>;
    getFileInfo(fileId: string): UploadedFileInfo | undefined;
    readFile(fileId: string): Promise<Buffer>;
    deleteFile(fileId: string): Promise<void>;
    private cleanupExpiredFiles;
    private startCleanupTimer;
    getUploadedFiles(): UploadedFileInfo[];
}
export declare const fileUploadService: FileUploadService;
//# sourceMappingURL=fileUploadService.d.ts.map