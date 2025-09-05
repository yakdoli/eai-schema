/**
 * 협업 관리 API v2 라우터
 * 실시간 협업 세션 및 WebSocket 관리
 */

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validationMiddleware } from '../../middleware/validationMiddleware';
import { authMiddleware } from '../../middleware/authMiddleware';
import { CollaborationService } from '../../services/CollaborationService';
import { Logger } from '../../core/logging/Logger';
import { 
  ApiResponse, 
  CreateSessionRequest,
  SessionResponse,
  ActiveUser
} from '../../types/api-v2';

const router = Router();
const logger = new Logger('CollaborationAPIv2');

// 협업 서비스 인스턴스 (실제로는 의존성 주입으로 처리)
let collaborationService: CollaborationService;

// 협업 서비스 초기화 함수
export function initializeCollaborationV2Service(service: CollaborationService) {
  collaborationService = service;
}

/**
 * @swagger
 * tags:
 *   - name: Collaboration
 *     description: 협업 관리 API
 * 
 * /api/v2/collaboration/sessions:
 *   get:
 *     summary: 협업 세션 목록 조회
 *     description: 활성 협업 세션 목록을 페이지네이션과 함께 조회합니다.
 *     tags: [Collaboration]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, expired]
 *         description: 세션 상태 필터
 *       - in: query
 *         name: schemaId
 *         schema:
 *           type: string
 *         description: 스키마 ID 필터
 *     responses:
 *       200:
 *         description: 세션 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SessionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// 활성 세션 목록 조회
router.get('/sessions',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('페이지는 1 이상의 정수여야 합니다'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('제한은 1-100 사이의 정수여야 합니다'),
    query('status').optional().isIn(['active', 'inactive', 'expired']).withMessage('유효하지 않은 상태입니다'),
    query('schemaId').optional().isString().withMessage('스키마 ID는 문자열이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const schemaId = req.query.schemaId as string;

      // 세션 목록 조회 (임시 구현)
      const sessions: SessionResponse[] = [];
      const total = 0;

      const response: ApiResponse<SessionResponse[]> = {
        success: true,
        data: sessions,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('세션 목록 조회 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 새 협업 세션 생성
router.post('/sessions',
  [
    body('schemaId').notEmpty().withMessage('스키마 ID는 필수입니다'),
    body('name').optional().isString().withMessage('세션 이름은 문자열이어야 합니다'),
    body('description').optional().isString().withMessage('설명은 문자열이어야 합니다'),
    body('permissions').optional().isObject().withMessage('권한은 객체여야 합니다'),
    body('expiresAt').optional().isISO8601().withMessage('만료일은 유효한 ISO 8601 형식이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const createRequest: CreateSessionRequest = req.body;
      
      // 세션 생성 로직
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session: SessionResponse = {
        id: sessionId,
        schemaId: createRequest.schemaId,
        name: createRequest.name || `세션 ${sessionId}`,
        description: createRequest.description,
        createdAt: new Date().toISOString(),
        expiresAt: createRequest.expiresAt,
        activeUsers: [],
        permissions: createRequest.permissions || {
          read: true,
          write: true,
          delete: false,
          share: false,
          admin: false
        },
        status: 'active'
      };

      // 협업 서비스에 세션 등록
      if (collaborationService) {
        // 협업 서비스에 세션 등록 (임시 구현)
        // await collaborationService.createSession(sessionId, createRequest.schemaId);
      }

      const response: ApiResponse<SessionResponse> = {
        success: true,
        data: session,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('세션 생성 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 특정 세션 정보 조회
router.get('/sessions/:sessionId',
  [
    param('sessionId').notEmpty().withMessage('세션 ID는 필수입니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      
      // 세션 정보 조회 (임시 구현)
      let activeUsers: ActiveUser[] = [];

      const session: SessionResponse = {
        id: sessionId,
        schemaId: 'schema_123',
        name: `세션 ${sessionId}`,
        description: '협업 세션',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        activeUsers,
        permissions: {
          read: true,
          write: true,
          delete: false,
          share: false,
          admin: false
        },
        status: 'active'
      };

      const response: ApiResponse<SessionResponse> = {
        success: true,
        data: session,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('세션 조회 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 세션 업데이트
router.put('/sessions/:sessionId',
  [
    param('sessionId').notEmpty().withMessage('세션 ID는 필수입니다'),
    body('name').optional().isString().withMessage('세션 이름은 문자열이어야 합니다'),
    body('description').optional().isString().withMessage('설명은 문자열이어야 합니다'),
    body('permissions').optional().isObject().withMessage('권한은 객체여야 합니다'),
    body('expiresAt').optional().isISO8601().withMessage('만료일은 유효한 ISO 8601 형식이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const updateData = req.body;

      // 세션 업데이트 로직
      const updatedSession: SessionResponse = {
        id: sessionId,
        schemaId: 'schema_123',
        name: updateData.name || `세션 ${sessionId}`,
        description: updateData.description,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: updateData.expiresAt,
        activeUsers: [],
        permissions: updateData.permissions || {
          read: true,
          write: true,
          delete: false,
          share: false,
          admin: false
        },
        status: 'active'
      };

      const response: ApiResponse<SessionResponse> = {
        success: true,
        data: updatedSession,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('세션 업데이트 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 세션 삭제/종료
router.delete('/sessions/:sessionId',
  [
    param('sessionId').notEmpty().withMessage('세션 ID는 필수입니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      
      // 세션 종료 로직 (임시 구현)
      // await collaborationService.deleteSession(sessionId);

      const response: ApiResponse = {
        success: true,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('세션 삭제 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 세션에 사용자 참여
router.post('/sessions/:sessionId/join',
  [
    param('sessionId').notEmpty().withMessage('세션 ID는 필수입니다'),
    body('userId').notEmpty().withMessage('사용자 ID는 필수입니다'),
    body('userName').optional().isString().withMessage('사용자 이름은 문자열이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const { userId, userName } = req.body;

      // 세션 참여 로직 (임시 구현)
      // await collaborationService.joinSession(sessionId, userId);

      const response: ApiResponse = {
        success: true,
        data: {
          sessionId,
          userId,
          joinedAt: new Date().toISOString()
        },
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('세션 참여 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 세션에서 사용자 나가기
router.post('/sessions/:sessionId/leave',
  [
    param('sessionId').notEmpty().withMessage('세션 ID는 필수입니다'),
    body('userId').notEmpty().withMessage('사용자 ID는 필수입니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const { userId } = req.body;

      // 세션 나가기 로직 (임시 구현)
      // await collaborationService.leaveSession(sessionId, userId);

      const response: ApiResponse = {
        success: true,
        data: {
          sessionId,
          userId,
          leftAt: new Date().toISOString()
        },
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('세션 나가기 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 세션의 활성 사용자 목록 조회
router.get('/sessions/:sessionId/users',
  [
    param('sessionId').notEmpty().withMessage('세션 ID는 필수입니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      
      // 활성 사용자 조회 (임시 구현)
      let activeUsers: ActiveUser[] = [];

      const response: ApiResponse<ActiveUser[]> = {
        success: true,
        data: activeUsers,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('활성 사용자 조회 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// WebSocket 연결 정보 제공
router.get('/sessions/:sessionId/websocket',
  [
    param('sessionId').notEmpty().withMessage('세션 ID는 필수입니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      
      const wsInfo = {
        url: `/api/v2/collaboration/sessions/${sessionId}/ws`,
        protocols: ['collaboration-v2'],
        events: {
          connect: 'user-connected',
          disconnect: 'user-disconnected',
          gridChange: 'grid-change',
          cursorMove: 'cursor-move',
          selection: 'selection-change',
          error: 'collaboration-error'
        },
        authentication: {
          required: false,
          method: 'query-token'
        }
      };

      const response: ApiResponse = {
        success: true,
        data: wsInfo,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('WebSocket 정보 조회 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

export { router as collaborationRouter };