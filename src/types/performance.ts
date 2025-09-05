// 성능 모니터링 관련 타입 정의

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface RequestMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number; // milliseconds
  memoryUsage: MemoryUsage;
  timestamp: Date;
  userAgent?: string;
  userId?: string;
}

export interface MemoryUsage {
  rss: number; // Resident Set Size
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface SystemMetrics {
  cpuUsage: number; // percentage
  memoryUsage: MemoryUsage;
  uptime: number; // seconds
  activeConnections: number;
  totalRequests: number;
  errorRate: number; // percentage
  averageResponseTime: number; // milliseconds
  timestamp: Date;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number; // milliseconds
  message?: string;
  details?: Record<string, any>;
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number; // requests per second
  };
  metrics: PerformanceMetric[];
  alerts: AlertEvent[];
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved?: Date;
  metadata?: Record<string, any>;
}