/// <reference types="jest" />
import request from "supertest";
import express from "express";
import performanceMonitoringRoutes from "../../routes/performanceMonitoring";
import { performanceMonitoringService } from "../../services/PerformanceMonitoringService";

// Mock the PerformanceMonitoringService
jest.mock("../../services/PerformanceMonitoringService");
jest.mock("../../utils/logger");

const mockPerformanceService = performanceMonitoringService as jest.Mocked<typeof performanceMonitoringService>;

const app = express();
app.use("/api/performance", performanceMonitoringRoutes);

describe("Performance Monitoring Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/performance/metrics", () => {
    it("Prometheus 메트릭을 반환해야 함", async () => {
      const mockMetrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/health",status_code="200"} 5
`;

      mockPerformanceService.getMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get("/api/performance/metrics");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("text/plain; charset=utf-8");
      expect(response.text).toBe(mockMetrics);
      expect(mockPerformanceService.getMetrics).toHaveBeenCalled();
    });

    it("메트릭 수집 에러 시 500을 반환해야 함", async () => {
      mockPerformanceService.getMetrics.mockRejectedValue(new Error("Metrics error"));

      const response = await request(app)
        .get("/api/performance/metrics");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });

  describe("GET /api/performance/health", () => {
    it("성능 모니터링 헬스체크를 반환해야 함", async () => {
      const response = await request(app)
        .get("/api/performance/health");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "OK",
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it("업타임이 0 이상이어야 함", async () => {
      const response = await request(app)
        .get("/api/performance/health");

      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it("타임스탬프가 유효한 ISO 형식이어야 함", async () => {
      const response = await request(app)
        .get("/api/performance/health");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe("GET /api/performance/summary", () => {
    it("메트릭 요약을 반환해야 함", async () => {
      const response = await request(app)
        .get("/api/performance/summary");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: "Metrics summary endpoint",
        timestamp: expect.any(String)
      });
    });

    it("타임스탬프가 유효한 ISO 형식이어야 함", async () => {
      const response = await request(app)
        .get("/api/performance/summary");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });
});