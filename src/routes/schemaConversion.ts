import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SchemaConversionService } from '../services/SchemaConversionService';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const schemaConversionService = new SchemaConversionService();

/**
 * 스키마 변환 API
 * POST /api/convert
 */
router.post('/convert', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { format, targetFormat } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: '파일을 선택해주세요'
      });
    }

    if (!format || !targetFormat) {
      return res.status(400).json({
        success: false,
        error: '변환 형식을 지정해주세요'
      });
    }

    const content = file.buffer.toString('utf-8');
    
    // 스키마 변환 수행
    const result = await schemaConversionService.convertSchema(
      content,
      format,
      targetFormat
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('스키마 변환 중 오류 발생:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '스키마 변환 중 오류가 발생했습니다'
    });
  }
});

/**
 * 스키마 검증 API
 * POST /api/validate
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { schema, format } = req.body;

    if (!schema || !format) {
      return res.status(400).json({
        success: false,
        error: '스키마와 형식을 지정해주세요'
      });
    }

    // 스키마 검증 수행
    const validationResult = await schemaConversionService.validateSchema(
      schema,
      format
    );

    res.json({
      success: true,
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings
    });

  } catch (error) {
    logger.error('스키마 검증 중 오류 발생:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '스키마 검증 중 오류가 발생했습니다'
    });
  }
});

/**
 * URL에서 스키마 가져오기 API
 * POST /api/fetch-schema
 */
router.post('/fetch-schema', async (req: Request, res: Response) => {
  try {
    const { url, format } = req.body;

    if (!url || !format) {
      return res.status(400).json({
        success: false,
        error: 'URL과 형식을 지정해주세요'
      });
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 URL입니다'
      });
    }

    // URL에서 스키마 가져오기
    const schema = await schemaConversionService.fetchSchemaFromUrl(url, format);

    res.json({
      success: true,
      schema
    });

  } catch (error) {
    logger.error('URL에서 스키마 가져오기 중 오류 발생:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'URL에서 스키마를 가져오는 중 오류가 발생했습니다'
    });
  }
});

export { router as schemaConversionRoutes };