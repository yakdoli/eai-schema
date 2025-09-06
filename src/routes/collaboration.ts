import express from "express";
import { CollaborationService } from "../services/CollaborationService";
import { Logger } from "../core/logging/Logger";
import { asyncHandler } from "../core/utils/asyncHandler";
import { ValidationError } from "../types/errors";
import { ErrorHandler } from "../core/errors/ErrorHandler";

const router = express.Router();
const logger = new Logger('CollaborationRouter');
const errorHandler = new ErrorHandler(logger);

// 협업 서비스 인스턴스 (실제로는 DI 컨테이너에서 주입받아야 함)
let collaborationService: CollaborationService;

/**
 * 협업 서비스 초기화
 */
export function initializeCollaborationService(service: CollaborationService): void {
  collaborationService = service;
}

/**
 * 협업 세션 생성
 */
router.post('/sessions', asyncHandler(async (req, res) => {
  const { sessionId, createdBy } = req.body;
  
  if (!sessionId || !createdBy) {
    throw new ValidationError('sessionId와 createdBy는 필수입니다');
  }

  const session = await collaborationService.createSession(sessionId, createdBy);
  
  res.status(201).json({
    success: true,
    data: session
  });
}));

/**
 * 협업 세션 정보 조회
 */
router.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    throw new ValidationError('sessionId는 필수입니다');
  }

  const session = collaborationService.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: '세션을 찾을 수 없습니다'
    });
  }

  return res.json({
    success: true,
    data: session
  });
}));

/**
 * 세션의 활성 사용자 목록 조회
 */
router.get('/sessions/:sessionId/users', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    throw new ValidationError('sessionId는 필수입니다');
  }

  const activeUsers = await collaborationService.getActiveUsers(sessionId);
  
  res.json({
    success: true,
    data: activeUsers
  });
}));

/**
 * 세션 참가
 */
router.post('/sessions/:sessionId/join', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  
  if (!sessionId || !userId) {
    throw new ValidationError('sessionId와 userId는 필수입니다');
  }

  await collaborationService.joinSession(sessionId, userId);
  
  res.json({
    success: true,
    message: '세션에 성공적으로 참가했습니다'
  });
}));

/**
 * 세션 떠나기
 */
router.post('/sessions/:sessionId/leave', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  
  if (!sessionId || !userId) {
    throw new ValidationError('sessionId와 userId는 필수입니다');
  }

  await collaborationService.leaveSession(sessionId, userId);
  
  res.json({
    success: true,
    message: '세션에서 성공적으로 나갔습니다'
  });
}));

/**
 * 세션 삭제
 */
router.delete('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    throw new ValidationError('sessionId는 필수입니다');
  }

  await collaborationService.destroySession(sessionId);
  
  res.json({
    success: true,
    message: '세션이 성공적으로 삭제되었습니다'
  });
}));

/**
 * 모든 활성 세션 조회
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const sessions = collaborationService.getActiveSessions();
  
  res.json({
    success: true,
    data: sessions
  });
}));

/**
 * 그리드 변경사항 브로드캐스트 (REST API 버전)
 */
router.post('/sessions/:sessionId/changes', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const change = req.body;
  
  if (!sessionId) {
    throw new ValidationError('sessionId는 필수입니다');
  }

  if (!change || !change.userId || !change.type) {
    throw new ValidationError('변경사항 데이터가 올바르지 않습니다');
  }

  // 변경사항에 세션 ID와 타임스탬프 추가
  change.sessionId = sessionId;
  change.timestamp = Date.now();
  change.id = change.id || Date.now().toString(36) + Math.random().toString(36).substr(2);

  await collaborationService.broadcastChange(sessionId, change);
  
  res.json({
    success: true,
    message: '변경사항이 성공적으로 브로드캐스트되었습니다'
  });
}));

// 에러 핸들링 미들웨어 추가
router.use(errorHandler.handleError);

export default router;