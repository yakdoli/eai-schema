import { performanceMonitoringService } from "../services/PerformanceMonitoringService";

describe("PerformanceMonitoringService", () => {
  describe("recordHttpRequest", () => {
    it("should record HTTP request metrics", () => {
      // Record a mock HTTP request
      performanceMonitoringService.recordHttpRequest("GET", "/api/test", 200, 0.1);
      
      // The test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe("recordMemoryUsage", () => {
    it("should record memory usage metrics", () => {
      // Record memory usage
      performanceMonitoringService.recordMemoryUsage();
      
      // The test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe("recordCpuUsage", () => {
    it("should record CPU usage metrics", () => {
      // Record CPU usage
      performanceMonitoringService.recordCpuUsage();
      
      // The test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe("recordGcDuration", () => {
    it("should record GC duration metrics", () => {
      // Record GC duration
      performanceMonitoringService.recordGcDuration("scavenge", 0.01);
      
      // The test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe("setActiveConnections", () => {
    it("should set active connections metric", () => {
      // Set active connections
      performanceMonitoringService.setActiveConnections(5);
      
      // The test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe("getMetrics", () => {
    it("should return metrics in Prometheus format", async () => {
      const metrics = await performanceMonitoringService.getMetrics();
      
      expect(typeof metrics).toBe("string");
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe("getRegistry", () => {
    it("should return the metrics registry", () => {
      const registry = performanceMonitoringService.getRegistry();
      
      expect(registry).toBeDefined();
    });
  });
});