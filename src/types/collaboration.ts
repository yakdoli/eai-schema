// 협업 관련 타입 정의

/**
 * CollaborationManager 인터페이스 - 실시간 협업 시스템의 핵심 인터페이스
 */
export interface CollaborationManager {
  joinSession(sessionId: string, userId: string): Promise<void>;
  leaveSession(sessionId: string, userId: string): Promise<void>;
  broadcastChange(sessionId: string, change: GridChange): Promise<void>;
  getActiveUsers(sessionId: string): Promise<ActiveUser[]>;
  createSession(sessionId: string, createdBy: string): Promise<CollaborationSession>;
  destroySession(sessionId: string): Promise<void>;
  handleConflict(sessionId: string, conflict: EditConflict): Promise<ConflictResolution>;
}

/**
 * 협업 세션 정보
 */
export interface CollaborationSession {
  id: string;
  schemaId: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  activeUsers: ActiveUser[];
  isActive: boolean;
  settings: SessionSettings;
  lastActivity: Date;
}

/**
 * 활성 사용자 정보
 */
export interface ActiveUser {
  id: string;
  name: string;
  email?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  color: string;
  joinedAt: Date;
  lastActivity: Date;
  permissions: UserPermission[];
  isOnline: boolean;
}

/**
 * 커서 위치
 */
export interface CursorPosition {
  row: number;
  col: number;
}

/**
 * 선택 영역
 */
export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/**
 * 사용자 권한
 */
export interface UserPermission {
  action: 'read' | 'write' | 'delete' | 'share' | 'admin';
  granted: boolean;
}

/**
 * 세션 설정
 */
export interface SessionSettings {
  maxUsers: number;
  allowAnonymous: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  conflictResolution: 'last-write-wins' | 'merge' | 'manual';
  enableCursorSync: boolean;
  enableSelectionSync: boolean;
}

/**
 * 그리드 변경 이벤트
 */
export interface GridChange {
  id: string;
  type: 'cell-update' | 'row-insert' | 'row-delete' | 'column-insert' | 'column-delete' | 'structure-change';
  position: CursorPosition;
  oldValue?: any;
  newValue?: any;
  userId: string;
  timestamp: number;
  metadata?: Record<string, any>;
  sessionId: string;
}

/**
 * 편집 충돌 정보
 */
export interface EditConflict {
  id: string;
  sessionId: string;
  position: CursorPosition;
  conflictingChanges: GridChange[];
  timestamp: number;
}

/**
 * 충돌 해결 결과
 */
export interface ConflictResolution {
  conflictId: string;
  resolution: 'accept-local' | 'accept-remote' | 'merge' | 'manual';
  resolvedValue?: any;
  timestamp: number;
}

/**
 * 사용자 세션
 */
export interface UserSession {
  id: string;
  userId: string;
  schemaId: string;
  startTime: Date;
  lastActivity: Date;
  permissions: UserPermission[];
  preferences: UserPreferences;
}

/**
 * 사용자 환경설정
 */
export interface UserPreferences {
  gridTheme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  autoSaveInterval: number;
  showGridLines: boolean;
  showRowNumbers: boolean;
  showColumnHeaders: boolean;
  language: string;
  cursorColor?: string;
  selectionColor?: string;
}

/**
 * WebSocket 이벤트 타입
 */
export type CollaborationEventType = 
  | 'user-joined'
  | 'user-left'
  | 'user-disconnected'
  | 'grid-change'
  | 'cursor-move'
  | 'selection-change'
  | 'conflict-detected'
  | 'conflict-resolved'
  | 'session-created'
  | 'session-destroyed';

/**
 * WebSocket 이벤트 데이터
 */
export interface CollaborationEvent {
  type: CollaborationEventType;
  sessionId: string;
  userId: string;
  timestamp: number;
  data: any;
}

/**
 * 사용자 색상 관리
 */
export interface UserColorManager {
  assignColor(userId: string): string;
  releaseColor(userId: string): void;
  getUserColor(userId: string): string | null;
  getAvailableColors(): string[];
}