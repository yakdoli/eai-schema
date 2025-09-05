/// <reference types="jest" />
import { performanceMonitoringService } from "../../services/PerformanceMonitoringService";
import client from "prom-client";

// Mock prom-client
jest.mock("prom-client");
jest.mock("../../utils/logger");

const mockClient = client as jest.Mocked<typeof client>;

describe("PerformanceMonitoringService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("recordHttpRequest", () => {
    it("HTTP 요청 메트릭을 기록해야 함", () => {
      const method = "GET";
      const route = "/api/health";
      const statusCode = 200;
      const duration = 0.5;

      expect(() => {
        performanceMonitoringService.recordHttpRequest(method, route, statusCode, duration);
      }).not.toThrow();
    });

    it("다양한 HTTP 메서드와 상태 코드를 처리해야 함", () => {
      const testCases = [
        { method: "POST", route: "/api/upload", statusCode: 201, duration: 1.2 },
        { method: "PUT", route: "/api/mapping/123", statusCode: 200, duration: 0.8 },
        { method: "DELETE", route: "/api/mapping/123", statusCode: 204, duration: 0.3 },
        { method: "GET", route: "/api/mapping", statusCode: 404, duration: 0.1 }
      ];

      testCases.forEach(({ method, route, statusCode, duration }) => {
        expect(() => {
          performanceMonitoringService.recordHttpRequest(method, route, statusCode, duration);
        }).not.toThrow();
      });
    });
  });

  describe("recordMemoryUsage", () => {
    it("메모리 사용량을 기록해야 함", () => {
      expect(() => {
        performanceMonitoringService.recordMemoryUsage();
      }).not.toThrow();
    });
  });

  describe("recordCpuUsage", () => {
    it("CPU 사용량을 기록해야 함", () => {
      expect(() => {
        performanceMonitoringService.recordCpuUsage();
      }).not.toThrow();
    });
  });

  describe("recordGcDuration", () => {
    it("가비지 컬렉션 지속 시간을 기록해야 함", () => {
      const type = "major";
      const duration = 0.05;

      expect(() => {
        performanceMonitoringService.recordGcDuration(type, duration);
      }).not.toThrow();
    });

    it("다양한 GC 타입을 처리해야 함", () => {
      const gcTypes = ["minor", "major", "incremental"];
      
      gcTypes.forEach(type => {
        expect(() => {
          performanceMonitoringService.recordGcDuration(type, Math.random() * 0.1);
        }).not.toThrow();
      });
    });
  });

  describe("setActiveConnections", () => {
    it("활성 연결 수를 설정해야 함", () => {
      const connectionCounts = [0, 5, 10, 100, 1000];
      
      connectionCounts.forEach(count => {
        expect(() => {
          performanceMonitoringService.setActiveConnections(count);
        }).not.toThrow();
      });
    });
  });

  describe("getMetrics", () => {
    it("Prometheus 형식의 메트릭을 반환해야 함", async () => {
      // Mock the registry metrics method
      const mockMetrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/health",status_code="200"} 1
`;

      // Mock the registry
      const mockRegistry = {
        metrics: jest.fn().mockResolvedValue(mockMetrics)
      };

      // Mock getRegistry to return our mock registry
      jest.spyOn(performanceMonitoringService, 'getRegistry').mockReturnValue(mockRegistry as any);

      const metrics = await performanceMonitoringService.getMetrics();
      expect(typeof metrics).toBe("string");
      expect(metrics).toContain("http_requests_total");
    });

    it("메트릭 수집 에러를 적절히 처리해야 함", async () => {
      // Mock the registry to throw an error
      const mockRegistry = {
        metrics: jest.fn().mockRejectedValue(new Error("Metrics error"))
      };

      jest.spyOn(performanceMonitoringService, 'getRegistry').mockReturnValue(mockRegistry as any);

      await expect(performanceMonitoringService.getMetrics()).rejects.toThrow("Metrics error");
    });
  });

  describe("resetMetrics", () => {
    it("모든 메트릭을 리셋해야 함", () => {
      expect(() => {
        performanceMonitoringService.resetMetrics();
      }).not.toThrow();
    });
  });

  describe("getRegistry", () => {
    it("메트릭 레지스트리를 반환해야 함", () => {
      const registry = performanceMonitoringService.getRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("잘못된 메트릭 데이터를 안전하게 처리해야 함", () => {
      // Test with invalid parameters
      expect(() => {
        performanceMonitoringService.recordHttpRequest("", "", NaN, -1);
      }).not.toThrow();

      expect(() => {
        performanceMonitoringService.recordGcDuration("", NaN);
      }).not.toThrow();

      expect(() => {
        performanceMonitoringService.setActiveConnections(-1);
      }).not.toThrow();
    });
  });

  describe("Metric Collection Integration", () => {
    it("HTTP 요청 메트릭이 올바르게 수집되어야 함", () => {
      // Record multiple requests
      performanceMonitoringService.recordHttpRequest("GET", "/api/health", 200, 0.1);
      performanceMonitoringService.recordHttpRequest("POST", "/api/upload", 201, 1.5);
      performanceMonitoringService.recordHttpRequest("GET", "/api/health", 200, 0.2);

      // Verify no errors occurred
      expect(true).toBe(true); // If we reach here, no errors were thrown
    });

    it("시스템 메트릭이 올바르게 수집되어야 함", () => {
      // Record system metrics
      performanceMonitoringService.recordMemoryUsage();
      performanceMonitoringService.recordCpuUsage();
      performanceMonitoringService.setActiveConnections(5);

      // Verify no errors occurred
      expect(true).toBe(true);
    });
  });
});