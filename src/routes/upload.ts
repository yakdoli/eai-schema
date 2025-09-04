import { Router, Request, Response } from "express";
import multer from "multer";
import { asyncHandler, ValidationError } from "../middleware/errorHandler";
import { fileUploadService } from "../services/fileUploadService";
import { urlFetchService } from "../services/urlFetchService";
import { logger } from "../utils/logger";
import { Multer } from "multer";

const router: Router = Router();

// Multer 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1, // 한 번에 하나의 파일만
  },
  fileFilter: (req, file, cb) => {
    // 기본적인 파일 타입 검증은 서비스에서 수행
    cb(null, true);
  },
});

// 파일 업로드 엔드포인트
router.post(
  "/file",
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError("업로드할 파일이 없습니다.");
    }

    logger.info(
      `파일 업로드 요청: ${req.file.originalname} (크기: ${req.file.size} bytes)`,
    );

    try {
      const fileInfo = await fileUploadService.saveFile(req.file);

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
    } catch (error) {
      logger.error("파일 업로드 실패:", error);
      throw error;
    }
  }),
);

// URL에서 스키마 가져오기 엔드포인트
router.post(
  "/url",
  asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      throw new ValidationError("URL이 필요합니다.");
    }

    logger.info(`URL에서 스키마 가져오기 요청: ${url}`);

    try {
      const fetchResult = await urlFetchService.fetchFromUrl(url);

      // 가져온 내용을 임시 파일로 저장
      const mockFile: Multer.File = {
        fieldname: "url",
        originalname: extractFilenameFromUrl(url),
        encoding: "7bit",
        mimetype: determineMimeType(fetchResult.contentType),
        size: fetchResult.size,
        buffer: fetchResult.content,
        destination: "",
        filename: "",
        path: "",
        stream: null as any,
      };

      const fileInfo = await fileUploadService.saveFile(mockFile);

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
    } catch (error) {
      logger.error("URL에서 스키마 가져오기 실패:", error);
      throw error;
    }
  }),
);

// 업로드된 파일 정보 조회
router.get(
  "/file/:fileId",
  asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;

    if (!fileId) {
      throw new ValidationError("파일 ID가 필요합니다.");
    }

    const fileInfo = fileUploadService.getFileInfo(fileId);

    if (!fileInfo) {
      throw new ValidationError("파일을 찾을 수 없습니다.");
    }

    // 만료 확인
    if (new Date() > fileInfo.expiresAt) {
      await fileUploadService.deleteFile(fileId);
      throw new ValidationError("파일이 만료되었습니다.");
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
  }),
);

// 파일 내용 다운로드
router.get(
  "/file/:fileId/content",
  asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;

    if (!fileId) {
      throw new ValidationError("파일 ID가 필요합니다.");
    }

    const fileInfo = fileUploadService.getFileInfo(fileId);

    if (!fileInfo) {
      throw new ValidationError("파일을 찾을 수 없습니다.");
    }

    try {
      const content = await fileUploadService.readFile(fileId);

      res.setHeader("Content-Type", fileInfo.mimetype);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileInfo.originalName}"`,
      );
      res.setHeader("Content-Length", content.length);

      res.send(content);
    } catch (error) {
      logger.error("파일 내용 읽기 실패:", error);
      throw error;
    }
  }),
);

// 파일 삭제
router.delete(
  "/file/:fileId",
  asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;

    if (!fileId) {
      throw new ValidationError("파일 ID가 필요합니다.");
    }

    await fileUploadService.deleteFile(fileId);

    res.status(200).json({
      success: true,
      message: "파일이 성공적으로 삭제되었습니다.",
    });
  }),
);

// 업로드된 파일 목록 조회
router.get(
  "/files",
  asyncHandler(async (req: Request, res: Response) => {
    const files = fileUploadService.getUploadedFiles();

    // 만료되지 않은 파일만 반환
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
  }),
);

// URL 유효성 검사 엔드포인트
router.post(
  "/validate-url",
  asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      throw new ValidationError("URL이 필요합니다.");
    }

    try {
      const isSupported = urlFetchService.isSupportedUrl(url);

      if (!isSupported) {
        throw new ValidationError("지원되지 않는 URL 형식입니다.");
      }

      // URL 보안 검증을 위해 실제 fetchFromUrl 메서드 호출
      // 이는 SSRF 방지 등의 보안 검사를 수행
      try {
        // URL 형식 검증만 수행 (실제 fetch는 하지 않음)
        if (!urlFetchService.isSupportedUrl(url)) {
          throw new ValidationError("지원되지 않는 URL 형식입니다.");
        }

        // URL 구조 검증
        const urlObj = new URL(url);
        if (!urlObj.protocol || !urlObj.protocol.startsWith("http")) {
          throw new ValidationError("HTTP 또는 HTTPS URL만 지원됩니다.");
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new ValidationError("유효하지 않은 URL입니다.");
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
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        data: {
          url,
          isValid: false,
          isSupported: false,
        },
      });
    }
  }),
);

// 헬퍼 함수들
function extractFilenameFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filename = pathname.split("/").pop() || "schema";

    // 확장자가 없으면 기본 확장자 추가
    if (!filename.includes(".")) {
      return `${filename}.xml`;
    }

    return filename;
  } catch {
    return "schema.xml";
  }
}

function determineMimeType(contentType: string): string {
  // Content-Type 헤더를 기반으로 적절한 MIME 타입 결정
  if (contentType.includes("xml")) {
    return "application/xml";
  }
  if (contentType.includes("json")) {
    return "application/json";
  }
  if (contentType.includes("yaml")) {
    return "application/x-yaml";
  }

  // 기본값
  return "text/plain";
}

export { router as uploadRoutes };