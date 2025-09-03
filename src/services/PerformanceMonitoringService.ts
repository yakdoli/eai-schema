import client from "prom-client";
import { logger } from "../utils/logger";

/**
 * PerformanceMonitoringService
 * Provides performance monitoring and metrics collection for the application
 */
class PerformanceMonitoringService {
  private register: client.Registry;
  private requestDurationHistogram: client.Histogram;
  private requestCounter: client.Counter;
  private memoryGauge: client.Gauge;
  private cpuGauge: client.Gauge;
  private gcDurationHistogram: client.Histogram;
  private activeConnectionsGauge: client.Gauge;

  constructor() {
    // Create a new registry
    this.register = new client.Registry();
    
    // Register default metrics
    client.collectDefaultMetrics({ register: this.register });

    // Create custom metrics
    this.requestDurationHistogram = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register]
    });

    this.requestCounter = new client.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.register]
    });

    this.memoryGauge = new client.Gauge({
      name: "process_memory_usage_bytes",
      help: "Process memory usage in bytes",
      labelNames: ["type"],
      registers: [this.register]
    });

    this.cpuGauge = new client.Gauge({
      name: "process_cpu_usage_percent",
      help: "Process CPU usage percentage",
      registers: [this.register]
    });

    this.gcDurationHistogram = new client.Histogram({
      name: "gc_duration_seconds",
      help: "Duration of garbage collection in seconds",
      labelNames: ["type"],
      buckets: [0.001, 0.01, 0.1, 1],
      registers: [this.register]
    });

    this.activeConnectionsGauge = new client.Gauge({
      name: "active_connections",
      help: "Number of active connections",
      registers: [this.register]
    });

    // Register the metrics
    this.register.registerMetric(this.requestDurationHistogram);
    this.register.registerMetric(this.requestCounter);
    this.register.registerMetric(this.memoryGauge);
    this.register.registerMetric(this.cpuGauge);
    this.register.registerMetric(this.gcDurationHistogram);
    this.register.registerMetric(this.activeConnectionsGauge);

    // Start collecting metrics
    this.startMetricCollection();
  }

  /**
   * Get the metrics registry
   * @returns The metrics registry
   */
  getRegistry(): client.Registry {
    return this.register;
  }

  /**
   * Record HTTP request metrics
   * @param method HTTP method
   * @param route Route path
   * @param statusCode HTTP status code
   * @param duration Request duration in seconds
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    try {
      this.requestDurationHistogram.labels(method, route, statusCode.toString()).observe(duration);
      this.requestCounter.labels(method, route, statusCode.toString()).inc();
    } catch (error) {
      logger.error("Error recording HTTP request metrics", { error });
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    try {
      const memoryUsage = process.memoryUsage();
      this.memoryGauge.labels("rss").set(memoryUsage.rss);
      this.memoryGauge.labels("heapTotal").set(memoryUsage.heapTotal);
      this.memoryGauge.labels("heapUsed").set(memoryUsage.heapUsed);
      this.memoryGauge.labels("external").set(memoryUsage.external);
    } catch (error) {
      logger.error("Error recording memory usage metrics", { error });
    }
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage(): void {
    try {
      const cpuUsage = process.cpuUsage();
      // Convert microseconds to percentage (approximate)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
      this.cpuGauge.set(cpuPercent);
    } catch (error) {
      logger.error("Error recording CPU usage metrics", { error });
    }
  }

  /**
   * Record garbage collection metrics
   * @param type GC type
   * @param duration GC duration in seconds
   */
  recordGcDuration(type: string, duration: number): void {
    try {
      this.gcDurationHistogram.labels(type).observe(duration);
    } catch (error) {
      logger.error("Error recording GC duration metrics", { error });
    }
  }

  /**
   * Set active connections count
   * @param count Number of active connections
   */
  setActiveConnections(count: number): void {
    try {
      this.activeConnectionsGauge.set(count);
    } catch (error) {
      logger.error("Error setting active connections metric", { error });
    }
  }

  /**
   * Start periodic metric collection
   */
  private startMetricCollection(): void {
    // Collect memory and CPU usage every 10 seconds
    setInterval(() => {
      this.recordMemoryUsage();
      this.recordCpuUsage();
    }, 10000);

    // Log metrics summary every minute
    setInterval(() => {
      this.logMetricsSummary();
    }, 60000);
  }

  /**
   * Log a summary of current metrics
   */
  private async logMetricsSummary(): Promise<void> {
    try {
      const metrics = await this.register.getMetricsAsJSON();
      
      // Extract key metrics
      const requestTotal = metrics.find(m => m.name === "http_requests_total");
      const memoryUsage = metrics.find(m => m.name === "process_memory_usage_bytes");
      
      logger.info("Metrics Summary", {
        totalRequests: requestTotal ? requestTotal.values.reduce((sum, v) => sum + v.value, 0) : 0,
        memoryUsage: memoryUsage ? `${(memoryUsage.values[0].value / 1024 / 1024).toFixed(2)} MB` : "Unknown"
      });
    } catch (error) {
      logger.error("Error logging metrics summary", { error });
    }
  }

  /**
   * Get metrics in Prometheus format
   * @returns Metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    try {
      return await this.register.metrics();
    } catch (error) {
      logger.error("Error getting metrics", { error });
      throw error;
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    try {
      this.register.resetMetrics();
    } catch (error) {
      logger.error("Error resetting metrics", { error });
    }
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();