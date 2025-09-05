// MCP (Model Context Protocol) 관련 타입 정의

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
  handler: MCPToolHandler;
}

export type MCPToolHandler = (params: any) => Promise<MCPToolResult>;

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  version: string;
  capabilities: MCPCapability[];
  status: 'connected' | 'disconnected' | 'error';
  lastPing?: Date;
}

export interface MCPCapability {
  name: string;
  version: string;
  description?: string;
}

export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
  timestamp: Date;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: MCPError;
  timestamp: Date;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPSession {
  id: string;
  serverId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'idle' | 'closed';
}

export interface MCPIntegrationConfig {
  servers: MCPServerConfig[];
  timeout: number; // milliseconds
  retryAttempts: number;
  enableLogging: boolean;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  timeout?: number;
  enabled: boolean;
}